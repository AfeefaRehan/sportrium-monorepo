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
  try {
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch {
    return [];
  }
}

router.post('/', async (req, res) => {
  // Accept user id from cookie/middleware OR JSON body
  const uid =
    (req.user && req.user.id) ||
    (req.body && req.body.user && req.body.user.id) ||
    null;

  const message = (req.body?.message || '').toString().slice(0, 2000);

  if (!uid) {
    return res.status(401).json({ error: 'Login required to use chat.' });
  }

  // Basic guard against empty messages
  if (!message.trim()) {
    return res.json({ intent: { intent: 'empty' }, responses: [text('Please type a question.')] });
  }

  const intent = classify(message);

  /* -------------------- Find matches -------------------- */
  if (intent.intent === 'find_matches') {
    const data = loadSched();
    const city = intent.city?.toLowerCase() || null;
    const sport = intent.sport?.toLowerCase() || null;

    const list = data.filter((m) => {
      if (city && (m.city || '').toLowerCase() !== city) return false;
      if (sport && (m.sport || '').toLowerCase() !== sport) return false;
      if (intent.dateISO && m.dateISO !== intent.dateISO) return false;
      return true;
    });

    return res.json({
      intent,
      responses: answerMatches(list, intent.city, intent.sport, intent.dateISO),
    });
  }

  /* -------------------- Ticket price -------------------- */
  if (intent.intent === 'ticket_price') {
    const data = loadSched();
    const upcoming = data
      .filter((m) => new Date(`${m.dateISO}T${m.timeLocal}`) > new Date())
      .sort((a, b) => (a.dateISO + a.timeLocal).localeCompare(b.dateISO + b.timeLocal));
    const pick = upcoming[0] || data[0];

    return res.json({
      intent,
      responses: pick ? answerTicketPrice(pick) : [text('Ticket info is TBA.')],
    });
  }

  /* --------------- How to use / site purpose ------------- */
  if (intent.intent === 'how_to_use') {
    return res.json({ intent, responses: howToUse() });
  }
  if (intent.intent === 'site_purpose') {
    return res.json({ intent, responses: sitePurpose() });
  }

  /* ----------------- Sport knowledge Qs ------------------ */
  if (intent.intent === 'sport_history') {
    return res.json({ intent, responses: sportHistory(intent.sport) });
  }
  if (intent.intent === 'sport_training') {
    return res.json({ intent, responses: sportTraining(intent.sport) });
  }
  if (intent.intent === 'team_strength') {
    return res.json({ intent, responses: teamStrength() });
  }

  /* -------------------- Fallback to RAG ------------------ */
  const hits = retrieve(message, 3);
  if (hits.length) {
    const top = hits[0];
    const snippet = top.text.slice(0, 600) + (top.text.length > 600 ? '…' : '');
    return res.json({
      intent: { intent: 'rag_answer' },
      responses: [text(snippet)],
    });
  }

  /* ------------------- Default unknown ------------------- */
  return res.json({
    intent: { intent: 'unknown' },
    responses: [text('Samajh nahi aaya — aap city/sport/date batayen, ya Schedule page dekhein.')],
  });
});

export default router;
