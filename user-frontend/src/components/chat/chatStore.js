// user-frontend/src/components/chat/chatStore.js
import { nanoid } from "nanoid";
import { sendChat } from "@/lib/chatApi";

// ---- internal reactive state ----
const state = {
  open: false,
  input: "",
  loading: false,
  error: "",
  messages: [], // { id, role: 'user'|'assistant', text }
};

const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

// react-friendly snapshot (new object identity every time)
function snapshot() {
  return {
    ...state,
    messages: [...state.messages],
  };
}

export const chatStore = {
  // subscriptions for React
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot() {
    return snapshot();
  },

  // ui state
  setOpen(v) {
    state.open = v;
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

  // greeting when panel opens
  greet() {
    state.messages = [
      { id: nanoid(), role: "assistant", text: "Welcome to Sportrium! 🤖" },
      { id: nanoid(), role: "assistant", text: "How may I help you today?" },
    ];
    state.input = "";
    state.error = "";
    notify();
  },

  // send message to backend
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
      // call your API (must include a user id)
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
        } else {
          state.messages.push({
            id: nanoid(),
            role: "assistant",
            text: "[Unsupported response]",
          });
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
