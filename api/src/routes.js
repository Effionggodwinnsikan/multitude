import express from 'express';
import { v4 as uuid } from 'uuid';
import { audit, login, requireAuth, requirePermission } from './auth.js';
import { query } from './db.js';
import { attendanceSummary, createMember, getMember, searchMembers } from './memberService.js';
import { attendanceReports, dashboardStats, followupReport, locationReports } from './reports.js';

export const router = express.Router();
const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/auth/login', login);

router.use(requireAuth);

router.get('/settings', wrap(async (_req, res) => {
  const rows = await query('SELECT * FROM church_settings WHERE id = $1', ['main']);
  res.json(rows[0]);
}));

router.put('/settings', requirePermission('settings:update'), wrap(async (req, res) => {
  const s = req.body;
  await query(
    `UPDATE church_settings SET church_name=$1, logo_url=$2, address=$3, email=$4, phone=$5,
      brand_color=$6, followup_day=$7, followup_time=$8 WHERE id='main'`,
    [s.churchName, s.logoUrl, s.address, s.email, s.phone, s.brandColor, s.followupDay, s.followupTime]
  );
  await audit(req, 'updated settings', 'church_settings', 'main', s);
  res.json({ ok: true });
}));

router.get('/dashboard', wrap(async (_req, res) => {
  const stats = await dashboardStats();
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const homeCells = await query('SELECT COUNT(*) as total FROM home_cells');
  const attendanceWeek = await query(
    "SELECT COUNT(*) as total FROM attendance WHERE attendance_date >= $1 AND status = 'Present'",
    [weekStart]
  );
  res.json({ ...stats, homeCells: Number(homeCells[0]?.total || 0), attendanceThisWeek: Number(attendanceWeek[0]?.total || 0) });
}));

router.get('/members', requirePermission('members:read'), wrap(async (req, res) => {
  res.json(await searchMembers(req.query.search || ''));
}));

router.post('/members', requirePermission('members:create'), wrap(async (req, res) => {
  const member = await createMember(req.body);
  await audit(req, 'created member', 'members', member.id, { memberId: member.member_id });
  res.status(201).json(member);
}));

router.get('/members/:id', requirePermission('members:read'), wrap(async (req, res) => {
  const member = await getMember(req.params.id);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json(member);
}));

router.post('/attendance', requirePermission('attendance:create'), wrap(async (req, res) => {
  const rows = Array.isArray(req.body.entries) ? req.body.entries : [req.body];
  for (const row of rows) {
    await query(
      'INSERT INTO attendance (member_id, attendance_date, service_type, status, recorded_by) VALUES ($1, $2, $3, $4, $5)',
      [row.memberId, row.attendanceDate, row.serviceType, row.status || 'Present', req.user.email]
    );
  }
  await audit(req, 'recorded attendance', 'attendance', 'bulk', { count: rows.length });
  res.status(201).json({ ok: true, count: rows.length });
}));

router.get('/attendance/summary', requirePermission('attendance:read'), wrap(async (_req, res) => {
  res.json(await attendanceSummary());
}));

router.get('/home-cells', requirePermission('homecells:read'), wrap(async (_req, res) => {
  res.json(await query(`
    SELECT home_cells.*, COUNT(members.id) as members_count
    FROM home_cells LEFT JOIN members ON members.home_cell_id = home_cells.id
    GROUP BY home_cells.id ORDER BY area
  `));
}));

router.post('/home-cells', requirePermission('homecells:create'), wrap(async (req, res) => {
  const c = req.body;
  const id = uuid();
  await query(
    'INSERT INTO home_cells (id, cell_name, area, leader_name, assistant_leader, meeting_address, meeting_day, meeting_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, c.cellName, c.area, c.leaderName, c.assistantLeader, c.meetingAddress, c.meetingDay, c.meetingTime]
  );
  await audit(req, 'created home cell', 'home_cells', id, c);
  res.status(201).json({ id, ...c });
}));

router.get('/home-cells/suggestions', requirePermission('homecells:read'), wrap(async (_req, res) => {
  res.json(await query(`
    SELECT members.area, COUNT(*) as members_without_cell
    FROM members
    WHERE home_cell_id IS NULL
    GROUP BY members.area
    ORDER BY members_without_cell DESC
  `));
}));

router.get('/followups/report', requirePermission('followups:read'), wrap(async (_req, res) => {
  res.json(await followupReport());
}));

router.get('/followup-groups', requirePermission('followups:read'), wrap(async (_req, res) => {
  res.json(await query('SELECT * FROM followup_groups ORDER BY name'));
}));

router.get('/reports/attendance', requirePermission('reports:read'), wrap(async (_req, res) => {
  res.json(await attendanceReports());
}));

router.get('/reports/location', requirePermission('reports:read'), wrap(async (_req, res) => {
  res.json(await locationReports());
}));

router.get('/audit-logs', requirePermission('audit:read'), wrap(async (_req, res) => {
  res.json(await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100'));
}));
