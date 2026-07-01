import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getOne, query } from '../db.js';

export const manageablePermissions = [
  'settings:update',
  'members:read',
  'members:create',
  'attendance:read',
  'attendance:create',
  'followups:read',
  'homecells:read',
  'homecells:create',
  'reports:read',
  'audit:read'
];

export async function listRoles() {
  const roles = await query('SELECT id, name, permissions FROM roles ORDER BY name');
  return roles.map(role => ({ ...role, permissions: parsePermissions(role.permissions) }));
}

export async function createRole({ name, permissions = [] }) {
  const id = uuid();
  await query(
    'INSERT INTO roles (id, name, permissions) VALUES ($1, $2, $3)',
    [id, name, JSON.stringify(cleanPermissions(permissions))]
  );
  return getRole(id);
}

export async function updateRole(id, { name, permissions = [] }) {
  const existing = await getRole(id);
  if (!existing) return null;
  if (existing.name === 'Super Admin') throw new Error('Super Admin role cannot be changed');
  await query(
    'UPDATE roles SET name=$1, permissions=$2 WHERE id=$3',
    [name, JSON.stringify(cleanPermissions(permissions)), id]
  );
  return getRole(id);
}

export async function getRole(id) {
  const role = await getOne('SELECT id, name, permissions FROM roles WHERE id = $1', [id]);
  return role ? { ...role, permissions: parsePermissions(role.permissions) } : null;
}

export async function listUsers() {
  const users = await query(`
    SELECT users.id, users.full_name, users.email, users.profile_image_url, users.active, users.created_at,
      roles.id as role_id, roles.name as role_name
    FROM users
    LEFT JOIN roles ON roles.id = users.role_id
    ORDER BY users.created_at DESC
  `);
  return users.map(withProfileImage);
}

export async function createUser({ fullName, email, password, roleId, profileImageUrl = '', active = true }) {
  const role = await getRole(roleId);
  if (!role) throw new Error('Selected role does not exist');
  if (role.name === 'Super Admin') throw new Error('Create another Super Admin from the database console only');
  const existing = await getOne('SELECT id FROM users WHERE lower(email) = $1', [String(email).toLowerCase()]);
  if (existing) throw new Error('A user with this email already exists');
  const id = uuid();
  await query(
    'INSERT INTO users (id, full_name, email, password_hash, profile_image_url, role_id, active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [id, fullName, String(email).trim().toLowerCase(), await bcrypt.hash(password, 10), profileImageUrl || defaultProfileImage(fullName), roleId, Boolean(active)]
  );
  return getUser(id);
}

export async function updateUserRole(userId, roleId) {
  const role = await getRole(roleId);
  if (!role) throw new Error('Selected role does not exist');
  if (role.name === 'Super Admin') throw new Error('Super Admin role cannot be assigned here');
  await query('UPDATE users SET role_id=$1 WHERE id=$2', [roleId, userId]);
  return getUser(userId);
}

export async function updateUserStatus(userId, active) {
  await query('UPDATE users SET active=$1 WHERE id=$2', [Boolean(active), userId]);
  return getUser(userId);
}

export async function resetUserPassword(userId, password) {
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(password, 10), userId]);
  return getUser(userId);
}

export async function updateUserProfile(userId, { fullName, profileImageUrl }) {
  await query(
    'UPDATE users SET full_name=$1, profile_image_url=$2 WHERE id=$3',
    [fullName, profileImageUrl || defaultProfileImage(fullName), userId]
  );
  return getUser(userId);
}

export async function getUser(id) {
  const user = await getOne(`
    SELECT users.id, users.full_name, users.email, users.profile_image_url, users.active, users.created_at,
      roles.id as role_id, roles.name as role_name
    FROM users
    LEFT JOIN roles ON roles.id = users.role_id
    WHERE users.id = $1
  `, [id]);
  return user ? withProfileImage(user) : null;
}

function cleanPermissions(permissions) {
  return [...new Set(permissions)].filter(permission => manageablePermissions.includes(permission));
}

function parsePermissions(value) {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
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

function withProfileImage(user) {
  return { ...user, profile_image_url: user.profile_image_url || defaultProfileImage(user.full_name) };
}
