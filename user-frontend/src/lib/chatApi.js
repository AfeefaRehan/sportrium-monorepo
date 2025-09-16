// user-frontend/src/lib/chatApi.js
export async function sendChat(message, user) {
  const base = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
  const url = `${base}/chat`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // IMPORTANT: do NOT send cookies; we pass just a minimal user id.
    body: JSON.stringify({ message, user: user ? { id: user.id } : null }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Request failed');
    throw new Error(msg);
  }
  return res.json(); // { intent, responses: [...] }
}
