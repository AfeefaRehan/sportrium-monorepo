// src/components/layout/common/LiveMatchModal.jsx
import { useEffect, useRef, useState } from "react";
import "./livematchmodal.css";

const DEMO = {
  Basketball: {
    lineupTitle: "On court (5)",
    players: [
      { name: "A. Khan", role: "PG", pts: 14, threes: 3, ft: "4/5" },
      { name: "H. Ali", role: "SG", pts: 9,  threes: 2, ft: "1/1" },
      { name: "S. Ahmed", role: "SF", pts: 12, threes: 1, ft: "2/2" },
      { name: "M. Raza", role: "PF", pts: 7,  threes: 0, ft: "3/4" },
      { name: "U. Tariq", role: "C",  pts: 11, threes: 0, ft: "1/2" },
    ],
    cols: ["Player", "Pos", "PTS", "3PT", "FT"],
    row: (p) => [p.name, p.role, p.pts, p.threes, p.ft],
  },

  Football: {
    lineupTitle: "Starting XI",
    players: [
      { name: "G. Ahmed", role: "GK" },
      { name: "A. Shah",  role: "RB" },
      { name: "M. Tariq", role: "CB" },
      { name: "S. Ali",   role: "CB" },
      { name: "U. Khan",  role: "LB" },
      { name: "H. Raza",  role: "CM" },
      { name: "N. Qureshi", role: "CM" },
      { name: "A. Iqbal", role: "RM" },
      { name: "M. Bilal", role: "LM" },
      { name: "S. Javed", role: "ST", note: "1 goal" },
      { name: "T. Saeed", role: "ST" },
    ],
    cols: ["Player", "Pos", "Notes"],
    row: (p) => [p.name, p.role, p.note || "—"],
  },
};

export default function LiveMatchModal({
  match = {},
  onClose,
  onFollow,           // optional: returns boolean
  onToggleFollow,     // optional: returns boolean (new follow state)
  onBuy,
  followed = false,   // initial state from parent
}) {
  const sport  = match.sport || "Football";
  const model  = DEMO[sport] || DEMO.Football;
  const league = match.league || "League";
  const teams  = match.teams || `${match.home ?? "Home"} vs ${match.away ?? "Away"}`;
  const score  = match.score || "—";

  const followBtnRef = useRef(null);
  const [isFollowing, setIsFollowing] = useState(Boolean(followed || match.following));
  const [followBusy, setFollowBusy] = useState(false);

  // keep local UI in sync if parent changes
  useEffect(() => {
    setIsFollowing(Boolean(followed || match.following));
  }, [followed, match.following]);

  // accessibility: Esc to close, lock scroll, autofocus follow
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    const prevOverflow = document.documentElement.style.overflow;
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    const t = setTimeout(() => followBtnRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleFollowClick = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      // Ask parent to perform follow/unfollow.
      // Only update UI when parent confirms with a boolean.
      if (onToggleFollow) {
        const now = await onToggleFollow();
        if (typeof now === "boolean") setIsFollowing(now);
        return;
      }
      if (onFollow) {
        const res = await onFollow();
        if (typeof res === "boolean") setIsFollowing(res);
      }
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <div className="lm-overlay" onClick={onClose}>
      <div className="lm-card" onClick={(e) => e.stopPropagation()}>
        <button className="lm-close" onClick={onClose} aria-label="Close">×</button>

        <div className="lm-head">
          <div className="lm-league">{league}</div>
          <div id="lm-modal-title" className="lm-teams">{teams}</div>
          <div className="lm-score">{score}</div>
        </div>

        <div className="lm-lineup">
          <div className="lm-title">{model.lineupTitle}</div>

          {/* set CSS var so columns match the sport headers */}
          <div className="lm-table" style={{ "--cols": model.cols.length }}>
            <div className="lm-row lm-row-head">
              {model.cols.map((c) => <div key={c}>{c}</div>)}
            </div>

            {model.players.map((p, i) => (
              <div className="lm-row" key={i}>
                {model.row(p).map((cell, j) => <div key={j}>{cell}</div>)}
              </div>
            ))}
          </div>
        </div>

        <div className="lm-actions">
          {/* Follow / Following */}
          <button
            ref={followBtnRef}
            className={`btn lm-follow ${isFollowing ? "is-following" : ""}`}
            aria-pressed={isFollowing}
            onClick={handleFollowClick}
            disabled={followBusy}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>

          {/* Buy tickets */}
          <button
            className="btn btn-watch"
            onClick={() => (onBuy ? onBuy() : window.location.assign("/login"))}
          >
            Buy tickets
          </button>
        </div>
      </div>
    </div>
  );
}
