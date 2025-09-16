// src/pages/Live.jsx
import "./live.css";
import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext.jsx";
import { useReminders } from "@/context/RemindersContext.jsx";

import Ticker from "../components/layout/Ticker";
import TrendingPanel from "../components/layout/TrendingPanel";
import CityCarousel from "../components/layout/CityCarousel";
import UpcomingCarousel from "../components/layout/UpcomingCarousel";
import LiveMatchModal from "../components/layout/common/LiveMatchModal";
import NewsMatchModal from "../components/layout/common/NewsMatchModal";

/* ---------------- LoginGate Modal (your style) ---------------- */
function LoginGateModal({ open, message, onClose, onConfirm }) {
  const primaryRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => primaryRef.current?.focus(), 0);
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-gate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
            </svg>
          </div>
          <h3 id="login-gate-title">Login required</h3>
        </div>

        <p className="modal-body">{message || "Please log in to continue."}</p>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn blue" ref={primaryRef} onClick={onConfirm}>
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------- helpers you already use + small additions -------- */
const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const readProfile = () => {
  try { return JSON.parse(localStorage.getItem("profile")) || {}; }
  catch { return {}; }
};
const writeProfile = (obj) => {
  try {
    localStorage.setItem("profile", JSON.stringify(obj));
    window.dispatchEvent(new Event("storage"));
  } catch {}
};

const getFollowSet = () =>
  new Set((readProfile().followedTeams || []).map(String));

/* helper: build reminder payload */
function buildReminderFrom(item) {
  const kickoff =
    item.startISO ||
    item.kickoffISO ||
    (() => {
      const d = new Date();
      d.setHours(d.getHours() + 2, 0, 0, 0);
      return d.toISOString();
    })();
  const title = item.title || item.teams || `${item.home ?? "Home"} vs ${item.away ?? "Away"}`;
  return {
    id: `live-${item.id ?? title.replace(/\s+/g, "-").toLowerCase()}-${kickoff}`,
    title,
    startISO: kickoff,
    league: item.league || item.competition || "Match",
    sport: item.sport || "Football",
    city: item.city || "",
    venue: item.venue || "",
  };
}

const teamIdFrom = (item) =>
  item?.teamId ||
  item?.homeTeamId ||
  item?.teamAId ||
  slug(item?.teams || item?.title || String(item?.id || ""));

/* -------- intent persistence for post-login auto-resume -------- */
const PENDING_KEY = "pending-live-intent";

const setPendingIntent = (intent) => {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(intent)); } catch {}
};
const getPendingIntent = () => {
  try { return JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null"); }
  catch { return null; }
};
const clearPendingIntent = () => {
  try { sessionStorage.removeItem(PENDING_KEY); } catch {}
};

/* ----------------------------- Page ----------------------------- */
export default function Live() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { addReminder } = useReminders();
  const base = import.meta.env.BASE_URL || "/";

  // login modal state
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMsg, setGateMsg] = useState("Please log in to continue.");
  const promptLogin = (msg) => { setGateMsg(msg || "Please log in to continue."); setGateOpen(true); };
  const confirmLogin = () => {
    setGateOpen(false);
    nav("/login");
  };

  // tiny top toast
  const [toast, setToast] = useState("");
  const showToast = (msg) => { setToast(msg); window.clearTimeout(showToast._t); showToast._t = setTimeout(() => setToast(""), 1600); };

  // Ticker (Pakistan cities)
  const tickerMatches = useMemo(
    () => [
      { city: "Karachi", text: "Eagles vs Sharks · 1–0" },
      { city: "Lahore", text: "Falcons vs Wolves · 78–72" },
      { city: "Islamabad", text: "Spikers vs Smashers · 19–17" },
      { city: "Rawalpindi", text: "Titans vs Kings · 3–2" },
    ],
    []
  );

  // Pakistan-focused news (with structured fields for the modal)
  const pkNews = useMemo(
    () => [
      { id: 901, title: "Kashmir Premier League: Muzaffarabad Tigers edge Rawalakot 7–6 in nail-biter", meta: "Pakistan · 1h ago", league: "KPL", sport: "Cricket (T20)", teams: "Muzaffarabad Tigers vs Rawalakot", score: "Tigers 7–6 (last over)", city: "Muzaffarabad", venue: "AJK Stadium", highlights: ["Decided in the last over", "MoM: S. Khan 41*(23)", "Economical spell: U. Tariq 2/18"] },
      { id: 902, title: "Balochistan United: last match 2–0 vs Quetta Stars — Ali Raza scores brace", meta: "Pakistan · 2h ago", league: "Pakistan City League", sport: "Football", teams: "Balochistan United vs Quetta Stars", score: "2–0", city: "Quetta", venue: "Sadiq Ground", highlights: ["Ali Raza (BU) 2 goals", "xG: 1.8 — 0.7", "Saves: GK H. Ahmed (4)"] },
      { id: 903, title: "Karachi City League: Eagles stretch unbeaten run (beat Sharks 1–0)", meta: "Pakistan · 3h ago", league: "City League", sport: "Football", teams: "Eagles vs Sharks", score: "1–0", city: "Karachi", venue: "National Stadium", highlights: ["S. Javed scores winner (52’)", "Possession 56% — 44%", "On target: 5 — 3"] },
      { id: 904, title: "Lahore Hoops Night: Wolves fall 72–78 to Falcons, MVP: F. Ahmed (24 pts)", meta: "Pakistan · 4h ago", league: "Hoops Night", sport: "Basketball", teams: "Falcons vs Wolves", score: "78–72", city: "Lahore", venue: "Sports Arena", highlights: ["Falcons 9 threes", "Rebounds 33 — 29", "MVP: F. Ahmed (24)"] },
      { id: 905, title: "Islamabad Court Clash: Spikers defeat Smashers (19–17) in G2", meta: "Pakistan · 5h ago", league: "Court Clash", sport: "Tennis", teams: "Spikers vs Smashers", score: "G2 · 19–17", city: "Islamabad", venue: "Green Courts", highlights: ["Aces 7 — 6", "Breaks 4/9 — 3/8", "Longest rally: 21 shots"] },
    ],
    []
  );

  // Live matches in Pakistan (for the list)
  const pkLive = useMemo(
    () => [
      { id: 11, league: "City League (Football)",  city: "Karachi",    venue: "National Stadium", teams: "Eagles vs Sharks",     score: "1–0 · 64’", details: ["Scorer: S. Javed (52’)", "Yellow cards: M. Tariq", "Possession: 56% — 44%", "On target: 5 — 3"] },
      { id: 12, league: "Hoops Night (Basketball)", city: "Lahore",     venue: "Sports Arena",     teams: "Falcons vs Wolves",    score: "78–72 · Q4", details: ["Top scorer: F. Ahmed 24", "3PT: 9 — 7", "Rebounds: 33 — 29"] },
      { id: 13, league: "Court Clash (Tennis)",     city: "Islamabad",  venue: "Green Courts",     teams: "Spikers vs Smashers",  score: "6–4 3–6 4–3 · G3", details: ["Aces: 7 — 6", "Double faults: 2 — 4", "Break points: 4/9 — 3/8"] },
      { id: 14, league: "T20 Cup (Cricket)",        city: "Rawalpindi", venue: "Pindi Club Ground", teams: "Titans vs Kings",     score: "Titans 143/5 · 16.2", details: ["Top scorer: M. Bilal 52(31)", "Best bowling: A. Khan 2/24", "Required: 21 off 16"] },
    ],
    []
  );

  const [openMatch, setOpenMatch] = useState(null);
  const [openNews, setOpenNews] = useState(null);

  /* ---------- actions ---------- */
  const handleWatch = (item) => setOpenMatch(item);

  const handleRemind = async (item) => {
    if (!user) {
      setPendingIntent({ type: "remind", matchId: item?.id });
      return promptLogin("Please log in to set a reminder.");
    }
    const reminder = buildReminderFrom(item);
    await addReminder(reminder);
    showToast("Added to the reminders");
  };

  const handleBuy = (item) => {
    if (!user) {
      setPendingIntent({ type: "buy", matchId: item?.id });
      return promptLogin("Please log in to buy tickets.");
    }
    const id = encodeURIComponent(item?.id ?? "");
    nav(`/tickets/checkout?matchId=${id}`, { state: { item } });
  };

  // Toggle follow set (works for both modal and lists)
  const toggleFollow = (itemOrKey) => {
    const key = typeof itemOrKey === "string" ? itemOrKey : String(teamIdFrom(itemOrKey));
    const set = getFollowSet();
    if (set.has(key)) set.delete(key); else set.add(key);
    const prof = readProfile();
    writeProfile({ ...prof, followedTeams: Array.from(set) });
    return set.has(key);
  };

  /* ----- resume any pending intent after user logs in ----- */
  useEffect(() => {
    if (!user) return;
    const pending = getPendingIntent();
    if (!pending) return;

    const { type } = pending;
    const findById = (id) =>
      pkLive.find((m) => String(m.id) === String(id));

    if (type === "remind" && pending.matchId != null) {
      const item = findById(pending.matchId);
      if (item) {
        addReminder(buildReminderFrom(item)).then(() => {
          showToast("Added to the reminders");
        });
      }
      clearPendingIntent();
      return;
    }

    if (type === "buy" && pending.matchId != null) {
      const item = findById(pending.matchId);
      const id = encodeURIComponent(item?.id ?? pending.matchId);
      clearPendingIntent();
      nav(`/tickets/checkout?matchId=${id}`, { state: item ? { item } : undefined });
      return;
    }

    if (type === "follow") {
      const teamKey =
        pending.teamKey ||
        (pending.matchId != null ? String(teamIdFrom(findById(pending.matchId))) : null);
      if (teamKey) {
        const isNow = toggleFollow(String(teamKey));
        showToast(isNow ? "Team followed — saved to your profile" : "Unfollowed");
      }
      clearPendingIntent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // runs when user becomes truthy

  return (
    <div className="page live-page">
      {/* Hide any floating arrows on this page */}
      <style>{`
        .live-page .snap-nav, .live-page .snap-nav *,
        .live-page .side-snap, .live-page .side-snap *,
        .live-page .page-arrows, .live-page .page-arrows *,
        .live-page .sticky-arrows, .live-page .sticky-arrows *,
        .live-page .fab-arrow, .live-page .fab-arrow *,
        .live-page .scroll-fab, .live-page .scroll-fab *,
        .live-page .nav-fab, .live-page .nav-fab *,
        .live-page .carousel-fab, .live-page .carousel-fab *{ display:none !important; }
      `}</style>

      {/* Ticker */}
      <div className="live-top">
        <Ticker matches={tickerMatches} />
      </div>

      {/* Hero + Trending — equal columns */}
      <div className="hero-grid" role="region" aria-label="Live hero and trending news">
        <div className="hero-block" style={{ minWidth: 0 }}>
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            src={`${base}media/sports02.mp4`}
            aria-hidden="true"
          />
          <div className="hero-overlay" />
          <div className="hero-inner">
            <h2>Follow Live Matches</h2>
            <p>Pakistan’s live scores, highlights, and fixtures—across cricket, football, basketball and more.</p>
            <div className="hero-cta">
              <button className="btn red" onClick={() => handleWatch(pkLive[0])}>Watch Now</button>
              <button className="btn blue" onClick={() => handleRemind(pkLive[0])}>Remind me</button>
            </div>
          </div>
        </div>

        <div className="trending-scroll-wrap" style={{ minWidth: 0 }}>
          <TrendingPanel items={pkNews} onItemClick={(item) => setOpenNews(item)} />
        </div>
      </div>

      {/* Live in Pakistan list */}
      <LivePkList
        items={pkLive}
        onWatch={handleWatch}
        onRemind={handleRemind}
        onBuy={handleBuy}
      />

      {/* Keep last two sections */}
      <CityCarousel
        items={[
          { id: 21, city: "Karachi", title: "Football, Cricket & more" },
          { id: 22, city: "Lahore", title: "Basketball & Football" },
          { id: 23, city: "Islamabad", title: "Tennis & Badminton" },
          { id: 24, city: "Rawalpindi", title: "Cricket" },
        ]}
      />
      <UpcomingCarousel />

      {/* Watch modal */}
      {openMatch && (
        <LiveMatchModal
          match={openMatch}
          onClose={() => setOpenMatch(null)}
          followed={getFollowSet().has(String(teamIdFrom(openMatch)))}
          onToggleFollow={() => {
            if (!user) {
              // Save intent and show login gate; we’ll auto-follow after login
              setPendingIntent({ type: "follow", teamKey: String(teamIdFrom(openMatch)) });
              promptLogin("Please log in to follow teams.");
              return null;                  // ⬅️ IMPORTANT: do NOT flip UI when guest
            }
            const isNow = toggleFollow(openMatch);
            showToast(isNow ? "Team followed — saved to your profile" : "Unfollowed");
            return isNow;                   // child modal updates UI from this boolean
          }}
          onBuy={() => handleBuy(openMatch)}
        />
      )}

      {/* News (Trending) modal */}
      {openNews && <NewsMatchModal item={openNews} onClose={() => setOpenNews(null)} />}

      {/* top toast (fixed) */}
      {toast && <div className="live-toast show" role="status" aria-live="polite">{toast}</div>}

      {/* login gate */}
      <LoginGateModal
        open={gateOpen}
        message={gateMsg}
        onClose={() => setGateOpen(false)}
        onConfirm={confirmLogin}
      />
    </div>
  );
}

/* ---------------- “Live in Pakistan” list with flip details ---------------- */
function LivePkList({ items, onWatch, onRemind, onBuy }) {
  const [flipped, setFlipped] = useState(null);

  return (
    <section className="pk-live-section" aria-labelledby="pk-live-title">
      <h2 id="pk-live-title">Live in Pakistan</h2>

      <div className="pk-live-list">
        {items.map((m) => {
          const isFlip = flipped === m.id;
          return (
            <div key={m.id} className={`pk-live-card ${isFlip ? "is-flipped" : ""}`}>
              <div className="pk-flip-inner">
                {/* Front */}
                <div className="pk-front">
                  <div className="pk-meta">
                    <span className="pk-league">{m.league}</span>
                    <span className="pk-loc">{m.city} · {m.venue}</span>
                  </div>
                  <div className="pk-title">{m.teams}</div>
                  <div className="pk-score">{m.score}</div>
                  <div className="pk-actions">
                    <button className="btn red" onClick={() => onWatch(m)}>Watch</button>
                    <button className="btn blue" onClick={() => onRemind(m)}>Remind me</button>
                    <button className="btn ghost" onClick={() => setFlipped(isFlip ? null : m.id)}>Details</button>
                  </div>
                </div>

                {/* Back */}
                <div className="pk-back">
                  <div className="pk-back-title">Match details</div>
                  <ul className="pk-stats">
                    {m.details?.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                  <div className="pk-actions">
                    <button className="btn" onClick={() => setFlipped(null)}>Close</button>
                    <button className="btn red" onClick={() => onBuy(m)}>Buy tickets</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
