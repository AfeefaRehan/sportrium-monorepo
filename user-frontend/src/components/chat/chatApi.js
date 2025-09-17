// user-frontend/src/components/chat/chatApi.js
// Small, resilient client for POST /api/chat

const API_BASE =
  (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.replace(/\/$/, "")) ||
  "http://localhost:5000/api";

const SESSION_KEY = "sportrium_chat_session";

function getSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return String(Date.now());
  }
}

/**
 * sendChat(messagesOrText, userId?)
 * - messagesOrText: array of {role:'user'|'assistant', content:string} OR a single string
 * - userId: your logged-in user id (optional). We’ll fall back to a stable session id.
 * Returns: { reply: string, provider?: string }
 */
export async function sendChat(messagesOrText, userId) {
  const messages = Array.isArray(messagesOrText)
    ? messagesOrText
    : [{ role: "user", content: String(messagesOrText) }];

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || !String(last.content).trim()) {
    throw new Error("Empty message");
  }

  const payload = {
    messages,
    userId: userId || getSessionId(),
  };

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // If you are NOT using cookies/sessions, change to 'omit'
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }

  const json = await res.json();
  return {
    reply: json?.reply ?? json?.text ?? "",
    provider: json?.provider ?? "unknown",
  };
}
