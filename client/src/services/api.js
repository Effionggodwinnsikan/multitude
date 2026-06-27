export function makeApi(token, baseUrl) {
  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  return {
    get: path => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path, body) => request(path, { method: 'DELETE', body: JSON.stringify(body || {}) })
  };
}

export async function loginWithPassword(baseUrl, credentials) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  if (!response.ok) {
    const message = response.status === 401 ? 'Invalid email or password.' : 'Could not sign in. Check that the API is running.';
    throw new Error(message);
  }

  return response.json();
}
