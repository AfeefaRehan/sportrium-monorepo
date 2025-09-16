// user-frontend/src/lib/useAssistant.ts
import { useState } from "react";

export function useAssistant(apiBase = import.meta.env.VITE_API_URL) {
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<{role:"user"|"assistant", text:string}[]>([]);

  async function send(text: string) {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    setMessages(m => [...m, {role:"user", text}]);
    try {
      const r = await fetch(`${apiBase}/assistant/message`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ message: text })
      });
      const data = await r.json();
      setMessages(m => [...m, {role:"assistant", text: data.reply ?? "Oops, no reply."}]);
    } finally {
      setIsSending(false);
    }
  }

  return { messages, send, isSending };
}
