// src/components/layout/common/NewsMatchModal.jsx
import { useEffect } from "react";

function defaultRequirements(sport = "") {
  const s = sport.toLowerCase();
  if (s.includes("cricket"))
    return ["T20: 20 overs per side", "Max 4 overs per bowler", "Powerplay first 6 overs", "Tie → Super Over"];
  if (s.includes("basket"))
    return ["4 quarters × 10 min (FIBA)", "5 players on court", "24s shot clock", "Personal/team fouls apply"];
  if (s.includes("tennis"))
    return ["Best of 3 sets", "Tie-break at 6–6", "Win by 2 clear points", "Let rule on serve (event rules)"];
  // default (football)
  return ["90 minutes (2×45)", "11 players per side", "Yellow/Red cards", "Offside rule applies"];
}

export default function NewsMatchModal({ item = {}, onClose }) {
  const {
    title = "Match report",
    league = "League",
    sport = "Football",
    teams = "",
    score = "",
    city = "",
    venue = "",
    highlights = [],
    requirements = defaultRequirements(sport),
  } = item;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    const prev = document.documentElement.style.overflow;
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="newsx-overlay" onClick={onClose}>
      <div
        className="newsx-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsx-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="newsx-close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <header className="newsx-header">
          <div className="newsx-kicker">{league} · {sport}</div>
          <h3 id="newsx-title" className="newsx-title">{teams || title}</h3>
          {score && <div className="newsx-score">{score}</div>}
          <div className="newsx-sub">{[city, venue].filter(Boolean).join(" · ")}</div>
        </header>

        <div className="newsx-grid">
          <section>
            <h4>Highlights</h4>
            {highlights?.length ? (
              <ul className="newsx-list">{highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
            ) : (
              <p className="newsx-empty">No extra highlights provided.</p>
            )}
          </section>

          <section>
            <h4>Game Basics</h4>
            <ul className="newsx-list">{requirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </section>
        </div>
      </div>

      {/* SCOPED STYLES (no global CSS needed) */}
      <style>{`
        .newsx-overlay{
          position:fixed; inset:0; z-index:9999;
          background: rgba(15, 23, 42, .45);
          backdrop-filter: blur(2px);
          display:grid; place-items:center;
          animation: newsx-fade .15s ease-out;
        }
        .newsx-card{
          position: relative;
          width:min(92vw, 820px);
          max-height: 86vh;
          overflow:auto;
          border-radius: 18px;
          background: #ffffff;
          color: #0f172a;
          box-shadow: 0 24px 80px rgba(0,0,0,.25);
          padding: 22px 22px 18px;
          animation: newsx-pop .18s cubic-bezier(.2,.8,.2,1);
        }
        .newsx-close{
          position:absolute; top:10px; right:10px;
          width:36px; height:36px;
          border:0; border-radius:999px;
          display:grid; place-items:center;
          background:#f1f5f9; color:#0f172a; cursor:pointer;
        }
        .newsx-close:hover{ background:#e2e8f0; }
        .newsx-header{ margin:4px 0 10px; }
        .newsx-kicker{ font-weight:800; opacity:.7; margin-bottom:2px; }
        .newsx-title{ margin:0; font-size:22px; font-weight:900; line-height:1.25; }
        .newsx-score{ margin-top:4px; font-size:20px; font-weight:900; color:#0b5; }
        .newsx-sub{ opacity:.75; margin-top:2px; }

        .newsx-grid{
          display:grid; grid-template-columns: 1fr 1fr; gap:18px; margin-top:14px;
        }
        .newsx-list{ margin:6px 0 0 18px; display:grid; gap:6px; }
        .newsx-empty{ opacity:.7; margin:6px 0 0; }
        h4{ margin:6px 0; font-weight:900; }

        @keyframes newsx-pop{ from{ transform:scale(.97); opacity:0 } to{ transform:scale(1); opacity:1 } }
        @keyframes newsx-fade{ from{ opacity:0 } to{ opacity:1 } }

        @media (max-width:720px){
          .newsx-grid{ grid-template-columns: 1fr; }
          .newsx-card{ width: min(96vw, 560px); }
        }
      `}</style>
    </div>
  );
}
