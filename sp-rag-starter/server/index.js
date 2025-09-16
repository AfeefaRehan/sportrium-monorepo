// sp-rag-starter/server/index.js
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { loadKnowledge } from './rag/retriever.js';
import chatRouter from './routes/chat.js';
import scheduleRouter from './routes/schedule.js';

const app = express();
const PORT = process.env.PORT || 8787;

// 🔧 CORS: explicitly allow Vite dev origin
app.use(cors({ origin: 'http://localhost:5173' }));

app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

await loadKnowledge();

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/chat', chatRouter);
app.use('/api/schedule', scheduleRouter);

// error handler
app.use((err, req, res, next) => {
  console.error('ERR', err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => console.log(`RAG server on http://localhost:${PORT}`));
