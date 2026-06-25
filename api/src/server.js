import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { initDb } from './db.js';
import { router } from './routes.js';
import { seedIfEmpty } from './seed.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const host = process.env.HOST || '127.0.0.1';

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', router);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong', detail: process.env.NODE_ENV === 'production' ? undefined : error.message });
});

await initDb();
await seedIfEmpty();

app.listen(port, host, () => {
  console.log(`Church Care API running on http://${host}:${port}`);
});
