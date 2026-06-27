import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigin, port } from './config.js';
import { initDb } from './db.js';
import { router } from './routes.js';
import { seedIfEmpty } from './seed.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
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

app.listen(port, () => {
  console.log(`Church Care API running on port ${port}`);
});
