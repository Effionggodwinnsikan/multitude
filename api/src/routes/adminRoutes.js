import express from 'express';
import { audit, requireSuperAdmin } from '../auth.js';
import {
  createRole,
  createUser,
  listRoles,
  listUsers,
  manageablePermissions,
  resetUserPassword,
  updateRole,
  updateUserRole,
  updateUserStatus
} from '../services/userService.js';

export const adminRouter = express.Router();
const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

adminRouter.use(requireSuperAdmin);

adminRouter.get('/permissions', (_req, res) => {
  res.json(manageablePermissions);
});

adminRouter.get('/roles', wrap(async (_req, res) => {
  res.json(await listRoles());
}));

adminRouter.post('/roles', wrap(async (req, res) => {
  if (!req.body?.name) return res.status(400).json({ message: 'Role name is required' });
  const role = await createRole(req.body);
  await audit(req, 'created role', 'roles', role.id, { roleName: role.name });
  res.status(201).json(role);
}));

adminRouter.put('/roles/:id', wrap(async (req, res) => {
  const role = await updateRole(req.params.id, req.body);
  if (!role) return res.status(404).json({ message: 'Role not found' });
  await audit(req, 'updated role', 'roles', role.id, { roleName: role.name });
  res.json(role);
}));

adminRouter.get('/users', wrap(async (_req, res) => {
  res.json(await listUsers());
}));

adminRouter.post('/users', wrap(async (req, res) => {
  if (!req.body?.fullName || !req.body?.email || !req.body?.roleId) {
    return res.status(400).json({ message: 'Full name, email, and role are required' });
  }
  if (!req.body?.password || req.body.password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  const user = await createUser(req.body);
  await audit(req, 'created sub admin', 'users', user.id, { email: user.email, role: user.role_name });
  res.status(201).json(user);
}));

adminRouter.put('/users/:id/role', wrap(async (req, res) => {
  const user = await updateUserRole(req.params.id, req.body.roleId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await audit(req, 'assigned user role', 'users', user.id, { email: user.email, role: user.role_name });
  res.json(user);
}));

adminRouter.put('/users/:id/status', wrap(async (req, res) => {
  const user = await updateUserStatus(req.params.id, req.body.active);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await audit(req, 'updated user status', 'users', user.id, { email: user.email, active: user.active });
  res.json(user);
}));

adminRouter.put('/users/:id/password', wrap(async (req, res) => {
  if (!req.body?.password || req.body.password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  const user = await resetUserPassword(req.params.id, req.body.password);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await audit(req, 'reset user password', 'users', user.id, { email: user.email });
  res.json(user);
}));
