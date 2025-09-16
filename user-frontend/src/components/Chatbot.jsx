import { useEffect, useRef, useState } from 'react';
import { sendChat } from './chatApi';

export default function Chatbot({ userId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Sportrium's assistant. Ask me about matches, teams, or events." },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send() {
    const content = input.trim();
    if (!content || busy) return;

    setError(null);
    setBusy(true);
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');

    try {
      const res = await sendChat(next, userId);
      // expecting { reply } OR { message: {role,content} } OR plain string
      const reply =
        typeof res === 'object' && res
          ? (res.reply || res.message?.content || JSON.stringify(res))
          : String(res);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e.message);
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
  }

  return (
    <div style={S.wrapper}>
      <div style={S.thread}>
        {messages.map((m, i) => (
          <div key={i} style={{ ...S.msg, ...(m.role === 'user' ? S.user : S.assistant) }}>
            <div style={S.role}>{m.role}</div>
            <div>{m.content}</div>
          </div>
        ))}
        {busy && <div style={S.busy}>Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div style={S.row}>
        <input
          style={S.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask something… (Ctrl/Cmd+Enter to send)"
        />
        <button style={S.btn} onClick={send} disabled={busy || !input.trim()}>
          Send
        </button>
      </div>

      {error && (
        <div style={S.err}>
          <strong>Request failed:</strong>
          <pre style={S.pre}>{error}</pre>
          <p>
            Common causes:<br/>
            • 404 → backend route not found (we’ll add <code style={S.code}>POST /api/chat</code>)<br/>
            • CORS → backend must allow <code style={S.code}>http://localhost:5173</code><br/>
            • 500 → model keys/files not loaded (we’ll fix in backend step)
          </p>
        </div>
      )}
    </div>
  );
}

const S = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 10 },
  thread: { display: 'flex', flexDirection: 'column', gap: 12, padding: 12, background: '#fafafa', borderRadius: 12, maxHeight: 360, overflow: 'auto' },
  msg: { borderRadius: 12, padding: 12, lineHeight: 1.35, display: 'grid', gridTemplateColumns: '70px 1fr', gap: 8, alignItems: 'start' },
  role: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: '#666' },
  user: { background: '#eef6ff', border: '1px solid #d6e6ff' },
  assistant: { background: '#f3f3f3', border: '1px solid #e8e8e8' },
  busy: { padding: 8, borderRadius: 8, background: '#fff7e6', border: '1px solid #ffe0a6', width: 'fit-content' },
  row: { display: 'flex', gap: 8, marginTop: 4 },
  input: { flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid #ddd' },
  btn: { padding: '10px 14px', borderRadius: 12, border: '1px solid #ddd', cursor: 'pointer' },
  pre: { background: '#f7f7f7', padding: 12, borderRadius: 8, maxWidth: '100%', overflowX: 'auto' },
  code: { background: '#f2f2f2', padding: '2px 6px', borderRadius: 6, marginLeft: 6 },
  err: { marginTop: 8, color: '#b00020' },
};
