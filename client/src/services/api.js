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
