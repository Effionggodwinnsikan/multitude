import { v4 as uuid } from 'uuid';
import { getOne, query } from './db.js';

export async function createMember(data) {
  const memberId = await nextMemberId();
  const id = uuid();
  await query(
    `INSERT INTO members (
      id, member_id, first_name, middle_name, last_name, gender, date_of_birth, marital_status,
      occupation, phone, alt_phone, whatsapp, email, photo_url, membership_category, date_first_attended,
      branch, invited_by, department, home_cell_id, state, city, local_government, area, street_address, landmark
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
    )`,
    [
      id,
      memberId,
      data.firstName,
      data.middleName || '',
      data.lastName,
      data.gender,
      data.dateOfBirth,
      data.maritalStatus,
      data.occupation,
      data.phone,
      data.altPhone,
      data.whatsapp,
      data.email,
      data.photoUrl,
      data.membershipCategory,
      data.dateFirstAttended,
      data.branch,
      data.invitedBy,
      data.department,
      data.homeCellId || null,
      data.state,
      data.city,
      data.localGovernment,
      data.area,
      data.streetAddress,
      data.landmark
    ]
  );
  return getMember(id);
}

export async function getMember(id) {
  const member = await getOne(`
    SELECT members.*, home_cells.cell_name, home_cells.meeting_day, home_cells.meeting_time, home_cells.leader_name
    FROM members LEFT JOIN home_cells ON home_cells.id = members.home_cell_id
    WHERE members.id = $1
  `, [id]);
  if (!member) return null;
  const attendance = await query('SELECT * FROM attendance WHERE member_id = $1 ORDER BY attendance_date DESC', [id]);
  const followups = await query('SELECT * FROM followups WHERE member_id = $1 ORDER BY created_at DESC', [id]);
  const feedback = await query('SELECT * FROM followup_feedback WHERE member_id = $1 ORDER BY created_at DESC', [id]);
  const notes = await query('SELECT * FROM member_notes WHERE member_id = $1 ORDER BY created_at DESC', [id]);
  const anniversaries = await query('SELECT * FROM anniversaries WHERE member_id = $1 ORDER BY occasion_date DESC', [id]);
  return { ...member, attendance, followups, feedback, notes, anniversaries };
}

export async function searchMembers(search = '', filters = {}) {
  const like = `%${search.toLowerCase()}%`;
  const rows = await query(
    `SELECT members.*, home_cells.cell_name,
       MAX(attendance.attendance_date) as last_attendance_date,
       COUNT(attendance.id) as attendance_count
     FROM members
     LEFT JOIN home_cells ON home_cells.id = members.home_cell_id
     LEFT JOIN attendance ON attendance.member_id = members.id AND attendance.status = 'Present'
     WHERE COALESCE(members.deleted_at, '') = ''
       AND (
        lower(first_name || ' ' || last_name) LIKE $1
        OR lower(phone) LIKE $1
        OR lower(COALESCE(whatsapp, '')) LIKE $1
        OR lower(COALESCE(members.area, '')) LIKE $1
        OR lower(COALESCE(home_cells.cell_name, '')) LIKE $1
        OR lower(COALESCE(membership_category, '')) LIKE $1
        OR lower(members.member_id) LIKE $1
       )
     GROUP BY members.id, home_cells.cell_name
     ORDER BY members.created_at DESC`,
    [like]
  );
  return rows.filter(member => {
    if (filters.category && member.membership_category !== filters.category) return false;
    if (filters.area && String(member.area || '').toLowerCase() !== String(filters.area).toLowerCase()) return false;
    if (filters.homeCell && String(member.cell_name || 'Unassigned').toLowerCase() !== String(filters.homeCell).toLowerCase()) return false;
    if (filters.status && attendanceStatus(member.last_attendance_date) !== filters.status) return false;
    if (filters.memberId && member.member_id !== filters.memberId) return false;
    return true;
  }).map(member => ({
    ...member,
    attendance_status: attendanceStatus(member.last_attendance_date),
    membership_status: member.archived ? 'Archived' : (member.membership_status || 'Active')
  }));
}

export async function updateMember(id, data) {
  await query(
    `UPDATE members SET first_name=$1, middle_name=$2, last_name=$3, gender=$4, date_of_birth=$5,
      marital_status=$6, occupation=$7, phone=$8, alt_phone=$9, whatsapp=$10, email=$11,
      photo_url=$12, membership_category=$13, branch=$14, department=$15, home_cell_id=$16, state=$17, city=$18,
      local_government=$19, area=$20, street_address=$21, landmark=$22, membership_status=$23
     WHERE id=$24`,
    [
      data.firstName, data.middleName || '', data.lastName, data.gender, data.dateOfBirth,
      data.maritalStatus, data.occupation, data.phone, data.altPhone, data.whatsapp, data.email,
      data.photoUrl, data.membershipCategory, data.branch, data.department, data.homeCellId || null, data.state,
      data.city, data.localGovernment, data.area, data.streetAddress, data.landmark,
      data.membershipStatus || 'Active', id
    ]
  );
  return getMember(id);
}

export async function archiveMember(id) {
  await query("UPDATE members SET archived = $1, archived_at = $2, membership_status = 'Archived' WHERE id = $3", [true, new Date().toISOString(), id]);
  return getMember(id);
}

export async function deleteMember(id, reason, deletedBy) {
  const member = await getMember(id);
  if (!member) return null;
  await query(
    'INSERT INTO deletion_history (member_id, member_name, reason, deleted_by, snapshot) VALUES ($1,$2,$3,$4,$5)',
    [member.member_id, `${member.first_name} ${member.last_name}`, reason, deletedBy, JSON.stringify(member)]
  );
  await query("UPDATE members SET deleted_at = $1, archived = $2, membership_status = 'Deleted' WHERE id = $3", [new Date().toISOString(), true, id]);
  return member;
}

export async function addMemberNote(id, noteType, body, createdBy) {
  await query(
    'INSERT INTO member_notes (member_id, note_type, body, created_by) VALUES ($1,$2,$3,$4)',
    [id, noteType, body, createdBy]
  );
  return getMember(id);
}

export async function transferMemberHomeCell(memberId, homeCellId, transferredBy, reason = '') {
  await query('UPDATE members SET home_cell_id = $1 WHERE id = $2', [homeCellId, memberId]);
  await query(
    'INSERT INTO member_home_cells (member_id, home_cell_id, transferred_by, reason) VALUES ($1,$2,$3,$4)',
    [memberId, homeCellId, transferredBy, reason]
  );
  return getMember(memberId);
}

function attendanceStatus(lastAttendanceDate) {
  if (!lastAttendanceDate) return 'Never Attended';
  const days = Math.floor((Date.now() - new Date(lastAttendanceDate).getTime()) / 86400000);
  if (days <= 7) return 'Present Recently';
  if (days < 30) return 'Absent Last Sunday';
  if (days < 60) return 'Absent 30 Days';
  if (days < 90) return 'Absent 60 Days';
  return 'Absent 90+ Days';
}

export async function legacySearchMembers(search = '') {
  const like = `%${search.toLowerCase()}%`;
  return query(
    `SELECT members.*, home_cells.cell_name
     FROM members LEFT JOIN home_cells ON home_cells.id = members.home_cell_id
     WHERE lower(first_name || ' ' || last_name) LIKE $1
        OR lower(phone) LIKE $1
        OR lower(COALESCE(whatsapp, '')) LIKE $1
        OR lower(COALESCE(members.area, '')) LIKE $1
        OR lower(member_id) LIKE $1
     ORDER BY members.created_at DESC`,
    [like]
  );
}

export async function attendanceSummary() {
  return query(`
    SELECT members.id, members.member_id, first_name, last_name, phone, whatsapp, area, street_address,
      MAX(attendance.attendance_date) as last_attendance_date,
      COUNT(attendance.id) as services_attended
    FROM members
    LEFT JOIN attendance ON attendance.member_id = members.id AND attendance.status = 'Present'
    GROUP BY members.id
    ORDER BY last_attendance_date DESC
  `);
}

async function nextMemberId() {
  const current = await getOne('SELECT COUNT(*) as count FROM members');
  return `MEM-${String(Number(current?.count || 0) + 1).padStart(5, '0')}`;
}
