import { query } from './db.js';

export function dateRangeForFilter(filter = {}) {
  const now = new Date();
  const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const addDays = (date, days) => new Date(date.getTime() + days * 86400000);
  const startOfWeek = date => {
    const copy = startOfDay(date);
    const day = copy.getDay();
    copy.setDate(copy.getDate() - day);
    return copy;
  };
  const ymd = date => date.toISOString().slice(0, 10);
  const type = filter.type || 'this_month';

  let start;
  let end;
  if (type === 'today') {
    start = startOfDay(now);
    end = addDays(start, 1);
  } else if (type === 'yesterday') {
    end = startOfDay(now);
    start = addDays(end, -1);
  } else if (type === 'this_week') {
    start = startOfWeek(now);
    end = addDays(start, 7);
  } else if (type === 'last_week') {
    end = startOfWeek(now);
    start = addDays(end, -7);
  } else if (type === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (type === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (type === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear() + 1, 0, 1);
  } else if (type === 'custom_date' && filter.date) {
    start = startOfDay(new Date(filter.date));
    end = addDays(start, 1);
  } else if (type === 'custom_range' && filter.startDate && filter.endDate) {
    start = startOfDay(new Date(filter.startDate));
    end = addDays(startOfDay(new Date(filter.endDate)), 1);
  } else if (type === 'custom_month' && filter.month) {
    const [year, month] = filter.month.split('-').map(Number);
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 1);
  } else if (type === 'custom_year' && filter.year) {
    start = new Date(Number(filter.year), 0, 1);
    end = new Date(Number(filter.year) + 1, 0, 1);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  return { startDate: ymd(start), endDate: ymd(end), label: type };
}

export async function dashboardStats(filter = {}) {
  const { startDate, endDate } = dateRangeForFilter(filter);
  const rows = await query(`
    SELECT members.id, membership_category, members.created_at, home_cell_id,
      MAX(attendance.attendance_date) as last_attendance_date
    FROM members
    LEFT JOIN attendance ON attendance.member_id = members.id AND attendance.status = 'Present'
    WHERE COALESCE(members.archived, 0) = 0
    GROUP BY members.id
  `);
  const periodAttendance = await query(
    "SELECT COUNT(*) as total FROM attendance WHERE attendance_date >= $1 AND attendance_date < $2 AND status = 'Present'",
    [startDate, endDate]
  );
  const upcomingBirthdays = await celebrationRows(30);
  const homeCells = await query('SELECT COUNT(*) as total FROM home_cells');

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
    withoutHomeCell: rows.filter(row => !row.home_cell_id).length,
    upcomingBirthdays: upcomingBirthdays.length,
    homeCellStatistics: Number(homeCells[0]?.total || 0),
    attendanceTrend: Number(periodAttendance[0]?.total || 0)
  };
}

export async function dashboardWidgetMembers(widget) {
  const base = `
    SELECT members.id, members.member_id, first_name, last_name, phone, whatsapp, members.area, membership_category, members.created_at,
      home_cells.cell_name, MAX(attendance.attendance_date) as last_attendance_date
    FROM members
    LEFT JOIN home_cells ON home_cells.id = members.home_cell_id
    LEFT JOIN attendance ON attendance.member_id = members.id AND attendance.status = 'Present'
    WHERE COALESCE(members.archived, 0) = 0
    GROUP BY members.id
  `;
  const rows = await query(base);
  const now = new Date();
  const daysAbsent = date => date ? Math.floor((now - new Date(date)) / 86400000) : 9999;
  const filters = {
    totalMembers: () => true,
    newMembers: row => daysAbsent(row.created_at) <= 30,
    firstTimers: row => row.membership_category === 'First Timer',
    visitors: row => row.membership_category === 'Visitor',
    returningMembers: row => row.membership_category === 'Returning Member',
    activeMembers: row => daysAbsent(row.last_attendance_date) <= 30,
    inactiveMembers: row => daysAbsent(row.last_attendance_date) > 30,
    absentLastSunday: row => daysAbsent(row.last_attendance_date) > 7,
    absent30: row => daysAbsent(row.last_attendance_date) >= 30,
    absent60: row => daysAbsent(row.last_attendance_date) >= 60,
    absent90: row => daysAbsent(row.last_attendance_date) >= 90,
    withoutHomeCell: row => !row.cell_name
  };
  return rows.filter(filters[widget] || filters.totalMembers).map(row => ({
    id: row.id,
    memberId: row.member_id,
    name: `${row.first_name} ${row.last_name}`,
    phone: row.phone,
    whatsapp: row.whatsapp,
    area: row.area,
    category: row.membership_category,
    homeCell: row.cell_name || 'Unassigned',
    lastAttendanceDate: row.last_attendance_date || 'Never'
  }));
}

export async function graphReports() {
  const attendanceTrend = await attendanceReports();
  const membershipGrowth = await query(`
    SELECT substr(created_at, 1, 7) as label, COUNT(*) as value
    FROM members
    GROUP BY label
    ORDER BY label
  `);
  const visitorReturn = await query(`
    SELECT membership_category as label, COUNT(*) as value
    FROM members
    WHERE membership_category IN ('Visitor', 'Returning Member')
    GROUP BY membership_category
  `);
  const homeCellGrowth = await query(`
    SELECT COALESCE(home_cells.cell_name, 'Unassigned') as label, COUNT(members.id) as value
    FROM members LEFT JOIN home_cells ON home_cells.id = members.home_cell_id
    GROUP BY label ORDER BY value DESC
  `);
  const followupCompletion = await query(`
    SELECT status as label, COUNT(*) as value
    FROM followups
    GROUP BY status
  `);

  return {
    attendanceTrend: attendanceTrend.map(row => ({ label: `${row.service_type} ${row.period}`, value: Number(row.total) })),
    membershipGrowth: membershipGrowth.map(row => ({ label: row.label || 'Unknown', value: Number(row.value) })),
    visitorsVsReturningMembers: visitorReturn.map(row => ({ label: row.label, value: Number(row.value) })),
    homeCellGrowth: homeCellGrowth.map(row => ({ label: row.label, value: Number(row.value) })),
    followupCompletionRate: followupCompletion.map(row => ({ label: row.label || 'Pending', value: Number(row.value) }))
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

export async function followupDashboard() {
  const rows = await query(`
    SELECT followups.*, members.first_name, members.last_name, followup_groups.name as team_name
    FROM followups
    LEFT JOIN members ON members.id = followups.member_id
    LEFT JOIN followup_groups ON followup_groups.id = followups.group_id
    ORDER BY followups.created_at DESC
  `);
  const total = rows.length || 1;
  const completed = rows.filter(row => ['Completed', 'Contacted', 'Returned To Church'].includes(row.status)).length;
  return {
    pending: rows.filter(row => row.status === 'Pending').length,
    completed,
    successRate: Math.round((completed / total) * 100),
    outcomes: countBy(rows, 'status'),
    teamPerformance: countBy(rows, 'team_name'),
    recent: rows.slice(0, 25)
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

export async function attendanceDashboard() {
  const summary = await query(`
    SELECT
      COUNT(attendance.id) as attendance_count,
      COUNT(DISTINCT attendance.member_id) as attending_members
    FROM attendance
    WHERE attendance.status = 'Present'
  `);
  const members = await query('SELECT COUNT(*) as total FROM members WHERE COALESCE(archived, 0) = 0');
  const category = await query(`
    SELECT members.membership_category, COUNT(attendance.id) as total
    FROM attendance
    JOIN members ON members.id = attendance.member_id
    WHERE attendance.status = 'Present'
    GROUP BY members.membership_category
  `);
  const totalMembers = Number(members[0]?.total || 0);
  const attending = Number(summary[0]?.attending_members || 0);
  return {
    attendanceCount: Number(summary[0]?.attendance_count || 0),
    absentMembers: Math.max(totalMembers - attending, 0),
    attendancePercentage: totalMembers ? Math.round((attending / totalMembers) * 100) : 0,
    newMemberAttendance: Number(category.find(row => row.membership_category === 'First Timer')?.total || 0),
    visitorAttendance: Number(category.find(row => row.membership_category === 'Visitor')?.total || 0)
  };
}

export async function celebrationRows(days = 30, occasionType = 'All Occasions') {
  const birthdayRows = await query(`
    SELECT members.id, members.member_id, first_name, last_name, phone, whatsapp, date_of_birth,
      home_cells.cell_name
    FROM members
    LEFT JOIN home_cells ON home_cells.id = members.home_cell_id
    WHERE date_of_birth IS NOT NULL AND date_of_birth != '' AND COALESCE(members.archived, 0) = 0
  `);
  const anniversaryRows = await query(`
    SELECT members.id, members.member_id, first_name, last_name, phone, whatsapp,
      anniversaries.occasion_type, anniversaries.occasion_date, home_cells.cell_name
    FROM anniversaries
    JOIN members ON members.id = anniversaries.member_id
    LEFT JOIN home_cells ON home_cells.id = members.home_cell_id
    WHERE anniversaries.occasion_date IS NOT NULL
      AND anniversaries.occasion_date != ''
      AND COALESCE(members.archived, 0) = 0
  `);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const birthdays = birthdayRows.map(row => {
    const next = nextAnnualDate(row.date_of_birth, today, start);
    return celebrationShape({
      row,
      occasionType: 'Birthday',
      sourceDate: row.date_of_birth,
      celebrationDate: next.toISOString().slice(0, 10),
      daysUntil: Math.round((next - start) / 86400000)
    });
  });

  const anniversaries = anniversaryRows.map(row => {
    const next = nextAnnualDate(row.occasion_date, today, start);
    return celebrationShape({
      row,
      occasionType: row.occasion_type,
      sourceDate: row.occasion_date,
      celebrationDate: next.toISOString().slice(0, 10),
      daysUntil: Math.round((next - start) / 86400000)
    });
  });

  return [...birthdays, ...anniversaries]
    .filter(row => row.daysUntil <= days)
    .filter(row => occasionType === 'All Occasions' || row.occasionType === occasionType)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.memberName.localeCompare(b.memberName));
}

export function celebrationOccasionTypes() {
  return ['All Occasions', 'Birthday', ...specialOccasionTypes()];
}

export function specialOccasionTypes() {
  return ['Wedding Anniversary', 'Membership Anniversary', 'Baptism Anniversary', 'Worker Anniversary', 'Ordination Anniversary'];
}

function nextAnnualDate(value, today, start) {
  const date = new Date(value);
  let next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (next < start) next = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
  return next;
}

function celebrationShape({ row, occasionType, sourceDate, celebrationDate, daysUntil }) {
  const firstName = row.first_name;
  const memberName = `${row.first_name} ${row.last_name}`;
  const phrase = occasionType === 'Birthday' ? 'birthday' : occasionType.toLowerCase();
  const message = occasionType === 'Birthday'
    ? `Happy birthday ${firstName}. We celebrate God's grace over your life and pray for a joyful new year.`
    : `Congratulations ${firstName} on your ${phrase}. Your church family celebrates this special milestone with you.`;

  return {
      id: row.id,
      memberId: row.member_id,
      memberName,
      phone: row.phone,
      whatsapp: row.whatsapp,
      occasionType,
      sourceDate,
      celebrationDate,
      homeCell: row.cell_name || 'Unassigned',
      daysUntil,
      birthdayMessage: message,
      specialMessage: message,
      whatsappMessage: message,
      smsMessage: message,
      emailMessage: `Dear ${firstName}, ${message} Grace City Church is praying for you and rejoicing with you.`,
      whatsappUrl: `https://wa.me/${cleanPhone(row.whatsapp || row.phone)}?text=${encodeURIComponent(message)}`,
      smsUrl: `sms:${cleanPhone(row.phone)}?body=${encodeURIComponent(message)}`,
      emailUrl: `mailto:?subject=${encodeURIComponent(`${occasionType} greeting from Grace City Church`)}&body=${encodeURIComponent(`Dear ${firstName},\n\n${message}`)}`
  };
}

export function buildExport(format, scope, rows) {
  const headers = Object.keys(rows[0] || { message: 'No records' });
  const csv = [headers.join(','), ...rows.map(row => headers.map(header => csvEscape(row[header])).join(','))].join('\n');
  return {
    format,
    scope,
    filename: `${scope || 'report'}.${format === 'excel' ? 'csv' : format}`,
    mimeType: format === 'pdf' ? 'application/pdf' : 'text/csv',
    content: format === 'pdf'
      ? `PDF export requested for ${scope}. Use the table data below in the print workflow.\n\n${csv}`
      : csv
  };
}

function cleanPhone(phone = '') {
  return phone.replace(/[^\d]/g, '');
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const label = row[key] || 'Unassigned';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function csvEscape(value = '') {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
