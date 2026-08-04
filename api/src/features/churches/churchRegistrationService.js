import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { getOne, query } from '../../db.js';

const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';
const superAdminPermissions = ['*'];

export async function registerChurchAccount(payload = {}) {
  const churchName = clean(payload.churchName);
  const address = clean(payload.address);
  const logoUrl = clean(payload.logoUrl);
  const brandColor = clean(payload.brandColor) || '#2563eb';
  const phone = clean(payload.phone);
  const email = clean(payload.email).toLowerCase();
  const adminName = clean(payload.adminName);
  const adminEmail = clean(payload.adminEmail).toLowerCase();
  const password = String(payload.password || '');

  if (!churchName || !address || !adminName || !adminEmail || !password) {
    const error = new Error('Church name, address, admin name, admin email, and password are required');
    error.status = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  const existingUser = await getOne('SELECT id FROM users WHERE lower(email) = $1', [adminEmail]);
  if (existingUser) {
    const error = new Error('A user with this admin email already exists');
    error.status = 409;
    throw error;
  }

  const role = await ensureSuperAdminRole();
  await upsertChurchSettings({ churchName, logoUrl, address, email, phone, brandColor });

  const userId = uuid();
  await query(
    'INSERT INTO users (id, full_name, email, password_hash, profile_image_url, role_id, active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [userId, adminName, adminEmail, await bcrypt.hash(password, 10), defaultProfileImage(adminName), role.id, true]
  );

  await query(
    'INSERT INTO audit_logs (user_email, action, entity, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
    [adminEmail, 'registered church account', 'church_settings', 'main', JSON.stringify({ churchName, address, email, phone })]
  );

  const user = {
    id: userId,
    fullName: adminName,
    email: adminEmail,
    role: 'Super Admin',
    profileImageUrl: defaultProfileImage(adminName),
    permissions: superAdminPermissions
  };

  return {
    token: jwt.sign({ id: user.id, email: user.email, role: user.role, permissions: user.permissions }, jwtSecret, { expiresIn: '12h' }),
    user,
    church: { churchName, logoUrl, address, email, phone, brandColor }
  };
}

async function ensureSuperAdminRole() {
  const existing = await getOne('SELECT id, permissions FROM roles WHERE name = $1', ['Super Admin']);
  if (existing) return existing;

  const id = uuid();
  await query('INSERT INTO roles (id, name, permissions) VALUES ($1, $2, $3)', [id, 'Super Admin', JSON.stringify(superAdminPermissions)]);
  return { id, permissions: JSON.stringify(superAdminPermissions) };
}

async function upsertChurchSettings(settings) {
  const existing = await getOne('SELECT id FROM church_settings WHERE id = $1', ['main']);
  if (existing) {
    await query(
      `UPDATE church_settings SET church_name=$1, logo_url=$2, address=$3, email=$4, phone=$5,
        brand_color=$6, followup_day=$7, followup_time=$8 WHERE id='main'`,
      [settings.churchName, settings.logoUrl, settings.address, settings.email, settings.phone, settings.brandColor, 'Sunday', '18:00']
    );
    return;
  }

  await query(
    `INSERT INTO church_settings (id, church_name, logo_url, address, email, phone, brand_color)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    ['main', settings.churchName, settings.logoUrl, settings.address, settings.email, settings.phone, settings.brandColor]
  );
}

function clean(value) {
  return String(value || '').trim();
}

function defaultProfileImage(name = 'User') {
  const initials = String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=2563eb&color=fff&size=128&bold=true`;
}
