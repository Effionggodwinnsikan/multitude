import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { databaseUrl, isPostgres, postgresSsl, runStartupMigrations, validateDatabaseConfig } from './config.js';

dotenv.config();

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let sqliteDb;
let pgPool;

export async function initDb() {
  if (isPostgres) {
    validateDatabaseConfig();
    pgPool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: postgresSsl()
    });
    if (runStartupMigrations) await migrateDb();
    return;
  }

  const dataDir = path.join(apiRoot, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  sqliteDb = await open({
    filename: path.join(dataDir, 'demo.sqlite'),
    driver: sqlite3.Database
  });
  await sqliteDb.exec('PRAGMA foreign_keys = ON');
  if (runStartupMigrations) await migrateDb();
}

export async function migrateDb() {
  if (isPostgres) {
    await migratePostgres();
    return;
  }

  await migrateSqlite();
}

function normalizeSql(sql) {
  if (isPostgres) return sql;
  let index = 0;
  return sql.replace(/\$\d+/g, () => `?`).replace(/RETURNING \*/gi, '');
}

export async function query(sql, params = []) {
  if (isPostgres) {
    const result = await pgPool.query(sql, params);
    return result.rows;
  }

  const normalized = normalizeSql(sql);
  if (/^\s*select/i.test(normalized)) return sqliteDb.all(normalized, params);
  const result = await sqliteDb.run(normalized, params);
  if (/^\s*insert/i.test(normalized)) {
    return sqliteDb.all('SELECT * FROM ' + inferTableName(normalized) + ' WHERE rowid = ?', [result.lastID]);
  }
  return [];
}

export async function getOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

function inferTableName(sql) {
  const match = sql.match(/insert\s+into\s+([a-z_]+)/i);
  return match?.[1] || 'members';
}

async function migratePostgres() {
  await pgPool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    ${schema('postgres')}
  `);
  await pgPool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE');
  await pgPool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS archived_at TEXT');
  await pgPool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at TEXT');
  await pgPool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT \'Active\'');
  await pgPool.query('ALTER TABLE attendance ADD COLUMN IF NOT EXISTS capture_method TEXT DEFAULT \'Manual Entry\'');
  await pgPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT');
}

async function migrateSqlite() {
  await sqliteDb.exec(schema('sqlite'));
  await ensureSqliteColumn('members', 'archived', 'INTEGER DEFAULT 0');
  await ensureSqliteColumn('members', 'archived_at', 'TEXT');
  await ensureSqliteColumn('members', 'deleted_at', 'TEXT');
  await ensureSqliteColumn('members', 'membership_status', "TEXT DEFAULT 'Active'");
  await ensureSqliteColumn('attendance', 'capture_method', "TEXT DEFAULT 'Manual Entry'");
  await ensureSqliteColumn('users', 'profile_image_url', 'TEXT');
}

function schema(driver) {
  const id = driver === 'postgres' ? 'UUID PRIMARY KEY DEFAULT uuid_generate_v4()' : 'TEXT PRIMARY KEY';
  const serial = driver === 'postgres' ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const refId = driver === 'postgres' ? 'UUID' : 'TEXT';
  const json = driver === 'postgres' ? 'JSONB' : 'TEXT';
  const bool = driver === 'postgres' ? 'BOOLEAN DEFAULT FALSE' : 'INTEGER DEFAULT 0';
  const now = 'CURRENT_TIMESTAMP';

  return `
    CREATE TABLE IF NOT EXISTS church_settings (
      id TEXT PRIMARY KEY DEFAULT 'main',
      church_name TEXT NOT NULL,
      logo_url TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      brand_color TEXT DEFAULT '#1d4ed8',
      followup_day TEXT DEFAULT 'Sunday',
      followup_time TEXT DEFAULT '18:00',
      updated_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS roles (
      id ${id},
      name TEXT UNIQUE NOT NULL,
      permissions ${json} NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id ${id},
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      profile_image_url TEXT,
      role_id ${refId} REFERENCES roles(id),
      active ${bool},
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS branches (
      id ${id},
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS home_cells (
      id ${id},
      cell_name TEXT NOT NULL,
      area TEXT NOT NULL,
      leader_name TEXT,
      assistant_leader TEXT,
      meeting_address TEXT,
      meeting_day TEXT,
      meeting_time TEXT
    );

    CREATE TABLE IF NOT EXISTS members (
      id ${id},
      member_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT NOT NULL,
      gender TEXT,
      date_of_birth TEXT,
      marital_status TEXT,
      occupation TEXT,
      phone TEXT NOT NULL,
      alt_phone TEXT,
      whatsapp TEXT,
      email TEXT,
      photo_url TEXT,
      membership_category TEXT NOT NULL,
      date_first_attended TEXT,
      branch TEXT,
      invited_by TEXT,
      department TEXT,
      home_cell_id ${refId} REFERENCES home_cells(id),
      state TEXT,
      city TEXT,
      local_government TEXT,
      area TEXT,
      street_address TEXT,
      landmark TEXT,
      archived ${bool},
      archived_at TEXT,
      deleted_at TEXT,
      membership_status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id ${serial},
      member_id ${refId} REFERENCES members(id) ON DELETE CASCADE,
      attendance_date TEXT NOT NULL,
      service_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Present',
      capture_method TEXT DEFAULT 'Manual Entry',
      recorded_by TEXT,
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS followup_groups (
      id ${id},
      name TEXT NOT NULL,
      rule_area TEXT,
      leader_name TEXT,
      leader_phone TEXT
    );

    CREATE TABLE IF NOT EXISTS followups (
      id ${serial},
      member_id ${refId} REFERENCES members(id) ON DELETE CASCADE,
      group_id ${refId} REFERENCES followup_groups(id),
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      assigned_to TEXT,
      notes TEXT,
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS followup_feedback (
      id ${serial},
      followup_id TEXT,
      member_id ${refId} REFERENCES members(id) ON DELETE CASCADE,
      officer_email TEXT,
      contact_date TEXT NOT NULL,
      contact_method TEXT NOT NULL,
      feedback_category TEXT,
      notes TEXT,
      prayer_request TEXT,
      status TEXT NOT NULL,
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS member_notes (
      id ${serial},
      member_id ${refId} REFERENCES members(id) ON DELETE CASCADE,
      note_type TEXT NOT NULL,
      body TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id ${serial},
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      status TEXT DEFAULT 'Unread',
      channel TEXT DEFAULT 'In-App Notification',
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS celebrations (
      id ${serial},
      member_id ${refId} REFERENCES members(id) ON DELETE CASCADE,
      occasion_type TEXT NOT NULL,
      celebration_date TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'Pending',
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS anniversaries (
      id ${serial},
      member_id ${refId} REFERENCES members(id) ON DELETE CASCADE,
      occasion_type TEXT NOT NULL,
      occasion_date TEXT NOT NULL,
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS member_home_cells (
      id ${serial},
      member_id ${refId} REFERENCES members(id) ON DELETE CASCADE,
      home_cell_id ${refId} REFERENCES home_cells(id) ON DELETE CASCADE,
      transferred_by TEXT,
      reason TEXT,
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS deletion_history (
      id ${serial},
      member_id TEXT,
      member_name TEXT,
      reason TEXT NOT NULL,
      deleted_by TEXT,
      snapshot ${json},
      created_at TEXT DEFAULT ${now}
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id ${serial},
      user_email TEXT,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id TEXT,
      metadata ${json},
      created_at TEXT DEFAULT ${now}
    );
  `;
}

async function ensureSqliteColumn(table, column, definition) {
  const columns = await sqliteDb.all(`PRAGMA table_info(${table})`);
  if (!columns.some(item => item.name === column)) {
    await sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
