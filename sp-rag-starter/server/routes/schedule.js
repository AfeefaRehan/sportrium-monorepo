import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data', 'schedule.json');

const router = Router();

function load(){
  try{ return JSON.parse(fs.readFileSync(DATA,'utf8')); }
  catch{ return []; }
}

router.get('/', (req, res) => {
  const all = load();
  const { city, sport, dateISO, status } = req.query;
  const out = all.filter(m => {
    if (city && m.city?.toLowerCase() !== String(city).toLowerCase()) return false;
    if (sport && m.sport?.toLowerCase() !== String(sport).toLowerCase()) return false;
    if (dateISO && m.dateISO !== dateISO) return false;
    if (status && m.status !== status) return false;
    return true;
  });
  res.json(out);
});

export default router;
