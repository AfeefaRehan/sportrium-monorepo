// user-frontend/src/components/chat/chatStore.js
import { nanoid } from "nanoid";
import { sendChat } from "@/lib/chatApi";

function createStore() {
  const state = {
    open: false,
    input: "",
    loading: false,
    error: "",
    messages: [], // { id, role: 'user'|'assistant', text }
  };

  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => fn());

  return {
    // subscriptions
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot() {
      return { ...state, messages: [...state.messages] };
    },

    // ui setters
    setOpen(v) {
      state.open = v;
      if (v) this.greet(); // greet on open
      notify();
    },
    setInput(v) {
      state.input = v;
      notify();
    },
    clearError() {
      state.error = "";
      notify();
    },

    greet() {
      state.messages = [
        { id: nanoid(), role: "assistant", text: "Welcome to Sportrium! 🤖" },
        { id: nanoid(), role: "assistant", text: "How may I help you today?" },
      ];
      state.input = "";
      state.error = "";
      notify();
    },

    async send(user) {
      const text = state.input.trim();
      if (!text || state.loading) return;

      // push user bubble
      state.messages.push({ id: nanoid(), role: "user", text });
      state.input = "";
      state.loading = true;
      state.error = "";
      notify();

      try {
        const json = await sendChat(text, user);
        const replies = json?.responses?.length
          ? json.responses
          : [{ type: "text", text: json?.text || "Okay." }];

        for (const r of replies) {
          if (r.type === "text") {
            state.messages.push({
              id: nanoid(),
              role: "assistant",
              text: r.text,
            });
          } else if (r.type === "match") {
            const line = `${r.title} • ${r.city}${
              r.venue ? " • " + r.venue : ""
            }${r.when ? " • " + r.when : ""}`;
            state.messages.push({ id: nanoid(), role: "assistant", text: line });
          }
        }
      } catch (e) {
        state.error = e.message || "Failed to reach assistant";
        state.messages.push({
          id: nanoid(),
          role: "assistant",
          text: "Sorry, I could not reach the assistant.",
        });
      } finally {
        state.loading = false;
        notify();
      }
    },
  };
}

export const chatStore = createStore();
