import { AlertTriangle, Building2, CheckSquare, Eye, EyeOff, Settings, ShieldCheck, Trash2, Upload } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getPublicBranding, loginWithPassword, registerChurchAccount } from '../services/api';

const DEFAULT_BRAND_COLOR = '#2563eb';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function hexToRgb(hex) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex.slice(1) : DEFAULT_BRAND_COLOR.slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

export function Login({ apiUrl, apiWarning, onLogin }) {
  const [mode, setMode] = useState('login');
  const [identifier, setIdentifier] = useState('admin@gracecity.test');
  const [password, setPassword] = useState('password123');
  const [branding, setBranding] = useState(null);
  const [churchForm, setChurchForm] = useState({
    churchName: '',
    logoUrl: '',
    address: '',
    email: '',
    phone: '',
    brandColor: '#2563eb',
    adminName: '',
    adminEmail: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isSignup = mode === 'signup';
  const activeBrandColor = isSignup ? churchForm.brandColor : (branding?.brand_color || branding?.brandColor || DEFAULT_BRAND_COLOR);
  const brandRgb = hexToRgb(activeBrandColor);
  const brandStyle = {
    '--brand-color': activeBrandColor,
    '--brand-rgb': `${brandRgb.r} ${brandRgb.g} ${brandRgb.b}`
  };
  const churchName = isSignup ? 'Create Church Workspace' : (branding?.church_name || branding?.churchName || 'Church Member Care');
  const logoUrl = !isSignup ? (branding?.logo_url || branding?.logoUrl || '') : '';

  useEffect(() => {
    if (!apiUrl) return;
    getPublicBranding(apiUrl).then(setBranding).catch(() => {});
  }, [apiUrl]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!apiUrl) {
      setError(apiWarning || 'The API URL is not configured yet.');
      return;
    }
    setLoading(true);
    try {
      const data = isSignup
        ? await registerChurchAccount(apiUrl, churchForm)
        : await loginWithPassword(apiUrl, { identifier, password });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function setChurchField(key, value) {
    setChurchForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950" style={brandStyle}>
      <form onSubmit={submit} className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-12 place-items-center overflow-hidden rounded-lg text-white" style={{ backgroundColor: 'rgb(var(--brand-rgb))' }}>
            {logoUrl ? <img className="h-full w-full object-cover" src={logoUrl} alt="" /> : (isSignup ? <Building2 /> : <ShieldCheck />)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{churchName}</h1>
            <p className="text-sm text-slate-500">{isSignup ? 'Set up the church profile and first admin account.' : 'Secure staff login'}</p>
          </div>
        </div>
        {apiWarning && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-100">{apiWarning}</p>}

        <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-950">
          <button className={`auth-tab ${!isSignup ? 'selected' : ''}`} type="button" onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
          <button className={`auth-tab ${isSignup ? 'selected' : ''}`} type="button" onClick={() => { setMode('signup'); setError(''); }}>Create account</button>
        </div>

        {isSignup ? (
          <div className="grid gap-4 md:grid-cols-2">
            <AuthInput label="Church Name" value={churchForm.churchName} onChange={value => setChurchField('churchName', value)} required />
            <AuthImageUpload label="Logo Image" value={churchForm.logoUrl} onChange={value => setChurchField('logoUrl', value)} onRemove={() => setChurchField('logoUrl', '')} onError={setError} />
            <AuthInput label="Address" value={churchForm.address} onChange={value => setChurchField('address', value)} required />
            <AuthInput label="Church Email" type="email" value={churchForm.email} onChange={value => setChurchField('email', value)} />
            <AuthInput label="Phone" value={churchForm.phone} onChange={value => setChurchField('phone', value)} />
            <AuthInput label="Brand Color" type="color" value={churchForm.brandColor} onChange={value => setChurchField('brandColor', value)} />
            <AuthInput label="Admin Name" value={churchForm.adminName} onChange={value => setChurchField('adminName', value)} required />
            <AuthInput label="Admin Email" type="email" value={churchForm.adminEmail} onChange={value => setChurchField('adminEmail', value)} required />
            <label className="md:col-span-2">
              <span className="field-label">Password</span>
              <PasswordField value={churchForm.password} autoComplete="new-password" showPassword={showPassword} setShowPassword={setShowPassword} onChange={value => setChurchField('password', value)} />
            </label>
          </div>
        ) : (
          <>
            <AuthInput label="Username or Email" autoComplete="username" value={identifier} onChange={setIdentifier} />
            <label>
              <span className="field-label">Password</span>
              <PasswordField value={password} autoComplete="current-password" showPassword={showPassword} setShowPassword={setShowPassword} onChange={setPassword} />
            </label>
          </>
        )}
        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="primary-button mt-5 w-full" disabled={loading || !apiUrl}>
          {isSignup ? <CheckSquare size={18} /> : null}
          {loading ? (isSignup ? 'Creating account...' : 'Signing in...') : (isSignup ? 'Create Church Account' : 'Sign in')}
        </button>
      </form>
    </div>
  );
}

function AuthImageUpload({ label, value, onChange, onRemove, onError }) {
  const handleFile = file => {
    onError?.('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Please upload an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError?.('Please upload an image smaller than 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result || '');
    reader.onerror = () => onError?.('Could not read that image. Please try another file.');
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex min-h-12 flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
        <label className="secondary-button min-h-10 cursor-pointer px-3">
          <Upload size={17} />
          Upload
          <input className="sr-only" type="file" accept="image/*" onChange={event => handleFile(event.target.files?.[0])} />
        </label>
        {value && (
          <>
            <img className="size-10 rounded-lg object-cover" src={value} alt="" />
            <button className="tiny-button danger" type="button" onClick={onRemove} aria-label="Remove image"><Trash2 size={15} /></button>
          </>
        )}
      </div>
    </div>
  );
}

function AuthInput({ label, value, onChange, type = 'text', required, autoComplete }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input className="input" type={type} autoComplete={autoComplete} value={value || ''} required={required} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function PasswordField({ value, onChange, showPassword, setShowPassword, autoComplete }) {
  return (
    <div className="relative">
      <input className="input pr-12" type={showPassword ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)} />
      <button
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        type="button"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        onClick={() => setShowPassword(value => !value)}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function ConfigurationError({ message }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <section className="w-full max-w-xl rounded-lg border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-900 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-lg bg-amber-500 text-white"><Settings /></div>
          <div>
            <h1 className="text-2xl font-bold">Deployment setup needed</h1>
            <p className="text-sm text-slate-500">The frontend needs the deployed API URL.</p>
          </div>
        </div>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-100">{message}</p>
      </section>
    </div>
  );
}

export function ApiSetupNotice({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} />
      <span>{message}</span>
    </div>
  );
}
