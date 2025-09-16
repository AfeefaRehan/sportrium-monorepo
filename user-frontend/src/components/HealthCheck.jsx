import { useState } from 'react';
import { httpGet } from '@/lib/http';
import { getApiBase } from '@/lib/env';

const CANDIDATE_PATHS = ['/health', '/ping', '/']; // tries in order

export default function HealthCheck() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const apiBase = getApiBase();

  async function run() {
    setStatus(null);
    setError(null);

    for (const p of CANDIDATE_PATHS) {
      try {
        const data = await httpGet(p);
        setStatus({ pathTried: p, data });
        return;
      } catch (e) {
        setError(e.message);
      }
    }
  }

  return (
    <div style={S.card}>
      <h2 style={S.h2}>API Health</h2>
      <p style={S.mono}>Base: {apiBase}</p>
      <button onClick={run} style={S.btn}>Test API</button>

      {status && (
        <pre style={S.pre}>
{JSON.stringify({ ok: true, tried: status.pathTried, data: status.data }, null, 2)}
        </pre>
      )}

      {error && (
        <div style={S.err}>
          <strong>Last error:</strong>
          <pre style={S.pre}>{error}</pre>
          <p>
            If the browser console shows a CORS block, set&nbsp;
            <code style={S.code}>FRONTEND_ORIGIN=http://localhost:5173</code>
            &nbsp;in your backend env and restart backend.
          </p>
        </div>
      )}
    </div>
  );
}

const S = {
  card: { padding: 16, borderRadius: 16, boxShadow: '0 8px 20px rgba(0,0,0,0.08)', background: '#fff' },
  h2: { margin: '0 0 8px' },
  pre: { background: '#f7f7f7', padding: 12, borderRadius: 8, maxHeight: 280, overflow: 'auto' },
  mono: { fontFamily: 'ui-monospace, Menlo, monospace', color: '#666' },
  code: { background: '#f2f2f2', padding: '2px 6px', borderRadius: 6, marginLeft: 6 },
  btn: { padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', cursor: 'pointer' },
  err: { marginTop: 12, color: '#b00020' },
};
