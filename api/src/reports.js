import { query } from './db.js';

export async function dashboardStats() {
  const rows = await query(`
    SELECT members.id, membership_category, members.created_at, home_cell_id,
      MAX(attendance.attendance_date) as last_attendance_date
    FROM members
    LEFT JOIN attendance ON attendance.member_id = members.id AND attendance.status = 'Present'
    GROUP BY members.id
  `);

  const today = new Date();
  const daysAgo = days => new Date(today.getTime() - days * 86400000);
  const isAfter = (value, date) => value && new Date(value) >= date;
  const absentDays = value => value ? Math.floor((today - new Date(value)) / 86400000) : 9999;

  return {
    totalMembers: rows.length,
    newMembers: rows.filter(row => isAfter(row.created_at, daysAgo(30))).length,
    firstTimers: rows.filter(row => row.membership_category === 'First Timer').length,
    visitors: rows.filter(row => row.membership_category === 'Visitor').length,
    returningMembers: rows.filter(row => row.membership_category === 'Returning Member').length,
    activeMembers: rows.filter(row => absentDays(row.last_attendance_date) <= 30).length,
    inactiveMembers: rows.filter(row => absentDays(row.last_attendance_date) > 30).length,
    absentLastSunday: rows.filter(row => absentDays(row.last_attendance_date) > 7).length,
    absent30: rows.filter(row => absentDays(row.last_attendance_date) >= 30).length,
    absent60: rows.filter(row => absentDays(row.last_attendance_date) >= 60).length,
    absent90: rows.filter(row => absentDays(row.last_attendance_date) >= 90).length,
    withoutHomeCell: rows.filter(row => !row.home_cell_id).length
  };
}

export async function followupReport() {
  const rows = await query(`
    SELECT members.*, MAX(attendance.attendance_date) as last_attendance_date, COUNT(attendance.id) as services_attended
    FROM members
    LEFT JOIN attendance ON attendance.member_id = members.id AND attendance.status = 'Present'
    GROUP BY members.id
  `);

  const now = new Date();
  const daysAbsent = date => date ? Math.floor((now - new Date(date)) / 86400000) : 9999;
  const enrich = (member, reason) => ({
    id: member.id,
    name: `${member.first_name} ${member.last_name}`,
    phone: member.phone,
    whatsapp: member.whatsapp,
    address: [member.street_address, member.area, member.city].filter(Boolean).join(', '),
    area: member.area,
    lastAttendanceDate: member.last_attendance_date,
    followupReason: reason,
    whatsappUrl: `https://wa.me/${cleanPhone(member.whatsapp || member.phone)}?text=${encodeURIComponent(`Hello ${member.first_name}, we missed you at church. We are praying for you and would love to hear from you.`)}`
  });

  return {
    newMembers: rows.filter(m => daysAbsent(m.created_at) <= 30).map(m => enrich(m, 'New member care')),
    missedLastSunday: rows.filter(m => daysAbsent(m.last_attendance_date) > 7).map(m => enrich(m, 'Missed last Sunday')),
    absent30: rows.filter(m => daysAbsent(m.last_attendance_date) >= 30).map(m => enrich(m, 'Absent for 30 days')),
    absent60: rows.filter(m => daysAbsent(m.last_attendance_date) >= 60).map(m => enrich(m, 'Absent for 60 days')),
    absent90: rows.filter(m => daysAbsent(m.last_attendance_date) >= 90).map(m => enrich(m, 'Absent for 90 days')),
    neverReturned: rows
      .filter(m => m.membership_category === 'First Timer' && Number(m.services_attended || 0) <= 1)
      .map(m => enrich(m, 'Never returned after first visit'))
  };
}

export async function locationReports() {
  return {
    byArea: await query('SELECT area, COUNT(*) as total FROM members GROUP BY area ORDER BY total DESC'),
    byState: await query('SELECT state, COUNT(*) as total FROM members GROUP BY state ORDER BY total DESC'),
    byCity: await query('SELECT city, COUNT(*) as total FROM members GROUP BY city ORDER BY total DESC')
  };
}

export async function attendanceReports() {
  return query(`
    SELECT service_type, substr(attendance_date, 1, 7) as period, COUNT(*) as total
    FROM attendance
    WHERE status = 'Present'
    GROUP BY service_type, period
    ORDER BY period DESC
  `);
}

function cleanPhone(phone = '') {
  return phone.replace(/[^\d]/g, '');
}
