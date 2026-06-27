const fallbackApiUrl = 'http://localhost:4000/api';

function normalizeUrl(value) {
  return value?.trim().replace(/\/+$/, '');
}

export const apiBaseUrl = normalizeUrl(import.meta.env.VITE_API_URL) || (import.meta.env.DEV ? fallbackApiUrl : '');

export const apiConfigError = apiBaseUrl
  ? ''
  : 'Missing VITE_API_URL. Set it in Vercel to your Render API URL, for example https://your-api.onrender.com/api, then redeploy.';
