import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  Cake,
  CalendarCheck,
  CheckSquare,
  Download,
  Edit,
  FileText,
  Filter,
  Home,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Moon,
  Network,
  Plus,
  QrCode,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  UserCog,
  UserCircle,
  UserPlus,
  Users
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConfigurationError, Login } from './components/AuthScreens';
import { apiBaseUrl, apiConfigError } from './config';
import { makeApi } from './services/api';
import './styles.css';

const API_URL = apiBaseUrl;

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => readStoredUser());
  const [dark, setDark] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  if (apiConfigError) return <ConfigurationError message={apiConfigError} />;

  if (!token || !user) return <Login apiUrl={API_URL} onLogin={(nextToken, nextUser) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }} />;

  return <Shell token={token} user={user} dark={dark} setDark={setDark} onUserUpdate={nextUser => {
    localStorage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
  }} onLogout={() => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  }} />;
}

function readStoredUser() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    return storedUser && typeof storedUser === 'object' ? storedUser : null;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
}

function Shell({ token, user, dark, setDark, onUserUpdate, onLogout }) {
  const [view, setView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const api = useMemo(() => makeApi(token, API_URL), [token]);

  const nav = [
    ['dashboard', Home, 'Dashboard'],
    ['members', Users, 'Members'],
    ['register', UserPlus, 'Register'],
    ['attendance', CalendarCheck, 'Attendance'],
    ['followup', MessageCircle, 'Follow-up'],
    ['cells', Network, 'Home Cells'],
    ['celebrations', Cake, 'Celebrations'],
    ['notifications', Bell, 'Notifications'],
    ['reports', FileText, 'Reports'],
    ['admin', UserCog, 'Admin'],
    ['settings', Settings, 'Settings']
  ].filter(([id]) => id !== 'admin' || user.role === 'Super Admin');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      {mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <Brand api={api} />
        <nav className="mt-6 grid flex-1 content-start gap-2 overflow-y-auto pb-4">
          {nav.map(([id, Icon, label]) => (
            <button key={id} onClick={() => { setView(id); setMobileOpen(false); }} className={`nav-button ${view === id ? 'nav-active' : ''}`}>
              <Icon size={20} /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="rounded-lg border border-slate-200 p-3 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-700 dark:hover:bg-blue-950/50" type="button" onClick={() => setProfileOpen(true)}>
          <div className="flex items-center gap-3">
            <Avatar name={user.fullName} src={user.profileImageUrl} size="md" />
            <div>
              <div className="font-semibold">{user.fullName}</div>
              <div className="text-slate-500">{user.role}</div>
            </div>
          </div>
        </button>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="icon-button lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div>
              <h1 className="text-lg font-bold sm:text-xl">{titleFor(view)}</h1>
              <p className="hidden text-sm text-slate-500 sm:block">Care, attendance, follow-up, and home cell coordination.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <button className="icon-button" onClick={() => setView('notifications')} aria-label="Notifications"><Bell size={19} /></button>
            <button className="icon-button" onClick={() => setProfileOpen(true)} aria-label="Profile"><UserCircle size={19} /></button>
            <button className="icon-button" onClick={onLogout} aria-label="Log out"><LogOut size={19} /></button>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          {view === 'dashboard' && <Dashboard api={api} />}
          {view === 'members' && <Members api={api} />}
          {view === 'register' && <RegisterMember api={api} />}
          {view === 'attendance' && <Attendance api={api} />}
          {view === 'followup' && <Followup api={api} />}
          {view === 'cells' && <HomeCells api={api} onNavigate={setView} />}
          {view === 'celebrations' && <Celebrations api={api} />}
          {view === 'notifications' && <Notifications api={api} />}
          {view === 'reports' && <Reports api={api} />}
          {view === 'admin' && <AdminUsers api={api} />}
          {view === 'settings' && <SettingsView api={api} />}
        </div>
      </main>
      {profileOpen && <ProfileModal api={api} user={user} onClose={() => setProfileOpen(false)} onSaved={user => { onUserUpdate(user); setProfileOpen(false); }} />}
    </div>
  );
}

function Brand({ api }) {
  const [settings, setSettings] = useState(null);
  useEffect(() => { api.get('/settings').then(setSettings).catch(() => {}); }, [api]);
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-12 place-items-center rounded-lg bg-blue-600 text-white">
        {settings?.logo_url ? <img className="size-12 rounded-lg object-cover" src={settings.logo_url} alt="" /> : <Home />}
      </div>
      <div>
        <div className="font-bold leading-tight">{settings?.church_name || 'Church Care'}</div>
        <div className="text-xs text-slate-500">Member Management</div>
      </div>
    </div>
  );
}

function Avatar({ name, src, size = 'lg' }) {
  const fallback = String(name || 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U';
  const className = size === 'md' ? 'size-11 text-sm' : 'size-16 text-lg';
  return (
    <div className={`grid shrink-0 place-items-center overflow-hidden rounded-lg bg-blue-600 font-bold text-white ${className}`}>
      {src ? <img className="h-full w-full object-cover" src={src} alt="" /> : fallback}
    </div>
  );
}

function ProfileModal({ api, user, onClose, onSaved }) {
  const [form, setForm] = useState({ fullName: user.fullName || '', profileImageUrl: user.profileImageUrl || '' });
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      onSaved(await api.put('/profile', form));
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <form className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900" onSubmit={submit}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-title">Profile</h2>
          <button className="secondary-button" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={form.fullName} src={form.profileImageUrl} />
          <div>
            <div className="font-semibold">{user.email}</div>
            <div className="text-sm text-slate-500">{user.role}</div>
          </div>
        </div>
        <div className="grid gap-3">
          <Input label="Full Name" value={form.fullName} onChange={fullName => setForm(prev => ({ ...prev, fullName }))} required />
          <Input label="Profile Image URL" value={form.profileImageUrl} onChange={profileImageUrl => setForm(prev => ({ ...prev, profileImageUrl }))} />
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="primary-button mt-5"><CheckSquare size={18} /> Save Profile</button>
      </form>
    </div>
  );
}

function Dashboard({ api }) {
  const [stats, setStats] = useState(null);
  const [graphs, setGraphs] = useState(null);
  const [filter, setFilter] = useState({ type: 'this_month' });
  const [drilldown, setDrilldown] = useState(null);
  const query = new URLSearchParams(Object.entries(filter).filter(([, value]) => value)).toString();
  useEffect(() => { api.get(`/dashboard?${query}`).then(setStats); }, [api, query]);
  useEffect(() => { api.get('/dashboard/graphs').then(setGraphs); }, [api]);
  const cards = [
    ['Total Members', 'totalMembers'], ['New Members', 'newMembers'], ['First Timers', 'firstTimers'], ['Visitors', 'visitors'],
    ['Returning Members', 'returningMembers'], ['Active Members', 'activeMembers'], ['Inactive Members', 'inactiveMembers'],
    ['Absent Last Sunday', 'absentLastSunday'], ['Absent 30 Days', 'absent30'], ['Absent 60 Days', 'absent60'],
    ['Absent 90+ Days', 'absent90'], ['Without Home Cell', 'withoutHomeCell'], ['Upcoming Birthdays', 'upcomingBirthdays'],
    ['Home Cell Statistics', 'homeCellStatistics'], ['Attendance Trend', 'attendanceTrend']
  ];
  async function openCard(label, key) {
    const rows = await api.get(`/dashboard/widgets/${key}`);
    setDrilldown({ label, rows });
  }
  return (
    <div className="grid gap-6">
      <section className="panel">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Dashboard Filter" value={filter.type} onChange={type => setFilter({ type })} options={['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_year', 'custom_date', 'custom_range', 'custom_month', 'custom_year']} />
          {filter.type === 'custom_date' && <Input label="Custom Date" type="date" value={filter.date || ''} onChange={date => setFilter(prev => ({ ...prev, date }))} />}
          {filter.type === 'custom_range' && <>
            <Input label="Start Date" type="date" value={filter.startDate || ''} onChange={startDate => setFilter(prev => ({ ...prev, startDate }))} />
            <Input label="End Date" type="date" value={filter.endDate || ''} onChange={endDate => setFilter(prev => ({ ...prev, endDate }))} />
          </>}
          {filter.type === 'custom_month' && <Input label="Custom Month" type="month" value={filter.month || ''} onChange={month => setFilter(prev => ({ ...prev, month }))} />}
          {filter.type === 'custom_year' && <Input label="Custom Year" type="number" value={filter.year || new Date().getFullYear()} onChange={year => setFilter(prev => ({ ...prev, year }))} />}
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, key]) => <StatCard key={key} label={label} value={stats?.[key] ?? '...'} onClick={() => openCard(label, key)} />)}
      </div>
      <section className="panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Real-time Analytics</h2>
          <ExportShare api={api} scope="entire_report" />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <MetricChart title="Attendance Trend by Month" data={graphs?.attendanceTrend || []} color="#2563eb" />
          <MetricChart title="Membership Growth" data={graphs?.membershipGrowth || []} color="#0f766e" />
          <MetricChart title="Visitors vs Returning Members" data={graphs?.visitorsVsReturningMembers || []} color="#7c3aed" />
          <MetricChart title="Home Cell Growth" data={graphs?.homeCellGrowth || []} color="#dc2626" />
          <MetricChart title="Follow-up Completion Rate" data={graphs?.followupCompletionRate || []} color="#ca8a04" />
        </div>
      </section>
      {drilldown && <DrilldownModal title={drilldown.label} rows={drilldown.rows} onClose={() => setDrilldown(null)} />}
    </div>
  );
}

function StatCard({ label, value, onClick }) {
  const className = "rounded-lg border border-slate-200 bg-white p-4 text-left transition dark:border-slate-800 dark:bg-slate-900";
  if (!onClick) {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold leading-none">{value}</p>
      </div>
    );
  }
  return (
    <button onClick={onClick} className={`${className} hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100 dark:hover:border-blue-700 dark:focus:ring-blue-950`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold leading-none">{value}</p>
    </button>
  );
}

function MetricChart({ title, data, color }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ bottom: 54, left: 8, right: 8 }}>
            <XAxis dataKey="label" interval={0} angle={-35} textAnchor="end" height={72} tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DrilldownModal({ title, rows, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <section className="max-h-[88vh] w-full max-w-5xl overflow-auto rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="section-title">{title} <span className="text-slate-500">({rows.length})</span></h2>
          <button className="secondary-button" onClick={onClose}>Close</button>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Phone Number</th><th>Area</th><th>Home Cell</th><th>Last Attendance Date</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.name}</strong><span>{row.memberId}</span></td><td>{row.phone}</td><td>{row.area}</td><td>{row.homeCell}</td><td>{row.lastAttendanceDate}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Members({ api }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: '', area: '', homeCell: '', status: '', memberId: '' });
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  useEffect(() => {
    const params = new URLSearchParams({ search, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) });
    const timer = setTimeout(() => api.get(`/members?${params}`).then(setMembers), 150);
    return () => clearTimeout(timer);
  }, [api, search, filters]);

  async function refresh() {
    const params = new URLSearchParams({ search, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) });
    setMembers(await api.get(`/members?${params}`));
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_460px]">
      <section className="panel">
        <div className="search-box">
          <Search size={20} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, WhatsApp, area, or member ID" />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <Select label="Category" value={filters.category} onChange={category => setFilters(prev => ({ ...prev, category }))} options={['', 'First Timer', 'Visitor', 'Returning Member', 'Full Member', 'Worker', 'Minister']} />
          <Input label="Area" value={filters.area} onChange={area => setFilters(prev => ({ ...prev, area }))} />
          <Input label="Home Cell" value={filters.homeCell} onChange={homeCell => setFilters(prev => ({ ...prev, homeCell }))} />
          <Select label="Attendance Status" value={filters.status} onChange={status => setFilters(prev => ({ ...prev, status }))} options={['', 'Present Recently', 'Absent Last Sunday', 'Absent 30 Days', 'Absent 60 Days', 'Absent 90+ Days', 'Never Attended']} />
          <Input label="Member ID" value={filters.memberId} onChange={memberId => setFilters(prev => ({ ...prev, memberId }))} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Member ID</th><th>Full Name</th><th>Category</th><th>Area</th><th>Phone Number</th><th>WhatsApp Number</th><th>Home Cell</th><th>Date of Birth</th><th>Last Attendance Date</th><th>Attendance Status</th><th>Membership Status</th><th>Actions</th></tr></thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id}>
                  <td>{member.member_id}</td>
                  <td><strong>{member.first_name} {member.last_name}</strong></td>
                  <td>{member.membership_category}</td>
                  <td>{member.area}</td>
                  <td>{member.phone}</td>
                  <td>{member.whatsapp}</td>
                  <td>{member.cell_name || 'Unassigned'}</td>
                  <td>{member.date_of_birth || 'Not set'}</td>
                  <td>{member.last_attendance_date || 'Never'}</td>
                  <td>{member.attendance_status}</td>
                  <td>{member.membership_status}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="tiny-button" title="View" onClick={() => api.get(`/members/${member.id}`).then(setSelected)}><Users size={15} /></button>
                      <button className="tiny-button" title="Edit" onClick={() => setEditing(member)}><Edit size={15} /></button>
                      <button className="tiny-button" title="Archive" onClick={async () => { await api.post(`/members/${member.id}/archive`, {}); await refresh(); }}><Download size={15} /></button>
                      <button className="tiny-button danger" title="Delete" onClick={() => setDeleteTarget(member)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <MemberProfile member={selected} api={api} onReload={() => selected && api.get(`/members/${selected.id}`).then(setSelected)} />
      {editing && <MemberEditModal api={api} member={editing} onClose={() => setEditing(null)} onSaved={async member => { setSelected(member); setEditing(null); await refresh(); }} />}
      {deleteTarget && <DeleteMemberModal api={api} member={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={async () => { setDeleteTarget(null); setSelected(null); await refresh(); }} />}
    </div>
  );
}

function MemberProfile({ member, api, onReload }) {
  const [note, setNote] = useState({ noteType: 'Note', body: '' });
  if (!member) return <section className="panel grid place-items-center text-center text-slate-500">Select a member to view history.</section>;
  async function addNote(event) {
    event.preventDefault();
    await api.post(`/members/${member.id}/notes`, note);
    setNote({ noteType: 'Note', body: '' });
    onReload();
  }
  return (
    <section className="panel">
      <div className="flex items-center gap-3">
        <Avatar name={`${member.first_name} ${member.last_name}`} src={member.photo_url} />
        <div>
          <h2 className="text-xl font-bold">{member.first_name} {member.last_name}</h2>
          <p className="text-sm text-slate-500">{member.member_id} · {member.membership_category}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        <Info label="Category" value={member.membership_category} />
        <Info label="Phone" value={member.phone} />
        <Info label="WhatsApp" value={member.whatsapp} />
        <Info label="Address" value={[member.street_address, member.area, member.city].filter(Boolean).join(', ')} />
        <Info label="Department" value={member.department} />
      </div>
      <h3 className="mt-6 font-semibold">Attendance Information</h3>
      <div className="mt-2 grid gap-2">
        {member.attendance?.map(item => <div className="mini-row" key={item.id}><span>{item.service_type}</span><strong>{item.attendance_date}</strong></div>)}
      </div>
      <h3 className="mt-6 font-semibold">Follow-up Information</h3>
      <div className="mt-2 grid gap-2">
        {member.followups?.length ? member.followups.map(item => <div className="mini-row" key={item.id}><span>{item.reason}</span><strong>{item.status}</strong></div>) : <p className="text-sm text-slate-500">No follow-up records yet.</p>}
      </div>
      <h3 className="mt-6 font-semibold">Home Cell Information</h3>
      <div className="mt-2 grid gap-2 text-sm">
        <Info label="Cell" value={member.cell_name || 'Unassigned'} />
        <Info label="Leader" value={member.leader_name} />
        <Info label="Meeting" value={[member.meeting_day, member.meeting_time].filter(Boolean).join(' ')} />
      </div>
      <h3 className="mt-6 font-semibold">Notes, Prayer Requests & Celebration History</h3>
      <form onSubmit={addNote} className="mt-2 grid gap-2">
        <Select label="Entry Type" value={note.noteType} onChange={noteType => setNote(prev => ({ ...prev, noteType }))} options={['Note', 'Prayer Request', 'Celebration History']} />
        <Input label="Details" value={note.body} onChange={body => setNote(prev => ({ ...prev, body }))} required />
        <button className="secondary-button"><Plus size={17} /> Add Entry</button>
      </form>
      <div className="mt-3 grid gap-2">
        {member.notes?.map(item => <div className="mini-row" key={item.id}><span>{item.note_type}: {item.body}</span><strong>{String(item.created_at).slice(0, 10)}</strong></div>)}
      </div>
    </section>
  );
}

function MemberEditModal({ api, member, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: member.first_name, middleName: member.middle_name || '', lastName: member.last_name,
    gender: member.gender || 'Female', dateOfBirth: member.date_of_birth || '', maritalStatus: member.marital_status || 'Single',
    occupation: member.occupation || '', phone: member.phone || '', altPhone: member.alt_phone || '', whatsapp: member.whatsapp || '',
    email: member.email || '', photoUrl: member.photo_url || '', membershipCategory: member.membership_category || 'Full Member', branch: member.branch || 'Main Branch',
    department: member.department || '', homeCellId: member.home_cell_id || '', state: member.state || '', city: member.city || '',
    localGovernment: member.local_government || '', area: member.area || '', streetAddress: member.street_address || '',
    landmark: member.landmark || '', membershipStatus: member.membership_status || 'Active'
  });
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <form className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-5 dark:bg-slate-900" onSubmit={async e => { e.preventDefault(); onSaved(await api.put(`/members/${member.id}`, form)); }}>
        <div className="mb-4 flex items-center justify-between"><h2 className="section-title">Edit Member</h2><button type="button" className="secondary-button" onClick={onClose}>Close</button></div>
        <FormSection title="Personal Information">
          <Input label="First Name" value={form.firstName} onChange={v => set('firstName', v)} required />
          <Input label="Middle Name" value={form.middleName} onChange={v => set('middleName', v)} />
          <Input label="Last Name" value={form.lastName} onChange={v => set('lastName', v)} required />
          <Input label="Phone Number" value={form.phone} onChange={v => set('phone', v)} required />
          <Input label="WhatsApp Number" value={form.whatsapp} onChange={v => set('whatsapp', v)} />
          <Input label="Profile Image URL" value={form.photoUrl} onChange={v => set('photoUrl', v)} />
          <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} />
          <Select label="Membership Category" value={form.membershipCategory} onChange={v => set('membershipCategory', v)} options={['First Timer', 'Visitor', 'Returning Member', 'Full Member', 'Worker', 'Minister']} />
          <Select label="Membership Status" value={form.membershipStatus} onChange={v => set('membershipStatus', v)} options={['Active', 'Inactive', 'Archived']} />
          <Input label="Area" value={form.area} onChange={v => set('area', v)} />
          <Input label="Department" value={form.department} onChange={v => set('department', v)} />
          <Input label="Street Address" value={form.streetAddress} onChange={v => set('streetAddress', v)} />
        </FormSection>
        <button className="primary-button mt-5"><CheckSquare size={18} /> Save Member</button>
      </form>
    </div>
  );
}

function DeleteMemberModal({ api, member, onClose, onDeleted }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
      <form className="w-full max-w-md rounded-lg bg-white p-5 dark:bg-slate-900" onSubmit={async e => { e.preventDefault(); await api.delete(`/members/${member.id}`, { reason }); onDeleted(); }}>
        <h2 className="section-title">Confirm Deletion</h2>
        <p className="mt-2 text-sm text-slate-500">Deletion is logged with the member snapshot, reason, and current admin identity.</p>
        <Input label={`Reason for deleting ${member.first_name} ${member.last_name}`} value={reason} onChange={setReason} required />
        <div className="mt-4 flex gap-2"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button bg-red-600 hover:bg-red-700"><Trash2 size={18} /> Delete</button></div>
      </form>
    </div>
  );
}

function RegisterMember({ api }) {
  const empty = {
    firstName: '', middleName: '', lastName: '', gender: 'Female', dateOfBirth: '', maritalStatus: 'Single',
    occupation: '', phone: '', altPhone: '', whatsapp: '', email: '', photoUrl: '', membershipCategory: 'First Timer',
    dateFirstAttended: new Date().toISOString().slice(0, 10), branch: 'Main Branch', invitedBy: '', department: '',
    state: '', city: '', localGovernment: '', area: '', streetAddress: '', landmark: ''
  };
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState('');
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    const member = await api.post('/members', form);
    setSaved(`${member.first_name} ${member.last_name} registered as ${member.member_id}`);
    setForm(empty);
  }

  return (
    <form onSubmit={submit} className="panel grid gap-6">
      <FormSection title="Personal Information">
        <Input label="First Name" value={form.firstName} onChange={v => set('firstName', v)} required />
        <Input label="Middle Name" value={form.middleName} onChange={v => set('middleName', v)} />
        <Input label="Last Name" value={form.lastName} onChange={v => set('lastName', v)} required />
        <Select label="Gender" value={form.gender} onChange={v => set('gender', v)} options={['Female', 'Male']} />
        <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={v => set('dateOfBirth', v)} />
        <Select label="Marital Status" value={form.maritalStatus} onChange={v => set('maritalStatus', v)} options={['Single', 'Married', 'Widowed', 'Divorced']} />
        <Input label="Occupation" value={form.occupation} onChange={v => set('occupation', v)} />
        <Input label="Phone Number" value={form.phone} onChange={v => set('phone', v)} required />
        <Input label="Alternative Phone" value={form.altPhone} onChange={v => set('altPhone', v)} />
        <Input label="WhatsApp Number" value={form.whatsapp} onChange={v => set('whatsapp', v)} />
        <Input label="Email Address" type="email" value={form.email} onChange={v => set('email', v)} />
        <Input label="Passport Photograph URL" value={form.photoUrl} onChange={v => set('photoUrl', v)} />
      </FormSection>
      <FormSection title="Membership & Church Information">
        <Select label="Membership Category" value={form.membershipCategory} onChange={v => set('membershipCategory', v)} options={['First Timer', 'Visitor', 'Returning Member', 'Full Member', 'Occasional Attendee', 'Worker', 'Minister']} />
        <Input label="Date First Attended" type="date" value={form.dateFirstAttended} onChange={v => set('dateFirstAttended', v)} />
        <Input label="Branch" value={form.branch} onChange={v => set('branch', v)} />
        <Input label="Invited By" value={form.invitedBy} onChange={v => set('invitedBy', v)} />
        <Input label="Department" value={form.department} onChange={v => set('department', v)} />
      </FormSection>
      <FormSection title="Location Information">
        <Input label="State" value={form.state} onChange={v => set('state', v)} />
        <Input label="City" value={form.city} onChange={v => set('city', v)} />
        <Input label="Local Government" value={form.localGovernment} onChange={v => set('localGovernment', v)} />
        <Input label="Area / Community" value={form.area} onChange={v => set('area', v)} />
        <Input label="Street Address" value={form.streetAddress} onChange={v => set('streetAddress', v)} />
        <Input label="Landmark" value={form.landmark} onChange={v => set('landmark', v)} />
      </FormSection>
      {saved && <p className="rounded-lg bg-emerald-50 p-3 text-emerald-700">{saved}</p>}
      <button className="primary-button w-full sm:w-fit"><Plus size={20} /> Register Member</button>
    </form>
  );
}

function Attendance({ api }) {
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [memberId, setMemberId] = useState('');
  const [serviceType, setServiceType] = useState('Sunday Service');
  const [method, setMethod] = useState('Manual Entry');
  const [message, setMessage] = useState('');
  useEffect(() => {
    api.get('/members').then(setMembers);
    api.get('/attendance/dashboard').then(setSummary);
  }, [api]);

  async function submit(event) {
    event.preventDefault();
    await api.post('/attendance', { memberId, attendanceDate: new Date().toISOString().slice(0, 10), serviceType, status: 'Present', method });
    setMessage('Attendance recorded.');
    api.get('/attendance/dashboard').then(setSummary);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Attendance Count" value={summary?.attendanceCount ?? '...'} />
        <StatCard label="Absent Members" value={summary?.absentMembers ?? '...'} />
        <StatCard label="Attendance Percentage" value={`${summary?.attendancePercentage ?? '...'}%`} />
        <StatCard label="New Member Attendance" value={summary?.newMemberAttendance ?? '...'} />
        <StatCard label="Visitor Attendance" value={summary?.visitorAttendance ?? '...'} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={submit} className="panel">
        <h2 className="section-title">Manual Check-in</h2>
        <Select label="Member" value={memberId} onChange={setMemberId} options={['', ...members.map(m => `${m.id}|${m.first_name} ${m.last_name} (${m.member_id})`)]} parseValue />
        <Select label="Service Type" value={serviceType} onChange={setServiceType} options={['Sunday Service', 'Midweek Service', 'Home Cell', 'Special Program']} />
        <Select label="Capture Method" value={method} onChange={setMethod} options={['Manual Entry', 'QR Code Scan', 'Mobile Check-In', 'Bulk Upload', 'Self-Service Kiosk', 'Home Cell Attendance', 'Special Event Attendance']} />
        {message && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}
        <button className="primary-button mt-4"><CalendarCheck size={20} /> Check In</button>
      </form>
      <section className="panel">
        <h2 className="section-title">Attendance Capture Methods</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            [Upload, 'Bulk Upload'], [QrCode, 'QR Code Scan'], [Smartphone, 'Mobile Check-In'],
            [Users, 'Self-Service Kiosk'], [Network, 'Home Cell Attendance'], [FileText, 'Special Event Attendance']
          ].map(([Icon, label]) => (
            <button
              className={`secondary-button ${method === label ? 'selected' : ''}`}
              key={label}
              type="button"
              onClick={() => {
                setMethod(label);
                setMessage(`${label} selected. Choose a member and check in to record attendance through this channel.`);
              }}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

function Followup({ api }) {
  const [report, setReport] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [members, setMembers] = useState([]);
  const [feedback, setFeedback] = useState({ memberId: '', contactDate: new Date().toISOString().slice(0, 10), contactMethod: 'Phone Call', feedbackCategory: 'Care', notes: '', prayerRequest: '', status: 'Contacted' });
  useEffect(() => {
    api.get('/followups/report').then(setReport);
    api.get('/followups/dashboard').then(setDashboard);
    api.get('/members').then(setMembers);
  }, [api]);
  const lists = report ? Object.entries(report) : [];
  const shareText = rows => encodeURIComponent(rows.slice(0, 6).map(member => `${member.name} - ${member.followupReason} - ${member.phone || member.whatsapp || ''}`).join('\n'));
  async function submitFeedback(event) {
    event.preventDefault();
    await api.post('/followups/feedback', feedback);
    setFeedback(prev => ({ ...prev, notes: '', prayerRequest: '' }));
    api.get('/followups/dashboard').then(setDashboard);
  }
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pending Follow-Ups" value={dashboard?.pending ?? '...'} />
        <StatCard label="Completed Follow-Ups" value={dashboard?.completed ?? '...'} />
        <StatCard label="Success Rate" value={`${dashboard?.successRate ?? '...'}%`} />
        <StatCard label="Follow-Up Outcomes" value={Object.keys(dashboard?.outcomes || {}).length} />
        <StatCard label="Team Performance" value={Object.keys(dashboard?.teamPerformance || {}).length} />
      </div>
      <section className="panel">
        <h2 className="section-title">Follow-up Feedback</h2>
        <form onSubmit={submitFeedback} className="mt-4 grid gap-3 md:grid-cols-3">
          <Select label="Member Name" value={feedback.memberId} onChange={memberId => setFeedback(prev => ({ ...prev, memberId }))} options={['', ...members.map(m => `${m.id}|${m.first_name} ${m.last_name}`)]} parseValue />
          <Input label="Contact Date" type="date" value={feedback.contactDate} onChange={contactDate => setFeedback(prev => ({ ...prev, contactDate }))} />
          <Select label="Contact Method" value={feedback.contactMethod} onChange={contactMethod => setFeedback(prev => ({ ...prev, contactMethod }))} options={['Phone Call', 'WhatsApp', 'SMS', 'Email', 'Home Visit', 'In Person']} />
          <Select label="Feedback Category" value={feedback.feedbackCategory} onChange={feedbackCategory => setFeedback(prev => ({ ...prev, feedbackCategory }))} options={['New Member Follow-Up', 'First Timer Follow-Up', 'Visitor Follow-Up', 'Missed Last Sunday', 'Absent 30 Days', 'Absent 60 Days', 'Absent 90 Days', 'Welfare Follow-Up']} />
          <Select label="Follow-Up Status" value={feedback.status} onChange={status => setFeedback(prev => ({ ...prev, status }))} options={['Contacted', 'Not Reachable', 'Number Invalid', 'Promised To Return', 'Returned To Church', 'Needs Visit', 'Needs Counseling']} />
          <Input label="Prayer Request" value={feedback.prayerRequest} onChange={prayerRequest => setFeedback(prev => ({ ...prev, prayerRequest }))} />
          <Input label="Notes" value={feedback.notes} onChange={notes => setFeedback(prev => ({ ...prev, notes }))} />
          <button className="primary-button self-end"><CheckSquare size={18} /> Submit Feedback</button>
        </form>
      </section>
      {lists.map(([key, members]) => (
        <section className="panel" key={key}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">{humanize(key)} <span className="text-slate-500">({members.length})</span></h2>
            <div className="flex gap-2">
              <a className="secondary-button" href={`https://wa.me/?text=${shareText(members)}`} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WhatsApp</a>
              <a className="secondary-button" href={`https://t.me/share/url?url=&text=${shareText(members)}`} target="_blank" rel="noreferrer"><Send size={18} /> Telegram</a>
              <a className="secondary-button" href={`mailto:?subject=Church follow-up list&body=${shareText(members)}`}><Mail size={18} /> Email</a>
            </div>
          </div>
          <div className="grid gap-2">
            {members.slice(0, 6).map(member => (
              <div className="mini-row" key={`${key}-${member.id}`}>
                <span>{member.name} · {member.area} · {member.followupReason}</span>
                <a className="text-blue-600" href={member.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function HomeCells({ api, onNavigate }) {
  const [cells, setCells] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const empty = { cellName: '', area: '', leaderName: '', assistantLeader: '', meetingAddress: '', meetingDay: 'Wednesday', meetingTime: '18:00' };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  async function load() {
    api.get('/home-cells').then(setCells);
    api.get('/home-cells/suggestions').then(setSuggestions);
  }
  useEffect(() => {
    load();
  }, [api]);
  async function submit(event) {
    event.preventDefault();
    if (editingId) await api.put(`/home-cells/${editingId}`, form);
    else await api.post('/home-cells', form);
    setForm(empty);
    setEditingId(null);
    load();
  }
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="panel">
        <div className="flex items-center justify-between gap-3"><h2 className="section-title">Home Cell Membership</h2><button className="secondary-button" onClick={() => { setForm(empty); setEditingId(null); }}><Plus size={18} /> Add Cell</button></div>
        <div className="mt-4 grid gap-3">
          {cells.map(cell => <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800" key={cell.id}>
            <div className="flex items-center justify-between gap-3"><strong>{cell.cell_name}</strong><span>{cell.members_count} members</span></div>
            <p className="mt-1 text-sm text-slate-500">{cell.area} · {cell.leader_name} · {cell.assistant_leader || 'No assistant'} · {cell.meeting_day} {cell.meeting_time}</p>
            <p className="mt-1 text-sm text-slate-500">{cell.meeting_address}</p>
            <div className="mt-3 flex gap-2">
              <button className="secondary-button" onClick={() => { setEditingId(cell.id); setForm({ cellName: cell.cell_name, area: cell.area, leaderName: cell.leader_name || '', assistantLeader: cell.assistant_leader || '', meetingAddress: cell.meeting_address || '', meetingDay: cell.meeting_day || 'Wednesday', meetingTime: cell.meeting_time || '18:00' }); }}><Edit size={17} /> Edit</button>
              <button className="secondary-button" type="button" onClick={() => onNavigate('attendance')}><CalendarCheck size={17} /> Attendance</button>
              <button className="secondary-button" type="button" onClick={() => onNavigate('reports')}><FileText size={17} /> Reports</button>
              <button className="secondary-button danger" onClick={async () => { await api.delete(`/home-cells/${cell.id}`, {}); load(); }}><Trash2 size={17} /> Delete</button>
            </div>
          </div>)}
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">{editingId ? 'Edit Cell' : 'Add Cell'}</h2>
        <form onSubmit={submit} className="mt-3 grid gap-3">
          <Input label="Cell Name" value={form.cellName} onChange={v => set('cellName', v)} required />
          <Input label="Cell Address" value={form.meetingAddress} onChange={v => set('meetingAddress', v)} />
          <Input label="Area" value={form.area} onChange={v => set('area', v)} required />
          <Select label="Meeting Day" value={form.meetingDay} onChange={v => set('meetingDay', v)} options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']} />
          <Input label="Meeting Time" type="time" value={form.meetingTime} onChange={v => set('meetingTime', v)} />
          <Input label="Cell Leader" value={form.leaderName} onChange={v => set('leaderName', v)} />
          <Input label="Assistant Leader" value={form.assistantLeader} onChange={v => set('assistantLeader', v)} />
          <button className="primary-button"><CheckSquare size={18} /> Save Cell</button>
        </form>
        <h2 className="section-title mt-6">Cell Suggestions</h2>
        <div className="mt-4 grid gap-2">
          {suggestions.map(item => <div className="mini-row" key={item.area}><span>{item.area || 'Unknown area'}</span><strong>{item.members_without_cell}</strong></div>)}
        </div>
      </section>
    </div>
  );
}

function Celebrations({ api }) {
  const [data, setData] = useState(null);
  const [occasionType, setOccasionType] = useState('All Occasions');
  const [channel, setChannel] = useState('In-App Notification');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    api.get(`/celebrations?days=30&occasionType=${encodeURIComponent(occasionType)}`).then(setData);
  }, [api, occasionType]);
  const groups = [
    ['Today\'s Celebrations', data?.today || []],
    ['Upcoming Celebrations (7 Days)', data?.upcoming7 || []],
    ['Upcoming Celebrations (30 Days)', data?.upcoming30 || []],
    ['Celebrations This Month', data?.thisMonth || []]
  ];
  async function generateAdminNotifications() {
    const result = await api.post('/celebrations/notify', { occasionType, days: 30, channel });
    setNotice(`${result.count} ${occasionType.toLowerCase()} notification${result.count === 1 ? '' : 's'} sent to the admin notification center.`);
  }
  return (
    <div className="grid gap-5">
      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Celebration Notifications</h2>
            <p className="mt-1 text-sm text-slate-500">Filter birthdays and special occasions, send member greetings, and notify Super Admin.</p>
          </div>
          <span className="pill">{data?.upcoming30?.length || 0} matching records</span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <Select label="Occasion Filter" value={occasionType} onChange={setOccasionType} options={data?.occasionTypes || ['All Occasions', 'Birthday']} />
          <Select label="Notification Channel" value={channel} onChange={setChannel} options={['In-App Notification', 'WhatsApp', 'SMS', 'Email']} />
          <Select label="Notification Timing" value="30 Days" onChange={() => {}} options={['Same Day', '1 Day Before', '3 Days Before', '7 Days Before', '30 Days']} />
          <button className="primary-button self-end" onClick={generateAdminNotifications} type="button"><Bell size={18} /> Notify Admin</button>
        </div>
        {notice && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">{notice}</p>}
      </section>
      <section className="panel">
        <h2 className="section-title">Special Occasion Tracking</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.occasionTypes || ['All Occasions', 'Birthday', 'Wedding Anniversary', 'Membership Anniversary', 'Baptism Anniversary', 'Worker Anniversary', 'Ordination Anniversary']).map(item => (
            <button
              className={`pill transition hover:border-blue-300 hover:text-blue-700 dark:hover:border-blue-700 ${occasionType === item ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200' : ''}`}
              key={item}
              type="button"
              onClick={() => setOccasionType(item)}
            >
              {item} <span className="ml-1 text-slate-500">({data?.counts?.[item] ?? 0})</span>
            </button>
          ))}
        </div>
      </section>
      {groups.map(([title, rows]) => (
        <section className="panel" key={title}>
          <h2 className="section-title">{title} <span className="text-slate-500">({rows.length})</span></h2>
          <div className="mt-4 overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Member Name</th><th>Phone Number</th><th>Occasion Type</th><th>Celebration Date</th><th>Home Cell</th><th>Generated Message</th><th>Send Message</th></tr></thead>
              <tbody>{rows.map(row => <tr key={`${title}-${row.occasionType}-${row.id}`}>
                <td><strong>{row.memberName}</strong><span>{row.memberId}</span></td>
                <td>{row.phone}</td>
                <td>{row.occasionType}</td>
                <td>{row.celebrationDate}</td>
                <td>{row.homeCell}</td>
                <td><span>{row.specialMessage || row.birthdayMessage}</span></td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <a className="tiny-button" title="WhatsApp" href={row.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /></a>
                    <a className="tiny-button" title="SMS" href={row.smsUrl}><Smartphone size={15} /></a>
                    <a className="tiny-button" title="Email" href={row.emailUrl}><Mail size={15} /></a>
                  </div>
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function Notifications({ api }) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [type, setType] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => api.get(`/notifications?search=${encodeURIComponent(search)}`).then(setRows), 150);
    return () => clearTimeout(timer);
  }, [api, search]);
  const filtered = type ? rows.filter(row => row.type === type) : rows;
  return (
    <div className="grid gap-5">
      <section className="panel">
        <div className="grid gap-3 md:grid-cols-[1fr_240px_auto]">
          <div className="search-box"><Search size={20} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search alerts, follow-ups, birthdays, attendance warnings, assignments, or member updates" /></div>
          <Select label="Filter" value={type} onChange={setType} options={['', 'Alert', 'Follow-Up', 'Birthday', 'Wedding Anniversary', 'Membership Anniversary', 'Baptism Anniversary', 'Worker Anniversary', 'Ordination Anniversary', 'Attendance Warning', 'Home Cell Assignment', 'Member Update']} />
          <button className="secondary-button self-end" onClick={() => api.post('/notifications/generate', {}).then(() => api.get('/notifications').then(setRows))}><Bell size={18} /> Generate Alerts</button>
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">Notification Center</h2>
        <div className="mt-4 grid gap-2">
          {filtered.map(row => <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800" key={row.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{row.title}</strong><span className="pill">{row.type}</span></div>
            <p className="mt-1 text-sm text-slate-500">{row.message}</p>
            <p className="mt-2 text-xs text-slate-500">{row.status} · {String(row.created_at).slice(0, 10)}</p>
          </div>)}
        </div>
      </section>
    </div>
  );
}

function Reports({ api }) {
  const [attendance, setAttendance] = useState([]);
  const [location, setLocation] = useState(null);
  useEffect(() => {
    api.get('/reports/attendance').then(setAttendance);
    api.get('/reports/location').then(setLocation);
  }, [api]);
  return (
    <div className="grid gap-5">
      <section className="panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Attendance Reports</h2>
          <ExportShare api={api} scope="selected_attendance" />
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendance.map(a => ({ name: `${a.service_type} ${a.period}`, total: Number(a.total) }))} margin={{ bottom: 54 }}>
              <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={72} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">Export Scope</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <ExportShare api={api} scope="entire_report" label="Entire Report" />
          <ExportShare api={api} scope="selected_members" label="Selected Members Only" />
          <ExportShare api={api} scope="selected_attendance" label="Selected Attendance Records Only" />
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">Location Reports</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {['byArea', 'byState', 'byCity'].map(key => <div key={key} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <strong>{humanize(key)}</strong>
            <div className="mt-3 grid gap-2">{location?.[key]?.map(item => <div className="mini-row" key={item.area || item.state || item.city}><span>{item.area || item.state || item.city || 'Unknown'}</span><strong>{item.total}</strong></div>)}</div>
          </div>)}
        </div>
      </section>
    </div>
  );
}

function AdminUsers({ api }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [message, setMessage] = useState('');
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', profileImageUrl: '', roleId: '', active: true });
  const [newRole, setNewRole] = useState({ name: '', permissions: [] });
  const [passwords, setPasswords] = useState({});

  async function load() {
    const [nextUsers, nextRoles, nextPermissions] = await Promise.all([
      api.get('/admin/users'),
      api.get('/admin/roles'),
      api.get('/admin/permissions')
    ]);
    setUsers(nextUsers);
    setRoles(nextRoles);
    setPermissions(nextPermissions);
    setNewUser(prev => ({ ...prev, roleId: prev.roleId || nextRoles.find(role => role.name === 'Sub Admin')?.id || nextRoles.find(role => role.name !== 'Super Admin')?.id || '' }));
  }

  useEffect(() => { load(); }, [api]);

  async function createSubAdmin(event) {
    event.preventDefault();
    const user = await api.post('/admin/users', newUser);
    setMessage(`${user.full_name} can now log in as ${user.role_name}.`);
    setNewUser({ fullName: '', email: '', password: '', profileImageUrl: '', roleId: newUser.roleId, active: true });
    load();
  }

  async function createOrUpdateRole(event) {
    event.preventDefault();
    const role = await api.post('/admin/roles', newRole);
    setMessage(`${role.name} role created.`);
    setNewRole({ name: '', permissions: [] });
    load();
  }

  async function assignRole(userId, roleId) {
    const user = await api.put(`/admin/users/${userId}/role`, { roleId });
    setMessage(`${user.full_name} is now assigned to ${user.role_name}.`);
    load();
  }

  async function toggleStatus(user) {
    const updated = await api.put(`/admin/users/${user.id}/status`, { active: !user.active });
    setMessage(`${updated.full_name} is now ${updated.active ? 'active' : 'inactive'}.`);
    load();
  }

  async function resetPassword(userId) {
    const password = passwords[userId];
    if (!password || password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      return;
    }
    const user = await api.put(`/admin/users/${userId}/password`, { password });
    setPasswords(prev => ({ ...prev, [userId]: '' }));
    setMessage(`Password reset for ${user.full_name}.`);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Sub Admins & Users</h2>
            <p className="text-sm text-slate-500">Create login accounts, assign roles, and control access.</p>
          </div>
          {message && <span className="pill">{message}</span>}
        </div>
        <form onSubmit={createSubAdmin} className="mb-5 grid gap-3 md:grid-cols-6">
          <Input label="Full Name" value={newUser.fullName} onChange={fullName => setNewUser(prev => ({ ...prev, fullName }))} required />
          <Input label="Email" type="email" value={newUser.email} onChange={email => setNewUser(prev => ({ ...prev, email }))} required />
          <Input label="Temporary Password" type="password" value={newUser.password} onChange={password => setNewUser(prev => ({ ...prev, password }))} required />
          <Input label="Profile Image URL" value={newUser.profileImageUrl} onChange={profileImageUrl => setNewUser(prev => ({ ...prev, profileImageUrl }))} />
          <Select label="Role" value={newUser.roleId} onChange={roleId => setNewUser(prev => ({ ...prev, roleId }))} options={roles.filter(role => role.name !== 'Super Admin').map(role => `${role.id}|${role.name}`)} parseValue />
          <button className="primary-button self-end"><UserPlus size={18} /> Create User</button>
        </form>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Assign Role</th><th>Reset Password</th><th>Access</th></tr></thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td><div className="flex items-center gap-2"><Avatar name={user.full_name} src={user.profile_image_url} size="md" /><strong>{user.full_name}</strong></div></td>
                  <td>{user.email}</td>
                  <td>{user.role_name}</td>
                  <td>{user.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    {user.role_name === 'Super Admin'
                      ? <span className="text-sm text-slate-500">Locked</span>
                      : <select className="input h-10" value={user.role_id || ''} onChange={e => assignRole(user.id, e.target.value)}>
                        {roles.filter(role => role.name !== 'Super Admin').map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                      </select>}
                  </td>
                  <td>
                    {user.role_name === 'Super Admin' ? <span className="text-sm text-slate-500">Locked</span> : <div className="flex gap-2">
                      <input className="input h-10 min-w-40" type="password" value={passwords[user.id] || ''} onChange={e => setPasswords(prev => ({ ...prev, [user.id]: e.target.value }))} placeholder="New password" />
                      <button className="tiny-button" type="button" onClick={() => resetPassword(user.id)}><CheckSquare size={15} /></button>
                    </div>}
                  </td>
                  <td>{user.role_name === 'Super Admin' ? <span className="pill">Protected</span> : <button className="secondary-button" onClick={() => toggleStatus(user)}>{user.active ? 'Disable' : 'Enable'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">Roles & Permissions</h2>
        <form onSubmit={createOrUpdateRole} className="mt-4 grid gap-3">
          <Input label="Role Name" value={newRole.name} onChange={name => setNewRole(prev => ({ ...prev, name }))} required />
          <div>
            <span className="field-label">Permissions</span>
            <div className="grid gap-2">
              {permissions.map(permission => <label className="mini-row cursor-pointer" key={permission}>
                <span>{permission}</span>
                <input type="checkbox" checked={newRole.permissions.includes(permission)} onChange={e => setNewRole(prev => ({
                  ...prev,
                  permissions: e.target.checked ? [...prev.permissions, permission] : prev.permissions.filter(item => item !== permission)
                }))} />
              </label>)}
            </div>
          </div>
          <button className="primary-button"><ShieldCheck size={18} /> Create Role</button>
        </form>
        <div className="mt-6 grid gap-3">
          {roles.map(role => <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800" key={role.id}>
            <div className="flex items-center justify-between gap-3"><strong>{role.name}</strong><span>{role.permissions.includes('*') ? 'All access' : `${role.permissions.length} permissions`}</span></div>
            <p className="mt-2 text-sm text-slate-500">{role.permissions.includes('*') ? 'Protected Super Admin role' : role.permissions.join(', ') || 'No permissions yet'}</p>
          </div>)}
        </div>
      </section>
    </div>
  );
}

function ExportShare({ api, scope, label }) {
  const [latest, setLatest] = useState(null);
  async function exportReport(format) {
    const result = await api.post('/reports/export', { format, scope });
    setLatest(result);
  }
  async function shareNative() {
    const result = latest || await api.post('/reports/export', { format: 'csv', scope });
    setLatest(result);
    const text = `Church Care ${label || humanize(scope)} report is ready: ${result.filename}`;
    if (navigator.share) {
      await navigator.share({ title: 'Church Care Report', text });
    }
  }
  const shareText = encodeURIComponent(`Church Care ${label || humanize(scope)} report is ready${latest ? `: ${latest.filename}` : '.'}`);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="font-semibold">{label}</span>}
      <button className="secondary-button" onClick={() => exportReport('pdf')}><FileText size={17} /> PDF</button>
      <button className="secondary-button" onClick={() => exportReport('excel')}><Download size={17} /> Excel</button>
      <button className="secondary-button" onClick={() => exportReport('csv')}><Download size={17} /> CSV</button>
      <a className="secondary-button" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>
      <a className="secondary-button" href={`https://t.me/share/url?url=&text=${shareText}`} target="_blank" rel="noreferrer"><Send size={17} /> Telegram</a>
      <a className="secondary-button" href={`mailto:?subject=Church Care Report&body=${shareText}`}><Mail size={17} /> Email</a>
      <button className="secondary-button" type="button" onClick={shareNative}><Share2 size={17} /> Share</button>
      {latest && <a className="secondary-button" href={`data:${latest.mimeType};charset=utf-8,${encodeURIComponent(latest.content)}`} download={latest.filename}><Download size={17} /> Download</a>}
    </div>
  );
}

function SettingsView({ api }) {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api.get('/settings').then(data => setSettings(toCamel(data))); }, [api]);
  if (!settings) return <section className="panel">Loading settings...</section>;
  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
  return (
    <form className="panel max-w-3xl" onSubmit={async e => { e.preventDefault(); await api.put('/settings', settings); setSaved(true); }}>
      <h2 className="section-title">Church Branding & Follow-up Schedule</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input label="Church Name" value={settings.churchName} onChange={v => set('churchName', v)} />
        <Input label="Logo URL" value={settings.logoUrl || ''} onChange={v => set('logoUrl', v)} />
        <Input label="Address" value={settings.address || ''} onChange={v => set('address', v)} />
        <Input label="Email" value={settings.email || ''} onChange={v => set('email', v)} />
        <Input label="Phone" value={settings.phone || ''} onChange={v => set('phone', v)} />
        <Input label="Brand Color" type="color" value={settings.brandColor || '#2563eb'} onChange={v => set('brandColor', v)} />
        <Select label="Follow-up Day" value={settings.followupDay || 'Sunday'} onChange={v => set('followupDay', v)} options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']} />
        <Input label="Follow-up Time" type="time" value={settings.followupTime || '18:00'} onChange={v => set('followupTime', v)} />
      </div>
      {saved && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">Settings saved.</p>}
      <button className="primary-button mt-5">Save Settings</button>
    </form>
  );
}

function FormSection({ title, children }) {
  return <section><h2 className="section-title mb-4">{title}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div></section>;
}

function Input({ label, value, onChange, type = 'text', required }) {
  return <label><span className="field-label">{label}</span><input className="input" type={type} value={value || ''} required={required} onChange={e => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options, parseValue }) {
  return <label><span className="field-label">{label}</span><select className="input" value={value} onChange={e => onChange(parseValue ? e.target.value.split('|')[0] : e.target.value)}>{options.map(option => <option key={option} value={parseValue ? option.split('|')[0] : option}>{parseValue ? option.split('|')[1] || 'Choose member' : option}</option>)}</select></label>;
}

function Info({ label, value }) {
  return <div className="mini-row"><span>{label}</span><strong>{value || 'Not set'}</strong></div>;
}

function titleFor(view) {
  return humanize(view === 'cells' ? 'homeCells' : view);
}

function humanize(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

function toCamel(row) {
  return {
    churchName: row.church_name,
    logoUrl: row.logo_url,
    address: row.address,
    email: row.email,
    phone: row.phone,
    brandColor: row.brand_color,
    followupDay: row.followup_day,
    followupTime: row.followup_time
  };
}

createRoot(document.getElementById('root')).render(<App />);
