import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getOne, initDb, query } from './db.js';

const permissions = {
  'Super Admin': ['*'],
  Pastor: ['members:read', 'attendance:read', 'followups:read', 'homecells:read', 'reports:read'],
  'Church Administrator': ['settings:update', 'members:read', 'members:create', 'attendance:read', 'attendance:create', 'followups:read', 'homecells:read', 'homecells:create', 'reports:read'],
  'Follow-up Team Leader': ['members:read', 'followups:read', 'attendance:read'],
  'Home Cell Leader': ['members:read', 'homecells:read', 'attendance:create', 'attendance:read'],
  'Data Entry Officer': ['members:read', 'members:create', 'attendance:create']
};

export async function seedIfEmpty() {
  const settings = await getOne('SELECT * FROM church_settings WHERE id = $1', ['main']);
  if (!settings) {
    await query(
      `INSERT INTO church_settings (id, church_name, logo_url, address, email, phone, brand_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['main', 'Grace City Church', '', '24 Covenant Avenue, Lagos', 'hello@gracecity.test', '+234 800 000 0000', '#2563eb']
    );
  }

  for (const [name, rolePermissions] of Object.entries(permissions)) {
    const exists = await getOne('SELECT id FROM roles WHERE name = $1', [name]);
    if (!exists) {
      await query('INSERT INTO roles (id, name, permissions) VALUES ($1, $2, $3)', [uuid(), name, JSON.stringify(rolePermissions)]);
    }
  }

  const admin = await getOne('SELECT id FROM users WHERE email = $1', ['admin@gracecity.test']);
  if (!admin) {
    const role = await getOne('SELECT id FROM roles WHERE name = $1', ['Super Admin']);
    await query(
      'INSERT INTO users (id, full_name, email, password_hash, role_id, active) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuid(), 'Super Admin', 'admin@gracecity.test', await bcrypt.hash('password123', 10), role.id, true]
    );
  }

  const memberCount = await getOne('SELECT COUNT(*) as count FROM members');
  if (Number(memberCount?.count || 0) > 0) return;

  const cells = [
    ['Covenant Cell', 'Ikeja', 'Mrs Ada Okafor', 'Plot 12 Unity Close', 'Wednesday', '18:00'],
    ['Harvest Cell', 'Yaba', 'Mr David Bello', '8 Chapel Street', 'Friday', '19:00'],
    ['Mercy Cell', 'Lekki', 'Pastor Ruth James', '15 Admiralty Way', 'Thursday', '18:30']
  ];
  const cellIds = {};
  for (const [cellName, area, leader, address, day, time] of cells) {
    const id = uuid();
    cellIds[area] = id;
    await query(
      'INSERT INTO home_cells (id, cell_name, area, leader_name, meeting_address, meeting_day, meeting_time) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, cellName, area, leader, address, day, time]
    );
  }

  const members = [
    ['MEM-00001', 'Chinedu', 'Nwosu', 'Male', 'Worker', 'Ikeja', cellIds.Ikeja, -5],
    ['MEM-00002', 'Amina', 'Lawal', 'Female', 'First Timer', 'Yaba', null, -2],
    ['MEM-00003', 'Tolu', 'Adeyemi', 'Female', 'Visitor', 'Lekki', cellIds.Lekki, -40],
    ['MEM-00004', 'Samuel', 'Etim', 'Male', 'Full Member', 'Ikeja', cellIds.Ikeja, -75],
    ['MEM-00005', 'Blessing', 'Uche', 'Female', 'Returning Member', 'Ajah', null, -100],
    ['MEM-00006', 'Daniel', 'Okoro', 'Male', 'Minister', 'Yaba', cellIds.Yaba, -9]
  ];

  for (const [memberId, first, last, gender, category, area, cellId, lastSeenOffset] of members) {
    const id = uuid();
    await query(
      `INSERT INTO members (id, member_id, first_name, last_name, gender, marital_status, occupation, phone, whatsapp,
        email, membership_category, date_first_attended, branch, department, home_cell_id, state, city, local_government,
        area, street_address, landmark)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
      [
        id, memberId, first, last, gender, 'Single', 'Professional', `+23480${Math.floor(Math.random() * 100000000)}`,
        `+23481${Math.floor(Math.random() * 100000000)}`, `${first.toLowerCase()}@example.com`, category,
        dateOffset(lastSeenOffset - 21), 'Main Branch', 'Protocol', cellId, 'Lagos', 'Lagos', 'Lagos Mainland',
        area, `${Math.floor(Math.random() * 50) + 1} ${area} Road`, 'Near community hall'
      ]
    );
    await query(
      'INSERT INTO attendance (member_id, attendance_date, service_type, status, recorded_by) VALUES ($1,$2,$3,$4,$5)',
      [id, dateOffset(lastSeenOffset), 'Sunday Service', 'Present', 'seed']
    );
  }

  await query(
    'INSERT INTO followup_groups (id, name, rule_area, leader_name, leader_phone) VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)',
    [uuid(), 'Follow-up Team A', 'Ikeja', 'Sister Mary', '+2348011111111', uuid(), 'Follow-up Team B', 'Yaba', 'Brother John', '+2348022222222']
  );
}

function dateOffset(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

if (process.argv[1]?.endsWith('seed.js')) {
  await initDb();
  await seedIfEmpty();
  console.log('Seed complete');
}
