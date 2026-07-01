const fallbackApiUrl = 'http://localhost:4000/api';
const localHosts = ['localhost', '127.0.0.1', '::1'];

function normalizeUrl(value) {
  return value?.trim().replace(/\/+$/, '');
}

function isLocalBrowser() {
  return typeof window !== 'undefined' && localHosts.includes(window.location.hostname);
}

export const apiBaseUrl = normalizeUrl(import.meta.env.VITE_API_URL) || (isLocalBrowser() ? fallbackApiUrl : '');

export const apiConfigWarning = apiBaseUrl
  ? ''
  : 'Missing VITE_API_URL. Set it in production to your API URL, for example https://your-api.onrender.com/api, then redeploy. The interface is visible, but sign-in and data features need the API URL.';
