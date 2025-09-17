// user-frontend/src/components/chat/chatStore.js
import { nanoid } from "nanoid";
import { sendChat } from "./chatApi.js";

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
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot() {
      return { ...state, messages: [...state.messages] };
    },

    setOpen(v) {
      state.open = v;
      if (v && state.messages.length === 0) this.greet();
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

      state.messages.push({ id: nanoid(), role: "user", text });
      state.input = "";
      state.loading = true;
      state.error = "";
      notify();

      try {
        // Convert to LLM-style messages + new user turn
        const llmMsgs = state.messages.map((m) => ({
          role: m.role,
          content: m.text,
        }));
        const json = await sendChat(llmMsgs, user?.id);
        const reply = json?.reply || "Okay.";
        state.messages.push({ id: nanoid(), role: "assistant", text: reply });
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
