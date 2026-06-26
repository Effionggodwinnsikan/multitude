import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOne, query } from './db.js';

const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await getOne(
    `SELECT users.*, roles.name as role_name, roles.permissions
     FROM users LEFT JOIN roles ON roles.id = users.role_id
     WHERE users.email = $1`,
    [email]
  );

  if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role_name, permissions: parsePermissions(user.permissions) },
    jwtSecret,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role_name,
      permissions: parsePermissions(user.permissions)
    }
  });
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (req.user?.permissions?.includes('*') || req.user?.permissions?.includes(permission)) return next();
    res.status(403).json({ message: 'Permission denied' });
  };
}

export function requireSuperAdmin(req, res, next) {
  if (req.user?.role === 'Super Admin' || req.user?.permissions?.includes('*')) return next();
  res.status(403).json({ message: 'Super Admin access required' });
}

export async function audit(req, action, entity, entityId, metadata = {}) {
  await query(
    'INSERT INTO audit_logs (user_email, action, entity, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
    [req.user?.email || 'system', action, entity, entityId, JSON.stringify(metadata)]
  );
}

function parsePermissions(value) {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
}
