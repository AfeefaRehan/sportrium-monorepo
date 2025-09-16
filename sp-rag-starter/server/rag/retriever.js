import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const state = { docs: [], df: {}, idf: {}, ready: false };

const STOP = new Set([
  'the','a','an','and','or','to','of','in','on','for','with','is','are','was','were',
  'hai','hain','ka','ki','ke','mein','me','ko','se','kaisa','kya','kyun','jo','ye','wo',
  'this','that','at','as','by','be','it','from','you','your','hum','ham','ap','apka','apki'
]);

function tokenize(s=''){
  return String(s).toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/g)
    .filter(t=>t && !STOP.has(t) && t.length>1);
}

function buildTF(tokens){
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t]||0)+1;
  let norm = 0;
  for (const t in tf) norm += tf[t]*tf[t];
  norm = Math.sqrt(norm) || 1;
  return { tf, norm };
}

export async function loadKnowledge() {
  const kDir = path.join(__dirname, '..', 'data', 'knowledge');
  let entries = [];
  try { entries = fs.readdirSync(kDir).filter(f => f.endsWith('.md')); } catch {}
  state.docs = [];
  state.df = {};
  for (const file of entries) {
    const text = fs.readFileSync(path.join(kDir, file), 'utf8');
    const title = file.replace(/\.md$/, '').replace(/[-_]/g, ' ');
    const tokens = tokenize(text + ' ' + title);
    const { tf, norm } = buildTF(tokens);
    state.docs.push({ id: file, title, text, tokens, tf, norm });
    for (const t of new Set(tokens)) state.df[t] = (state.df[t]||0)+1;
  }
  const N = state.docs.length || 1;
  state.idf = {};
  for (const term in state.df) {
    state.idf[term] = Math.log( (N + 1) / (state.df[term] + 1) ) + 1;
  }
  state.ready = true;
  console.log('[RAG] Loaded docs:', entries.length);
}

export function retrieve(query, k=3){
  if (!state.ready) return [];
  const qTokens = tokenize(query);
  const { tf: qtf } = buildTF(qTokens);
  let qnorm = 0;
  const qvec = {};
  for (const t in qtf){
    const w = (qtf[t] * (state.idf[t]||1));
    qvec[t] = w;
    qnorm += w*w;
  }
  qnorm = Math.sqrt(qnorm) || 1;

  const scores = state.docs.map(d => {
    let dot = 0;
    for (const t in qvec){
      const wq = qvec[t];
      const wd = (d.tf[t]||0) * (state.idf[t]||1);
      if (wd) dot += wq * wd;
    }
    const dnormIDF = Math.sqrt(Object.entries(d.tf).reduce((sum,[t,c]) => {
      const w = c*(state.idf[t]||1);
      return sum + w*w;
    }, 0)) || 1;
    const score = dot / (qnorm * dnormIDF);
    return { id: d.id, title: d.title, text: d.text, score };
  });

  return scores.sort((a,b)=>b.score-a.score).slice(0,k).filter(s => s.score>0.05);
}
