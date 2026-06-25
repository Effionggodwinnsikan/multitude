import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  CalendarCheck,
  Download,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Network,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Upload,
  UserPlus,
  Users
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [dark, setDark] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  if (!token) return <Login onLogin={(nextToken, nextUser) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }} />;

  return <Shell token={token} user={user} dark={dark} setDark={setDark} onLogout={() => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  }} />;
}

function Shell({ token, user, dark, setDark, onLogout }) {
  const [view, setView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const api = useMemo(() => makeApi(token), [token]);

  const nav = [
    ['dashboard', Home, 'Dashboard'],
    ['members', Users, 'Members'],
    ['register', UserPlus, 'Register'],
    ['attendance', CalendarCheck, 'Attendance'],
    ['followup', MessageCircle, 'Follow-up'],
    ['cells', Network, 'Home Cells'],
    ['reports', FileText, 'Reports'],
    ['settings', Settings, 'Settings']
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <Brand api={api} />
        <nav className="mt-6 grid gap-2">
          {nav.map(([id, Icon, label]) => (
            <button key={id} onClick={() => { setView(id); setMobileOpen(false); }} className={`nav-button ${view === id ? 'nav-active' : ''}`}>
              <Icon size={20} /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="font-semibold">{user.fullName}</div>
          <div className="text-slate-500">{user.role}</div>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="icon-button lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div>
              <h1 className="text-lg font-bold sm:text-xl">{titleFor(view)}</h1>
              <p className="hidden text-sm text-slate-500 sm:block">Care, attendance, follow-up, and home cell coordination.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <button className="icon-button" aria-label="Notifications"><Bell size={19} /></button>
            <button className="icon-button" onClick={onLogout} aria-label="Log out"><LogOut size={19} /></button>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          {view === 'dashboard' && <Dashboard api={api} />}
          {view === 'members' && <Members api={api} />}
          {view === 'register' && <RegisterMember api={api} />}
          {view === 'attendance' && <Attendance api={api} />}
          {view === 'followup' && <Followup api={api} />}
          {view === 'cells' && <HomeCells api={api} />}
          {view === 'reports' && <Reports api={api} />}
          {view === 'settings' && <SettingsView api={api} />}
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@gracecity.test');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error('Login failed');
      const data = await response.json();
      onLogin(data.token, data.user);
    } catch {
      setError('Could not sign in. Check that the API is running.');
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-lg bg-blue-600 text-white"><ShieldCheck /></div>
          <div>
            <h1 className="text-2xl font-bold">Church Member Care</h1>
            <p className="text-sm text-slate-500">Secure staff login</p>
          </div>
        </div>
        <label className="field-label">Email</label>
        <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="field-label">Password</label>
        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="primary-button mt-5 w-full">Sign in</button>
      </form>
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

function Dashboard({ api }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/dashboard').then(setStats); }, [api]);
  const cards = [
    ['Total Members', 'totalMembers'], ['New Members', 'newMembers'], ['First Timers', 'firstTimers'], ['Visitors', 'visitors'],
    ['Active Members', 'activeMembers'], ['Inactive Members', 'inactiveMembers'], ['Absent Last Sunday', 'absentLastSunday'],
    ['Absent 30+ Days', 'absent30'], ['Absent 60+ Days', 'absent60'], ['Absent 90+ Days', 'absent90'], ['Home Cells', 'homeCells'],
    ['Attendance This Week', 'attendanceThisWeek']
  ];
  const chartData = cards.slice(1, 10).map(([name, key]) => ({ name, value: stats?.[key] || 0 }));
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, key]) => <StatCard key={key} label={label} value={stats?.[key] ?? '...'} />)}
      </div>
      <section className="panel">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">Member Care Snapshot</h2>
          <button className="secondary-button"><Download size={18} /> Export</button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Members({ api }) {
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => api.get(`/members?search=${encodeURIComponent(search)}`).then(setMembers), 150);
    return () => clearTimeout(timer);
  }, [api, search]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <section className="panel">
        <div className="search-box">
          <Search size={20} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, WhatsApp, area, or member ID" />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Member</th><th>Category</th><th>Area</th><th>Phone</th><th>Cell</th></tr></thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} onClick={() => api.get(`/members/${member.id}`).then(setSelected)}>
                  <td><strong>{member.first_name} {member.last_name}</strong><span>{member.member_id}</span></td>
                  <td>{member.membership_category}</td>
                  <td>{member.area}</td>
                  <td>{member.phone}</td>
                  <td>{member.cell_name || 'Unassigned'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <MemberProfile member={selected} />
    </div>
  );
}

function MemberProfile({ member }) {
  if (!member) return <section className="panel grid place-items-center text-center text-slate-500">Select a member to view history.</section>;
  return (
    <section className="panel">
      <div className="flex items-center gap-3">
        <div className="grid size-14 place-items-center rounded-lg bg-slate-200 text-xl font-bold dark:bg-slate-800">{member.first_name?.[0]}{member.last_name?.[0]}</div>
        <div>
          <h2 className="text-xl font-bold">{member.first_name} {member.last_name}</h2>
          <p className="text-sm text-slate-500">{member.member_id} · {member.membership_category}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm">
        <Info label="Phone" value={member.phone} />
        <Info label="WhatsApp" value={member.whatsapp} />
        <Info label="Address" value={[member.street_address, member.area, member.city].filter(Boolean).join(', ')} />
        <Info label="Department" value={member.department} />
      </div>
      <h3 className="mt-6 font-semibold">Attendance History</h3>
      <div className="mt-2 grid gap-2">
        {member.attendance?.map(item => <div className="mini-row" key={item.id}><span>{item.service_type}</span><strong>{item.attendance_date}</strong></div>)}
      </div>
      <h3 className="mt-6 font-semibold">Follow-up History</h3>
      <div className="mt-2 grid gap-2">
        {member.followups?.length ? member.followups.map(item => <div className="mini-row" key={item.id}><span>{item.reason}</span><strong>{item.status}</strong></div>) : <p className="text-sm text-slate-500">No follow-up records yet.</p>}
      </div>
    </section>
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
  const [memberId, setMemberId] = useState('');
  const [serviceType, setServiceType] = useState('Sunday Service');
  const [message, setMessage] = useState('');
  useEffect(() => { api.get('/members').then(setMembers); }, [api]);

  async function submit(event) {
    event.preventDefault();
    await api.post('/attendance', { memberId, attendanceDate: new Date().toISOString().slice(0, 10), serviceType, status: 'Present' });
    setMessage('Attendance recorded.');
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={submit} className="panel">
        <h2 className="section-title">Manual Check-in</h2>
        <Select label="Member" value={memberId} onChange={setMemberId} options={['', ...members.map(m => `${m.id}|${m.first_name} ${m.last_name} (${m.member_id})`)]} parseValue />
        <Select label="Service Type" value={serviceType} onChange={setServiceType} options={['Sunday Service', 'Midweek Service', 'Home Cell', 'Special Program']} />
        {message && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-emerald-700">{message}</p>}
        <button className="primary-button mt-4"><CalendarCheck size={20} /> Check In</button>
      </form>
      <section className="panel">
        <h2 className="section-title">Other Attendance Channels</h2>
        <div className="mt-4 grid gap-3">
          <button className="secondary-button"><Upload size={18} /> Bulk Upload CSV</button>
          <button className="secondary-button"><Network size={18} /> QR Code Check-in</button>
          <button className="secondary-button"><FileText size={18} /> Mobile Attendance Form</button>
        </div>
      </section>
    </div>
  );
}

function Followup({ api }) {
  const [report, setReport] = useState(null);
  useEffect(() => { api.get('/followups/report').then(setReport); }, [api]);
  const lists = report ? Object.entries(report) : [];
  return (
    <div className="grid gap-5">
      {lists.map(([key, members]) => (
        <section className="panel" key={key}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">{humanize(key)} <span className="text-slate-500">({members.length})</span></h2>
            <button className="secondary-button"><MessageCircle size={18} /> Share List</button>
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

function HomeCells({ api }) {
  const [cells, setCells] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  useEffect(() => {
    api.get('/home-cells').then(setCells);
    api.get('/home-cells/suggestions').then(setSuggestions);
  }, [api]);
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="panel">
        <h2 className="section-title">Home Cell Membership</h2>
        <div className="mt-4 grid gap-3">
          {cells.map(cell => <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800" key={cell.id}>
            <div className="flex items-center justify-between"><strong>{cell.cell_name}</strong><span>{cell.members_count} members</span></div>
            <p className="mt-1 text-sm text-slate-500">{cell.area} · {cell.leader_name} · {cell.meeting_day} {cell.meeting_time}</p>
          </div>)}
        </div>
      </section>
      <section className="panel">
        <h2 className="section-title">Cell Suggestions</h2>
        <div className="mt-4 grid gap-2">
          {suggestions.map(item => <div className="mini-row" key={item.area}><span>{item.area || 'Unknown area'}</span><strong>{item.members_without_cell}</strong></div>)}
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
          <div className="flex gap-2"><button className="secondary-button">PDF</button><button className="secondary-button">Excel</button><button className="secondary-button">CSV</button></div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendance.map(a => ({ name: `${a.service_type} ${a.period}`, total: Number(a.total) }))}>
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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

function makeApi(token) {
  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
  return {
    get: path => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) })
  };
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
