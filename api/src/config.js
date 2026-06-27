const defaultClientOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const port = process.env.PORT || 4000;
export const allowedOrigins = unique([
  ...defaultClientOrigins,
  ...splitEnv(process.env.CLIENT_ORIGIN)
]);

export function corsOrigin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
}

function splitEnv(value) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}
