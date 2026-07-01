import { AlertTriangle, Eye, EyeOff, Settings, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { loginWithPassword } from '../services/api';

export function Login({ apiUrl, apiWarning, onLogin }) {
  const [email, setEmail] = useState('admin@gracecity.test');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!apiUrl) {
      setError(apiWarning || 'The API URL is not configured yet.');
      return;
    }
    setLoading(true);
    try {
      const data = await loginWithPassword(apiUrl, { email, password });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        {apiWarning && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-100">{apiWarning}</p>}
        <label className="field-label">Email</label>
        <input className="input" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="field-label">Password</label>
        <div className="relative">
          <input className="input pr-12" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          <button
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(value => !value)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button className="primary-button mt-5 w-full" disabled={loading || !apiUrl}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
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
