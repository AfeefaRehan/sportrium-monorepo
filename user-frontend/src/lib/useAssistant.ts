// user-frontend/src/lib/useAssistant.ts
import { useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

export function useAssistant(apiBase = import.meta.env.VITE_API_URL as string) {
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);

  async function send(text: string) {
    if (!text.trim() || isSending) return;

    setIsSending(true);
    setMessages((m) => [...m, { role: "user", text }]);

    // We’ll try a few possible backend routes; the first that returns { reply } wins.
    const candidates = [
      `${apiBase}/assistant/message`,
      `${apiBase}/chat`,
      `${apiBase}/chat/message`,
    ];

    let reply = "Oops, no reply.";
    try {
      for (const url of candidates) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // ✅ send session cookies (otherwise backend treats you as guest)
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        if (data && typeof data.reply === "string" && data.reply.trim()) {
          reply = data.reply;
          break;
        }
      }
    } catch (err) {
      console.error(err);
      reply = "Error: backend se connect nahi ho saka.";
    } finally {
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      setIsSending(false);
    }
  }

  return { messages, send, isSending };
}
