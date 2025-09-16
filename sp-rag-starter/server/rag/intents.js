import dayjs from 'dayjs';

const cities = ['karachi','lahore','islamabad','peshawar','faisalabad','multan','quetta','rawalpindi','sialkot','hyderabad'];
const sports = ['football','cricket','basketball','badminton','tennis','volleyball'];

const DATE_WORDS = {
  'aaj': 0, 'today': 0,
  'kal': 1, 'tomorrow': 1,
  'parso': 2, 'day after': 2,
  'ishafte': 0, 'weekend': 0
};

function norm(s){ return String(s||'').toLowerCase().trim(); }

export function classify(message){
  const q = norm(message);
  if (/(how to use|kaise (ist[e]mal|use)|kese use|help|guide)/i.test(q)) return { intent: 'how_to_use' };
  if (/(what is this|website (kis|kya)|purpose|point)/i.test(q)) return { intent: 'site_purpose' };
  if (/(ticket|entry|fee|charges|qeemat|kiraya)/i.test(q)) return { intent: 'ticket_price' };

  for (const s of sports){
    if (new RegExp(`(history|tareekh).*${s}|${s}.*(history|tareekh)`).test(q)) return { intent: 'sport_history', sport: s };
  }
  for (const s of sports){
    if (new RegExp(`(training|drills|practice|kese (sikhen|behter)|improve).*${s}|${s}.*(training|drills|practice)`).test(q))
      return { intent: 'sport_training', sport: s };
  }
  if (/(team|squad).*(strong|behter|improve|chemistry|strategy)/i.test(q)) return { intent: 'team_strength' };

  if (/(match|fixture|schedule)/i.test(q) || /(kon sa|konsa).*match/.test(q)){
    let city = cities.find(c => q.includes(c));
    let sport = sports.find(s => q.includes(s));
    let dayOffset = null;
    for (const k in DATE_WORDS){
      if (q.includes(k)){ dayOffset = DATE_WORDS[k]; break; }
    }
    const dateISO = dayOffset===null ? null : dayjs().add(dayOffset,'day').format('YYYY-MM-DD');
    return { intent: 'find_matches', city, sport, dateISO };
  }
  let city = cities.find(c => q.includes(c));
  let sport = sports.find(s => q.includes(s));
  if (city || sport) return { intent: 'find_matches', city, sport, dateISO: null };

  return { intent: 'chit_chat' };
}
