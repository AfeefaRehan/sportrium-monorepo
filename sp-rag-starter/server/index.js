// sp-rag-starter/server/index.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

import { loadKnowledge } from './rag/retriever.js';
import chatRouter from './routes/chat.js';
import scheduleRouter from './routes/schedule.js';

const app = express();
const PORT = process.env.PORT || 8787;

/* ---------------- CORS (dev) ----------------
   We allow only the Vite front-end (5173) and
   we DO NOT use cookies (credentials=false).
   The front-end will pass { user: { id } } in the body.
------------------------------------------------ */
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: ORIGIN,                // not "*"
    credentials: false,            // no cookies for chat
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
// Preflight
app.options('*', cors({ origin: ORIGIN, credentials: false }));

/* ------------ Common middleware ------------ */
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

/* --------- Load knowledge base (boot) ------- */
await loadKnowledge();

/* ----------------- Routes ------------------- */
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/chat', chatRouter);
app.use('/api/schedule', scheduleRouter);

/* --------------- Error handler -------------- */
app.use((err, req, res, next) => {
  console.error('ERR', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

/* ----------------- Start -------------------- */
app.listen(PORT, () => {
  console.log(`RAG server on http://localhost:${PORT}`);
});
