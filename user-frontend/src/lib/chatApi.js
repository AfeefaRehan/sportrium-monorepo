// user-frontend/src/lib/chatApi.js
export async function sendChat(message, user) {
  // 🔧 Normalize the user id coming from any auth provider shape
  const userId =
    user?.id ?? user?.uid ?? user?._id ?? user?.userId ?? user?.profileId ?? null;

  const res = await fetch(`${import.meta.env.VITE_API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      user: userId ? { id: String(userId) } : null,
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Request failed');
    throw new Error(msg);
  }
  return res.json();
}
