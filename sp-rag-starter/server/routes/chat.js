// sp-rag-starter/server/routes/chat.js
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { classify } from '../rag/intents.js';
import { retrieve } from '../rag/retriever.js';
import {
  answerMatches,
  answerTicketPrice,
  howToUse,
  sitePurpose,
  sportHistory,
  sportTraining,
  teamStrength,
  text,
} from '../rag/templates.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data', 'schedule.json');
const router = Router();

function loadSched() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
  catch { return []; }
}

router.post('/', async (req, res) => {
  const { message, user } = req.body || {};
  // 🔧 Accept common id shapes (id/uid/_id/userId)
  const userId = user?.id ?? user?.uid ?? user?._id ?? user?.userId ?? null;

  if (!userId) {
    return res.status(401).json({ error: 'Login required to use chat.' });
  }

  const intent = classify(message || '');

  if (intent.intent === 'find_matches') {
    const data = loadSched();
    const list = data.filter(m => {
      if (intent.city && m.city?.toLowerCase() !== intent.city) return false;
      if (intent.sport && m.sport?.toLowerCase() !== intent.sport) return false;
      if (intent.dateISO && m.dateISO !== intent.dateISO) return false;
      return true;
    });
    return res.json({
      intent,
      responses: answerMatches(list, intent.city, intent.sport, intent.dateISO),
    });
  }

  if (intent.intent === 'ticket_price') {
    const data = loadSched();
    const upcoming = data
      .filter(m => new Date(`${m.dateISO}T${m.timeLocal}`) > new Date())
      .sort((a, b) => (a.dateISO + a.timeLocal).localeCompare(b.dateISO + b.timeLocal));
    const pick = upcoming[0] || data[0];
    return res.json({
      intent,
      responses: pick ? answerTicketPrice(pick) : [text('Ticket info is TBA.')],
    });
  }

  if (intent.intent === 'how_to_use')   return res.json({ intent, responses: howToUse() });
  if (intent.intent === 'site_purpose') return res.json({ intent, responses: sitePurpose() });
  if (intent.intent === 'sport_history') return res.json({ intent, responses: sportHistory(intent.sport) });
  if (intent.intent === 'sport_training')return res.json({ intent, responses: sportTraining(intent.sport) });
  if (intent.intent === 'team_strength') return res.json({ intent, responses: teamStrength() });

  // Fallback to RAG
  const hits = retrieve(message || '', 3);
  if (hits.length) {
    const top = hits[0];
    return res.json({
      intent: { intent: 'rag_answer' },
      responses: [text(top.text.slice(0, 600) + (top.text.length > 600 ? '…' : ''))],
    });
  }

  return res.json({
    intent: { intent: 'unknown' },
    responses: [text('Samajh nahi aaya — aap city/sport/date batayen, ya Schedule page dekhein.')],
  });
});

export default router;
