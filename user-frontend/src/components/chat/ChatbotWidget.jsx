// user-frontend/src/components/chat/ChatbotWidget.jsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { chatStore } from "./chatStore";
import "@/styles/chatbot.css";

/* Robot icon */
function RobotHeadIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="robot-icon">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="var(--chat-blue)"/>
          <stop offset="55%" stopColor="var(--chat-red)"/>
          <stop offset="100%" stopColor="var(--chat-green)"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#ringGrad)"/>
      <circle cx="32" cy="32" r="24" fill="#ffffff"/>
      <circle cx="32" cy="14" r="3" fill="url(#ringGrad)"/>
      <rect x="31" y="16" width="2" height="6" rx="1" fill="url(#ringGrad)"/>
      <rect x="18" y="24" width="28" height="20" rx="10" fill="url(#ringGrad)"/>
      <rect x="22" y="28" width="20" height="12" rx="6" fill="#ffffff"/>
      <circle cx="28" cy="34" r="2.5" fill="url(#ringGrad)"/>
      <circle cx="38" cy="34" r="2.5" fill="url(#ringGrad)"/>
      <path d="M29 38c1.8 2 4.2 2 6 0" stroke="url(#ringGrad)" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

export default function ChatbotWidget() {
  const { user } = useAuth();

  // 🔒 Guests cannot use the chatbot — hide completely when logged out
  if (!user) return null;

  const [state, setState] = useState(chatStore.getSnapshot());
  useEffect(() => chatStore.subscribe(() => setState(chatStore.getSnapshot())), []);

  const panelRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!state.open) return;
    const onClick = (e) => {
      if (!panelRef.current) return;
      const inside = panelRef.current.contains(e.target);
      const launcher = document.querySelector(".chat-launcher");
      const onLauncher = launcher && launcher.contains(e.target);
      if (!inside && !onLauncher) chatStore.setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [state.open]);

  // Close on scroll
  useEffect(() => {
    if (!state.open) return;
    const onScroll = () => chatStore.setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [state.open]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [state.messages]);

  const onSubmit = (e) => {
    e.preventDefault();
    chatStore.send(user);
  };

  return (
    <>
      {state.open && (
        <div className="chat-panel" ref={panelRef} role="dialog" aria-label="Sportrium Assistant">
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="chat-avatar"><RobotHeadIcon size={22} /></div>
              <div className="chat-title">
                <strong>Sportrium Assistant</strong>
                <span>Online · happy to help</span>
              </div>
            </div>
            <button className="chat-close" onClick={() => chatStore.setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div ref={listRef} className="chat-body" role="log" aria-live="polite">
            {state.messages.map((m) => (
              <div key={m.id} className={`msg ${m.role}`}>{m.text}</div>
            ))}
            {state.loading && <div className="msg assistant">Typing…</div>}
          </div>

          <form className="chat-input-row" onSubmit={onSubmit}>
            <input
              className="chat-input"
              placeholder="Ask about matches…"
              value={state.input}
              onChange={(e) => chatStore.setInput(e.target.value)}
              disabled={state.loading}
            />
            <button className="chat-send" aria-label="Send" disabled={state.loading}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" fill="white" />
              </svg>
            </button>
          </form>

          {state.error && <div className="err">{state.error}</div>}
        </div>
      )}

      <button className="chat-launcher" aria-label="Open chat" onClick={() => chatStore.setOpen(true)}>
        <RobotHeadIcon size={28} />
      </button>
    </>
  );
}
