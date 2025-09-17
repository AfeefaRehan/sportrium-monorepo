//src/components/chat/ChatbotWidget
import { useEffect, useRef, useState } from "react";
// IMPORTANT: include the .jsx extension so Vite resolves it reliably
import Chatbot from "./Chatbot.jsx"; 

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const btn = document.getElementById("sportrium-chatbot-toggle");
        if (btn && btn.contains(e.target)) return;
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <>
      {/* Floating toggle button – layout ko touch nahi karta */}
      <button
        id="sportrium-chatbot-toggle"
        aria-label="Open chat"
        onClick={() => setOpen((v) => !v)}
        style={S.fab}
      >
        {open ? "×" : "💬"}
      </button>

      {open && (
        <div ref={panelRef} style={S.panel} role="dialog" aria-modal="true">
          <div style={S.header}>
            <strong>Sportrium Assistant</strong>
            <button onClick={() => setOpen(false)} style={S.close}>
              ×
            </button>
          </div>
          <div style={S.body}>
            {/* If you have an auth userId, pass it: <Chatbot userId={user?.id} /> */}
            <Chatbot />
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  fab: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 9999,
    height: 52,
    minWidth: 52,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid #ddd",
    background: "#fff",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: "52px",
  },
  panel: {
    position: "fixed",
    right: 20,
    bottom: 84,
    width: 420,
    maxWidth: "calc(100vw - 40px)",
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    borderRadius: 16,
    background: "#fff",
    border: "1px solid #e6e6e6",
    boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
    zIndex: 9999,
    overflow: "hidden",
  },
  header: {
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #eee",
  },
  close: {
    appearance: "none",
    background: "transparent",
    border: "none",
    fontSize: 22,
    cursor: "pointer",
    lineHeight: 1,
  },
  body: {
    padding: 12,
    overflow: "auto",
  },
};
