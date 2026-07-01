import express from 'express';
import { v4 as uuid } from 'uuid';
import { audit, login, requireAuth, requirePermission } from './auth.js';
import { query } from './db.js';
import { adminRouter } from './routes/adminRoutes.js';
import {
  addMemberNote,
  archiveMember,
  createMember,
  deleteMember,
  getMember,
  searchMembers,
  transferMemberHomeCell,
  updateMember,
  attendanceSummary
} from './memberService.js';
import { getUser, updateUserProfile } from './services/userService.js';
import {
  attendanceDashboard,
  attendanceReports,
  buildExport,
  celebrationOccasionTypes,
  celebrationRows,
  dashboardStats,
  dashboardWidgetMembers,
  followupDashboard,
  followupReport,
  graphReports,
  locationReports
} from './reports.js';

export const router = express.Router();
const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/auth/login', login);

router.use(requireAuth);
router.use('/admin', adminRouter);

router.get('/profile', wrap(async (req, res) => {
  const user = await getUser(req.user.id);
  if (!user) return res.status(404).json({ message: 'User profile not found' });
  res.json(profileResponse(user, req.user.permissions));
}));

router.put('/profile', wrap(async (req, res) => {
  if (!req.body?.fullName) return res.status(400).json({ message: 'Full name is required' });
  const user = await updateUserProfile(req.user.id, req.body);
  await audit(req, 'updated profile', 'users', req.user.id, { email: user.email });
  res.json(profileResponse(user, req.user.permissions));
}));

router.get('/settings', wrap(async (_req, res) => {
  const rows = await query('SELECT * FROM church_settings WHERE id = $1', ['main']);
  res.json(rows[0]);
}));

router.put('/settings', requirePermission('settings:update'), wrap(async (req, res) => {
  const s = req.body;
  if (!s?.churchName?.trim()) return res.status(400).json({ message: 'Church name is required' });
  await query(
    `UPDATE church_settings SET church_name=$1, logo_url=$2, address=$3, email=$4, phone=$5,
      brand_color=$6, followup_day=$7, followup_time=$8 WHERE id='main'`,
    [
      s.churchName.trim(),
      s.logoUrl || '',
      s.address || '',
      s.email || '',
      s.phone || '',
      s.brandColor || '#2563eb',
      s.followupDay || 'Sunday',
      s.followupTime || '18:00'
    ]
  );
  await audit(req, 'updated settings', 'church_settings', 'main', s);
  const rows = await query('SELECT * FROM church_settings WHERE id = $1', ['main']);
  res.json(rows[0]);
}));

router.get('/dashboard', wrap(async (req, res) => {
  const stats = await dashboardStats(req.query);
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const homeCells = await query('SELECT COUNT(*) as total FROM home_cells');
  const attendanceWeek = await query(
    "SELECT COUNT(*) as total FROM attendance WHERE attendance_date >= $1 AND status = 'Present'",
    [weekStart]
  );
  res.json({ ...stats, homeCells: Number(homeCells[0]?.total || 0), attendanceThisWeek: Number(attendanceWeek[0]?.total || 0) });
}));

router.get('/dashboard/widgets/:widget', requirePermission('members:read'), wrap(async (req, res) => {
  res.json(await dashboardWidgetMembers(req.params.widget));
}));

router.get('/dashboard/graphs', requirePermission('reports:read'), wrap(async (_req, res) => {
  res.json(await graphReports());
}));

router.get('/members', requirePermission('members:read'), wrap(async (req, res) => {
  res.json(await searchMembers(req.query.search || '', req.query));
}));

router.post('/members', requirePermission('members:create'), wrap(async (req, res) => {
  if (!req.body?.firstName || !req.body?.lastName || !req.body?.phone || !req.body?.membershipCategory) {
    return res.status(400).json({ message: 'First name, last name, phone number, and membership category are required' });
  }
  const member = await createMember(req.body);
  await audit(req, 'created member', 'members', member.id, { memberId: member.member_id });
  res.status(201).json(member);
}));

router.get('/members/:id', requirePermission('members:read'), wrap(async (req, res) => {
  const member = await getMember(req.params.id);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json(member);
}));

router.put('/members/:id', requirePermission('members:create'), wrap(async (req, res) => {
  if (!req.body?.firstName || !req.body?.lastName || !req.body?.phone || !req.body?.membershipCategory) {
    return res.status(400).json({ message: 'First name, last name, phone number, and membership category are required' });
  }
  const member = await updateMember(req.params.id, req.body);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  await audit(req, 'updated member', 'members', req.params.id, { memberId: member?.member_id });
  res.json(member);
}));

router.post('/members/:id/archive', requirePermission('members:create'), wrap(async (req, res) => {
  const member = await archiveMember(req.params.id);
  await audit(req, 'archived member', 'members', req.params.id, { memberId: member?.member_id });
  res.json(member);
}));

router.delete('/members/:id', requirePermission('members:create'), wrap(async (req, res) => {
  if (!req.body?.reason) return res.status(400).json({ message: 'Deletion reason is required' });
  const member = await deleteMember(req.params.id, req.body.reason, req.user.email);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  await audit(req, 'deleted member', 'members', req.params.id, { reason: req.body.reason, memberId: member.member_id });
  res.json({ ok: true });
}));

router.post('/members/:id/notes', requirePermission('members:create'), wrap(async (req, res) => {
  if (!req.body?.body) return res.status(400).json({ message: 'Note details are required' });
  const member = await addMemberNote(req.params.id, req.body.noteType || 'Note', req.body.body, req.user.email);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  await audit(req, 'added member note', 'members', req.params.id, { noteType: req.body.noteType });
  res.status(201).json(member);
}));

router.post('/members/:id/home-cell', requirePermission('homecells:create'), wrap(async (req, res) => {
  if (!req.body?.homeCellId) return res.status(400).json({ message: 'Home cell is required' });
  const member = await transferMemberHomeCell(req.params.id, req.body.homeCellId, req.user.email, req.body.reason);
  if (!member) return res.status(404).json({ message: 'Member not found' });
  await audit(req, 'transferred member home cell', 'members', req.params.id, { homeCellId: req.body.homeCellId });
  res.json(member);
}));

router.post('/attendance', requirePermission('attendance:create'), wrap(async (req, res) => {
  const rows = Array.isArray(req.body.entries) ? req.body.entries : [req.body];
  if (!rows.length) return res.status(400).json({ message: 'At least one attendance entry is required' });
  for (const row of rows) {
    if (!row.memberId || !row.attendanceDate || !row.serviceType) {
      return res.status(400).json({ message: 'Member, attendance date, and service type are required for every attendance entry' });
    }
    await query(
      'INSERT INTO attendance (member_id, attendance_date, service_type, status, capture_method, recorded_by) VALUES ($1, $2, $3, $4, $5, $6)',
      [row.memberId, row.attendanceDate, row.serviceType, row.status || 'Present', row.method || row.captureMethod || 'Manual Entry', req.user.email]
    );
  }
  await audit(req, 'recorded attendance', 'attendance', 'bulk', { count: rows.length });
  res.status(201).json({ ok: true, count: rows.length });
}));

router.get('/attendance/summary', requirePermission('attendance:read'), wrap(async (_req, res) => {
  res.json(await attendanceSummary());
}));

router.get('/attendance/dashboard', requirePermission('attendance:read'), wrap(async (_req, res) => {
  res.json(await attendanceDashboard());
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
  if (!c?.cellName || !c?.area) return res.status(400).json({ message: 'Cell name and area are required' });
  const id = uuid();
  await query(
    'INSERT INTO home_cells (id, cell_name, area, leader_name, assistant_leader, meeting_address, meeting_day, meeting_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [id, c.cellName, c.area, c.leaderName, c.assistantLeader, c.meetingAddress, c.meetingDay, c.meetingTime]
  );
  await audit(req, 'created home cell', 'home_cells', id, c);
  res.status(201).json({ id, ...c });
}));

router.put('/home-cells/:id', requirePermission('homecells:create'), wrap(async (req, res) => {
  const c = req.body;
  if (!c?.cellName || !c?.area) return res.status(400).json({ message: 'Cell name and area are required' });
  await query(
    `UPDATE home_cells SET cell_name=$1, area=$2, leader_name=$3, assistant_leader=$4,
      meeting_address=$5, meeting_day=$6, meeting_time=$7 WHERE id=$8`,
    [c.cellName, c.area, c.leaderName, c.assistantLeader, c.meetingAddress, c.meetingDay, c.meetingTime, req.params.id]
  );
  await audit(req, 'updated home cell', 'home_cells', req.params.id, c);
  res.json({ ok: true });
}));

router.delete('/home-cells/:id', requirePermission('homecells:create'), wrap(async (req, res) => {
  await query('UPDATE members SET home_cell_id = NULL WHERE home_cell_id = $1', [req.params.id]);
  await query('DELETE FROM home_cells WHERE id = $1', [req.params.id]);
  await audit(req, 'deleted home cell', 'home_cells', req.params.id, {});
  res.json({ ok: true });
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

router.get('/followups/dashboard', requirePermission('followups:read'), wrap(async (_req, res) => {
  res.json(await followupDashboard());
}));

router.post('/followups/feedback', requirePermission('followups:read'), wrap(async (req, res) => {
  const f = req.body;
  if (!f?.memberId || !f?.contactDate || !f?.contactMethod || !f?.status) {
    return res.status(400).json({ message: 'Member, contact date, contact method, and status are required' });
  }
  await query(
    `INSERT INTO followup_feedback (followup_id, member_id, officer_email, contact_date, contact_method,
      feedback_category, notes, prayer_request, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [f.followupId || null, f.memberId, req.user.email, f.contactDate, f.contactMethod, f.feedbackCategory, f.notes, f.prayerRequest, f.status]
  );
  if (f.followupId) await query('UPDATE followups SET status=$1, notes=$2, completed_at=$3 WHERE id=$4', [f.status, f.notes, new Date().toISOString(), f.followupId]);
  await query(
    'INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
    ['Follow-Up', 'New follow-up feedback submitted', `${req.user.email} submitted ${f.status} feedback.`, 'member', f.memberId]
  );
  await audit(req, 'submitted followup feedback', 'followup_feedback', f.memberId, { status: f.status });
  res.status(201).json({ ok: true });
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

router.post('/reports/export', requirePermission('reports:read'), wrap(async (req, res) => {
  const { format = 'csv', scope = 'entire_report', selectedIds = [] } = req.body;
  let rows = [];
  if (scope === 'selected_members') {
    const all = await searchMembers('');
    rows = selectedIds.length ? all.filter(row => selectedIds.includes(row.id)) : all;
  } else if (scope === 'selected_attendance') {
    rows = await attendanceSummary();
  } else {
    const stats = await dashboardStats();
    rows = Object.entries(stats).map(([metric, value]) => ({ metric, value }));
  }
  res.json(buildExport(format, scope, rows));
}));

router.get('/celebrations', requirePermission('members:read'), wrap(async (req, res) => {
  const days = Number(req.query.days || 30);
  const occasionType = req.query.occasionType || 'All Occasions';
  const rows = await celebrationRows(days, occasionType);
  const allRows = await celebrationRows(days, 'All Occasions');
  const occasionTypes = celebrationOccasionTypes();
  res.json({
    occasionType,
    occasionTypes,
    counts: occasionTypes.reduce((acc, type) => {
      acc[type] = type === 'All Occasions' ? allRows.length : allRows.filter(row => row.occasionType === type).length;
      return acc;
    }, {}),
    today: rows.filter(row => row.daysUntil === 0),
    upcoming7: rows.filter(row => row.daysUntil <= 7),
    upcoming30: rows,
    thisMonth: rows.filter(row => new Date(row.celebrationDate).getMonth() === new Date().getMonth())
  });
}));

router.post('/celebrations/notify', requirePermission('members:read'), wrap(async (req, res) => {
  const days = Number(req.body?.days || 30);
  const occasionType = req.body?.occasionType || 'All Occasions';
  const rows = await celebrationRows(days, occasionType);
  for (const item of rows) {
    await query(
      'INSERT INTO notifications (type, title, message, entity_type, entity_id, channel) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        item.occasionType,
        `${item.occasionType} reminder`,
        `${item.memberName} has ${item.occasionType.toLowerCase()} on ${item.celebrationDate}. Message: ${item.specialMessage}`,
        'member',
        item.id,
        req.body?.channel || 'In-App Notification'
      ]
    );
  }
  await audit(req, 'generated celebration notifications', 'celebrations', occasionType, { count: rows.length, days });
  res.json({ ok: true, count: rows.length });
}));

router.get('/notifications', requirePermission('members:read'), wrap(async (req, res) => {
  const search = `%${String(req.query.search || '').toLowerCase()}%`;
  res.json(await query(`
    SELECT * FROM notifications
    WHERE lower(title || ' ' || message || ' ' || type || ' ' || COALESCE(status, '')) LIKE $1
    ORDER BY created_at DESC
    LIMIT 200
  `, [search]));
}));

router.post('/notifications/generate', requirePermission('members:read'), wrap(async (req, res) => {
  const celebrations = await celebrationRows(7, req.body?.occasionType || 'All Occasions');
  for (const item of celebrations) {
    await query(
      'INSERT INTO notifications (type, title, message, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
      [item.occasionType, `Upcoming ${item.occasionType.toLowerCase()}`, `${item.memberName} has ${item.occasionType.toLowerCase()} on ${item.celebrationDate}.`, 'member', item.id]
    );
  }
  res.json({ ok: true, count: celebrations.length });
}));

router.get('/audit-logs', requirePermission('audit:read'), wrap(async (_req, res) => {
  res.json(await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100'));
}));

function profileResponse(user, permissions = []) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role_name,
    profileImageUrl: user.profile_image_url,
    permissions
  };
}
