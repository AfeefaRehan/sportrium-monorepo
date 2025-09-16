# Sportrium — RAG + Lightweight Router (Starter)

This is a tiny Node/Express service that powers your chatbot:
- **Guest gate**: rejects chat if user is not logged in (401).
- **Intents**: find matches, ticket price, how to use, site purpose, sport history, sport training, team strength.
- **RAG-lite**: TF‑IDF over markdown files in `server/data/knowledge` (no external vector DB).
- **Schedule API**: `/api/schedule` filters by `city`, `sport`, `dateISO`.
- **Chat API**: `/api/chat` expects `{ message, user: { id } }`.

## Run
```bash
cd server
npm i
npm run dev
# server at http://localhost:8787
```

## Frontend wiring (React)
- Base URL: `VITE_API_BASE=http://localhost:8787`
- Call chat:
```js
// /src/lib/chatApi.js
export async function sendChat(message, user) {
  const res = await fetch(import.meta.env.VITE_API_BASE + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, user: { id: user.id } })
  });
  if (!res.ok) throw new Error('Chat error');
  return res.json(); // { intent, responses: [...] }
}
```

- Example in your ChatbotWidget:
```jsx
// ensure widget hidden for guests; call sendChat on submit
if (!user) return null; // or show login CTA
```

## Data
- Edit `server/data/schedule.json` or replace with your DB later.
- Add/change knowledge files in `server/data/knowledge/*.md` and restart.

## Responses
Chat returns an array of `responses` where each item can be:
- `{ type: 'text', text: string }`
- `{ type: 'match-card', title, subtitle, meta, chips:[], link }`

Render these in the UI as chat bubbles/cards.
