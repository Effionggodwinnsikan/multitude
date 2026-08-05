export function makeApi(token, baseUrl, onUnauthorized) {
  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const message = await responseMessage(response);
      if (response.status === 401 && isAuthTokenError(message)) {
        onUnauthorized?.(message || 'Your session has ended. Please sign in again.');
      }
      throw new Error(message);
    }

    return response.json();
  }

  return {
    get: path => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path, body) => request(path, { method: 'DELETE', body: JSON.stringify(body || {}) })
  };
}

function isAuthTokenError(message = '') {
  return /missing token|invalid token|session expired/i.test(message);
}

export async function loginWithPassword(baseUrl, credentials) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const detail = await responseMessage(response);
    const message = response.status === 401 ? 'Invalid username or password.' : detail || 'Could not sign in. Check that the API is running.';
    throw new Error(message);
  }

  return response.json();
}

export async function getPublicBranding(baseUrl) {
  const response = await fetch(`${baseUrl}/auth/branding`);
  if (!response.ok) return {};
  return response.json();
}

export async function registerChurchAccount(baseUrl, payload) {
  const response = await fetch(`${baseUrl}/auth/register-church`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await responseMessage(response) || 'Could not create the church account. Check that the API is running.');
  }

  return response.json();
}

async function responseMessage(response) {
  const text = await response.text();
  try {
    return JSON.parse(text).message || text;
  } catch {
    return text;
  }
}
