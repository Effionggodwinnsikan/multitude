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
  const member = await getOne('SELECT * FROM members WHERE id = $1', [id]);
  if (!member) return null;
  const attendance = await query('SELECT * FROM attendance WHERE member_id = $1 ORDER BY attendance_date DESC', [id]);
  const followups = await query('SELECT * FROM followups WHERE member_id = $1 ORDER BY created_at DESC', [id]);
  return { ...member, attendance, followups };
}

export async function searchMembers(search = '') {
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
