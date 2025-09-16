export function cardMatch(m){
  const when = new Date(`${m.dateISO}T${m.timeLocal}`);
  const time = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = when.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
  const fee = m.entryFee ?? 'TBA/Free';
  return {
    type: 'match-card',
    title: `${m.teams?.[0]} vs ${m.teams?.[1]}`,
    subtitle: `${date} • ${time}`,
    meta: `${m.city} · ${m.venue}`,
    chips: [m.sport, fee],
    link: `/events/${m.id || ''}`
  };
}

export function text(s){ return { type:'text', text: s }; }

export function answerMatches(list, city, sport, dateISO){
  if (!list.length){
    let line = 'Is filter pe koi match nahi mila.';
    if (city) line += ` City: ${city}.`;
    if (sport) line += ` Sport: ${sport}.`;
    if (dateISO) line += ` Date: ${dateISO}.`;
    return [text(line + ' Aap date ya city change karke try karein, ya Schedule page dekhein.' )];
  }
  const lead = text(`Ye rahe ${list.length} match(es)${city?` in ${city}`:''}${sport?` • ${sport}`:''}${dateISO?` • ${dateISO}`:''}:`);
  return [lead, ...list.slice(0,5).map(cardMatch)];
}

export function answerTicketPrice(m){
  const fee = m?.entryFee ?? 'TBA/Free';
  return [text(`Is match ki entry: **${fee}**. Final price gate pe confirm hota hai. Directions aur details event page par.`), cardMatch(m)];
}

export function howToUse(){
  return [text('Use ka tareeqa: Schedule me apni city/sport/date select karein, match card par "Remind me" ya "Buy tickets" dabayein. Teams tab se apni team create kar ke tournaments me apply karein.')];
}
export function sitePurpose(){
  return [text('Sportrium ka point: community sports ko asaan banana — fixtures dekhna, live stream, teams join/host, aur tickets handle karna ek jagah.')];
}

export function sportHistory(s){ 
  return [text(`Short history of ${s}: (concise, neutral) — origins, basic evolution, Pakistan context. Details app ke Knowledge section me.`)]; 
}
export function sportTraining(s){
  return [text(`Training basics for ${s}: warm-up, skills drills, small-sided games, and rest between sessions. Health/medical advice nahi; coach/safe practice follow karein.`)];
}
export function teamStrength(){
  return [text('Team ko strong banane ke liye: clear roles, communication drills, regular practice schedule, simple tactics, aur post-match review. Health/medical tips provide nahi ki jati.')];
}
