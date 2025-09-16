// src/pages/Schedule.jsx
import "./schedule.css";
import { useEffect, useMemo, useState, useRef } from "react";

import { useAuth } from "@/context/AuthContext.jsx";
import { useReminders } from "@/context/RemindersContext.jsx";

import LiveMatchModal from "../components/layout/common/LiveMatchModal";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

/* ---------- hero artwork (place file in /public/media) ---------- */
const HERO_IMAGE = "/media/vecteezy_calendar-icon-vector-design-illustration-isolated-on-white_32310971.svg";

/* ---------------- LoginGate Modal ---------------- */
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

/* ---------------- helpers ---------------- */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDOW = (d) => d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
const fmtMD = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtDateTime = (iso, time) => {
  const dt = new Date(`${iso}T${time}`);
  return dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const startLabel = (sport = "") => {
  switch (sport.toLowerCase()) {
    case "football": return "Kick-off";
    case "basketball": return "Tip-off";
    case "tennis": return "First serve";
    case "cricket": return "First ball";
    default: return "Start";
  }
};
const mapsHref = (m) => `https://maps.google.com/?q=${encodeURIComponent(`${m.venue} ${m.city}`)}`;

function makeNextDays(n = 14) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      date: d, iso: toISO(d), dow: fmtDOW(d), md: fmtMD(d), isToday: i === 0,
    });
  }
  return out;
}

/* reminders payload for matches */
function buildReminderFrom(m) {
  const dt = new Date(`${m.dateISO}T${m.timeLocal}`);
  const title = `${m.teams?.[0] ?? "Home"} vs ${m.teams?.[1] ?? "Away"}`;
  return {
    id: `sched-${m.id}-${dt.toISOString()}`,
    title,
    startISO: dt.toISOString(),
    league: m.league || "Match",
    sport: m.sport || "",
    city: m.city || "",
    venue: m.venue || "",
  };
}

/* ---------------- demo data (matches) ---------------- */
const CITIES = ["Karachi", "Lahore", "Islamabad", "Peshawar"];
const SPORTS = ["Cricket", "Football", "Basketball", "Tennis"];
const LEAGUES = {
  Cricket: ["City Cup (T20)", "Inter Uni (ODI)", "Varsity League"],
  Football: ["Inter Uni", "Campus League", "City Cup"],
  Basketball: ["Varsity", "Conference", "Inter Uni"],
  Tennis: ["Open", "Campus Series", "City Tour"],
};
const TEAM_BANK = {
  Cricket: ["Eagles","Sharks","Titans","Kings","Royals","Spartans","Strikers","Warriors"],
  Football: ["Falcons","Wolves","Rangers","United","City","Lions","Tigers","Miners"],
  Basketball: ["Dunkers","Ballers","Hoops","Swish","Storm","Comets","Rockets","Giants"],
  Tennis: ["Aces","Spinners","Topspin","DropShot","Volley","Slices","Baseliners","Lobs"],
};
function pick(arr, i) { return arr[i % arr.length]; }
function hhmm(hour, min) { return `${pad(hour)}:${pad(min)}`; }

function generateSample(days = 10) {
  const out = [];
  const base = new Date();
  let id = 1;

  for (let d = 0; d < days; d++) {
    const date = new Date(base);
    date.setDate(base.getDate() + d);
    const dateISO = toISO(date);

    SPORTS.forEach((sport, sIdx) => {
      CITIES.forEach((city, cIdx) => {
        for (let k = 0; k < 2; k++) {
          const A = pick(TEAM_BANK[sport], sIdx + cIdx + k);
          const B = pick(TEAM_BANK[sport], sIdx + cIdx + k + 3);
          const league = pick(LEAGUES[sport], sIdx + k);
          const hour = 15 + ((cIdx + k) % 5);
          const min = (sIdx * 10) % 60;

          let status = "upcoming";
          if (d === 0 && k === 0 && (sIdx + cIdx) % 3 === 0) status = "live";
          if (d === 0 && k === 1 && (sIdx + cIdx) % 4 === 0) status = "finished";

          out.push({
            id: id++,
            dateISO,
            timeLocal: hhmm(hour, min),
            league,
            sport,
            city,
            venue: `${city} Dome`,
            teams: [A, B],
            status,
          });
        }
      });
    });
  }
  return out.sort(
    (a, b) =>
      a.dateISO.localeCompare(b.dateISO) ||
      a.timeLocal.localeCompare(b.timeLocal)
  );
}

/* ---------------- demo data (tournaments) ---------------- */
const TOURNAMENTS = [
  {
    id: "tn-cr-001",
    sport: "Cricket",
    title: "Nationwide Cricket Cup",
    city: "Karachi",
    venue: "National Stadium",
    slots: 32,
    nationwide: true,
    startISO: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
  },
  {
    id: "tn-fb-002",
    sport: "Football",
    title: "All Pakistan Inter-City Championship",
    city: "Lahore",
    venue: "Sports City Arena",
    slots: 24,
    nationwide: true,
    startISO: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
  },
];

/* ---------------- tournament apply sheet ---------------- */
function ApplySheet({ open, tournament, userTeams = [], onClose, onSubmit }) {
  const baseTeam = userTeams?.[0]?.name || "";
  const [team, setTeam] = useState(baseTeam);
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [city, setCity] = useState(tournament?.city || "");
  const [jersey, setJersey] = useState("");
  const [agree, setAgree] = useState(false);
  const [roster, setRoster] = useState([
    { name: "", cnic: "", gender: "Male", role: "" },
    { name: "", cnic: "", gender: "Male", role: "" },
    { name: "", cnic: "", gender: "Male", role: "" },
    { name: "", cnic: "", gender: "Male", role: "" },
    { name: "", cnic: "", gender: "Male", role: "" },
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const updateRoster = (i, field, val) => {
    setRoster((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  };
  const addRow = () => setRoster((r) => [...r, { name: "", cnic: "", gender: "Male", role: "" }]);
  const delRow = (i) => setRoster((r) => r.filter((_, idx) => idx !== i));

  const submit = (e) => {
    e.preventDefault();
    const cleanRoster = roster.filter((p) => p.name && p.cnic);
    if (!team) return alert("Choose a team.");
    if (cleanRoster.length < 5) return alert("Please add at least 5 players.");
    if (!agree) return alert("Please confirm you agree to rules.");

    onSubmit?.({
      tournamentId: tournament.id,
      tournamentTitle: tournament.title,
      sport: tournament.sport,
      team,
      manager: { name: managerName, phone: managerPhone, email: managerEmail },
      city,
      jersey,
      roster: cleanRoster,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="apply-sheet-overlay" onClick={onClose}>
      <form className="apply-sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="apply-head">
          <h3>Apply · {tournament?.title}</h3>
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="apply-grid">
          <div className="field">
            <label>Team</label>
            <select value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="">Select your team</option>
              {userTeams.map((t) => (
                <option key={t.id || t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
          </div>

          <div className="field">
            <label>Jersey Color</label>
            <input value={jersey} onChange={(e) => setJersey(e.target.value)} placeholder="e.g., Red/White" />
          </div>

          <div className="field">
            <label>Manager Name</label>
            <input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="field">
            <label>Manager Phone</label>
            <input value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
          </div>
          <div className="field">
            <label>Manager Email</label>
            <input value={managerEmail} onChange={(e) => setManagerEmail(e.target.value)} placeholder="email@example.com" />
          </div>
        </div>

        <div className="roster-head">
          <h4>Roster</h4>
          <button type="button" className="btn small" onClick={addRow}>Add Player</button>
        </div>

        <div className="roster-table">
          <div className="roster-row head">
            <div>Name</div><div>CNIC</div><div>Gender</div><div>Role/Position</div><div></div>
          </div>
          {roster.map((p, i) => (
            <div className="roster-row" key={i}>
              <input value={p.name} onChange={(e)=>updateRoster(i,"name",e.target.value)} placeholder="Player name"/>
              <input value={p.cnic} onChange={(e)=>updateRoster(i,"cnic",e.target.value)} placeholder="CNIC"/>
              <select value={p.gender} onChange={(e)=>updateRoster(i,"gender",e.target.value)}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
              <input value={p.role} onChange={(e)=>updateRoster(i,"role",e.target.value)} placeholder="e.g., Striker"/>
              <button type="button" className="link danger" onClick={()=>delRow(i)}>Remove</button>
            </div>
          ))}
        </div>

        <label className="agree">
          <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
          I confirm all details are correct and agree to tournament rules.
        </label>

        <div className="sheet-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn blue">Submit Application</button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- gate when no team (portal + hard-centered) ---------------- */
function TeamGateCard({ open, onClose, onCreate }) {
  const hostRef = useRef(null);

  useEffect(() => {
    if (!hostRef.current) hostRef.current = document.createElement("div");
    const el = hostRef.current;
    document.body.appendChild(el);
    return () => document.body.removeChild(el);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const overlayStyle = {
    position: "fixed",
    left: 0,
    top: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 2147483647,
    background: "rgba(13,27,42,.38)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const cardStyle = {
    width: "min(92vw, 480px)",
    background: "var(--bg)",
    color: "var(--text)",
    borderRadius: 16,
    padding: "18px 18px 16px",
    boxShadow: "0 20px 60px rgba(0,0,0,.18)",
  };

  const actionsStyle = {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  };

  const node = (
    <div style={overlayStyle} role="dialog" aria-modal="true" onClick={onClose}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <h4 style={{ margin: 0, fontWeight: 900 }}>You don’t have a team</h4>
        <p style={{ margin: "8px 0 0", opacity: 0.8 }}>
          Register your team first to apply for tournaments.
        </p>
        <div style={actionsStyle}>
          <button className="btn" onClick={onClose}>Close</button>
          <a
            className="btn blue"
            href="/create"
            onClick={(e) => { e.preventDefault(); onCreate?.(); }}
          >
            Create a Team
          </a>
        </div>
      </div>
    </div>
  );

  return createPortal(node, hostRef.current);
}

/* ---------------- one match card ---------------- */
function Card({ m, onWatch, onRemind, onBuy }) {
  const statusLabel =
    m.status === "live" ? "LIVE" : m.status === "finished" ? "FT" : "UPCOMING";
  const isFinished = m.status === "finished";

  return (
    <article className={`schedule-card sport-${m.sport.toLowerCase()}`} aria-label={`${m.teams[0]} vs ${m.teams[1]}`}>
      <div className="card-head">
        <div className="league-pill">{m.league}</div>
        {m.status === "live" && <span className="live-dot" aria-label="Live" />}
        {isFinished && <span className="ft">FT</span>}
      </div>

      <div className="card-body">
        <div className="card-time">{m.timeLocal}</div>
        <h4 className="card-title">
          <strong>{m.teams[0]}</strong> vs <strong>{m.teams[1]}</strong>
        </h4>

        <div className="meta-line">
          <span className={`status-pill ${m.status}`}>{statusLabel}</span>
          <span className="dot">·</span>
          <span className="sport">{m.sport}</span>
          <span className="dot">·</span>
          <span className="city">{m.city}</span>
        </div>

        <div className="card-meta">
          <span className="chip">{m.venue}</span>
        </div>

        {isFinished && (
          <div className="result-only">
            <span className="final-text">Final</span>
            <span className="dot">·</span>
            <span className="final-when">{fmtDateTime(m.dateISO, m.timeLocal)}</span>
          </div>
        )}

        {m.status === "upcoming" && (
          <div className="soon">Soon to be published • {fmtDateTime(m.dateISO, m.timeLocal)}</div>
        )}

        {!isFinished && (
          <div className="cta-row">
            {m.status === "upcoming" && (
              <button className="btn white" type="button" onClick={() => onBuy(m)}>
                Buy tickets
              </button>
            )}
            <a className="btn white" href={mapsHref(m)} target="_blank" rel="noreferrer">Get directions</a>
            <button className="btn red" type="button" onClick={() => onWatch(m)}>Watch Now</button>
            <button className="btn blue" type="button" onClick={() => onRemind(m)}>Remind me</button>
          </div>
        )}
      </div>
    </article>
  );
}

function Group({ title, items, onWatch, onRemind, onBuy }) {
  return (
    <section className="sched-group">
      <h3 className="group-title">{title}</h3>
      <div className="group-grid">
        {items.map((m) => (
          <Card key={m.id} m={m} onWatch={onWatch} onRemind={onRemind} onBuy={onBuy} />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Upcoming info modal with FOLLOW TOGGLE ---------------- */
function UpcomingInfoModal({ match, onClose, onBuy, onFollow, onRemind, authed }) {
  const [isFollowing, setIsFollowing] = useState(Boolean(match?.following));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onFollowClick = async () => {
    // If guest, just open the login gate via parent handler and DO NOT toggle UI.
    if (!authed) { onFollow?.(match); setIsFollowing(false); return; }

    // Optimistic toggle for authed users; parent returns a boolean to confirm.
    setIsFollowing((v) => !v);
    try {
      const res = await onFollow?.(match);
      if (typeof res === "boolean") setIsFollowing(res);
    } catch {
      setIsFollowing((v) => !v); // revert on error
    }
  };

  return (
    <div className="up-modal-overlay" onClick={onClose}>
      <div className="up-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>

        <div className="league-pill" style={{ position: "static", width: "max-content", marginBottom: 8 }}>
          {match.league}
        </div>

        <h3 className="modal-title">
          <strong>{match.teams[0]}</strong> vs <strong>{match.teams[1]}</strong>
        </h3>

        <div className="meta-line" style={{ marginBottom: 8 }}>
          <span className="status-pill upcoming">UPCOMING</span>
          <span className="dot">·</span>
          <span className="sport">{match.sport}</span>
          <span className="dot">·</span>
          <span className="city">{match.city}</span>
        </div>

        <p className="modal-sub emphasis">This match hasn’t started yet.</p>
        <p className="modal-sub">
          <strong>{startLabel(match.sport)}:</strong> {fmtDateTime(match.dateISO, match.timeLocal)}
        </p>

        <div className="cta-row">
          <button
            className={`btn blue follow-btn ${isFollowing ? "is-following" : ""}`}
            aria-pressed={isFollowing}
            onClick={onFollowClick}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
          <button className="btn blue" onClick={() => onRemind(match)}>Remind me</button>
          <button className="btn blue" onClick={() => onBuy(match)}>Buy tickets</button>
          <a className="btn white" href={mapsHref(match)} target="_blank" rel="noreferrer">Get directions</a>
          <button className="btn white" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* -------------- Tournament details modal (card) -------------- */
function TournamentDetailsModal({ t, onClose, onApply }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!t) return null;

  const dt = new Date(t.startISO);
  const startStr = dt.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="up-modal-overlay" onClick={onClose}>
      <div className="up-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>

        <div className="league-pill" style={{ position: "static", width: "max-content", marginBottom: 8 }}>
          {t.sport}
        </div>

        <h3 className="modal-title">{t.title}</h3>

        <div className="meta-line" style={{ marginBottom: 8 }}>
          <span className="chip">{t.city}</span>
          <span className="dot">·</span>
          <span className="chip">{t.venue}</span>
          <span className="dot">·</span>
          <span className="chip">{t.nationwide ? "Nation-wide" : t.city}</span>
          <span className="dot">·</span>
          <span className="chip">{t.slots} team slots</span>
        </div>

        <p className="modal-sub"><strong>Starts:</strong> {startStr}</p>

        <ul style={{ margin: "10px 0 16px 18px" }}>
          <li>Group stage followed by knockouts</li>
          <li>Min 5 players per team, CNICs required</li>
          <li>Home & away kits recommended</li>
          <li>Rules sheet shared after confirmation</li>
        </ul>

        <div className="cta-row">
          <button className="btn blue" onClick={onApply}>Apply</button>
          <button className="btn white" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- tournament card ---------------- */
function TournamentCard({ t, onApply, onView }) {
  const dt = new Date(t.startISO);
  const time = dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const day = dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <article className={`schedule-card tour sport-${t.sport.toLowerCase()}`}>
      <div className="card-head">
        <div className="league-pill">{t.sport}</div>
      </div>
      <div className="card-body">
        <div className="card-time">{time}</div>
        <h4 className="card-title">{t.title}</h4>

        <div className="meta-line">
          <span className="city">{t.city}</span>
          <span className="dot">·</span>
          <span className="chip">{t.venue}</span>
          <span className="dot">·</span>
          <span className="soon">Starts {day}</span>
        </div>

        <div className="card-meta">
          <span className="chip">{t.nationwide ? "Nation-wide" : t.city}</span>
          <span className="chip">{t.slots} teams slots</span>
        </div>

        <div className="cta-row">
          <button className="btn white" onClick={() => onView(t)}>View</button>
          <button className="btn blue" onClick={() => onApply(t)}>Apply</button>
        </div>
      </div>
    </article>
  );
}

/* ---------------- page ---------------- */
export default function Schedule() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { addReminder } = useReminders();

  const dates = useMemo(() => makeNextDays(14), []);
  const MATCHES = useMemo(() => generateSample(10), []);

  const [mode, setMode] = useState("sport");               // "city" | "sport"
  const [activeCity, setActiveCity] = useState(CITIES[0]);
  const [activeSport, setActiveSport] = useState(SPORTS[0]);
  const [activeDateISO, setActiveDateISO] = useState(dates[0].iso);
  const [status, setStatus] = useState("upcoming");        // "upcoming" | "live" | "finished" | "all"

  // type selector (matches/tournaments) — only for logged-in users
  const [viewType, setViewType] = useState("matches");     // "matches" | "tournaments"

  // Modals / sheets
  const [openLive, setOpenLive] = useState(null);
  const [openUpcoming, setOpenUpcoming] = useState(null);
  const [applyFor, setApplyFor] = useState(null);          // tournament
  const [showTeamGate, setShowTeamGate] = useState(false);
  const [viewTour, setViewTour] = useState(null);          // tournament details modal

  // login-gate modal
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMsg, setGateMsg] = useState("Please log in to continue.");
  const promptLogin = (msg) => { setGateMsg(msg || "Please log in to continue."); setGateOpen(true); };
  const confirmLogin = () => { setGateOpen(false); nav("/login"); };

  // tiny toast
  const [toast, setToast] = useState("");
  const showToast = (t) => { setToast(t); setTimeout(() => setToast(""), 1400); };

  /* ----- data filters ----- */
  useEffect(() => {
    if (mode === "city" && !CITIES.includes(activeCity)) setActiveCity(CITIES[0]);
    if (mode === "sport" && !SPORTS.includes(activeSport)) setActiveSport(SPORTS[0]);
  }, [mode]);

  const filteredMatches = useMemo(() => {
    return MATCHES.filter((m) => {
      if (activeDateISO && m.dateISO !== activeDateISO) return false;
      if (status !== "all" && m.status !== status) return false;
      if (mode === "city" && activeCity && m.city !== activeCity) return false;
      if (mode === "sport" && activeSport && m.sport !== activeSport) return false;
      return true;
    });
  }, [MATCHES, mode, activeCity, activeSport, activeDateISO, status]);

  const filteredTournaments = useMemo(() => {
    const dISO = activeDateISO;
    return TOURNAMENTS.filter((t) => {
      if (mode === "city" && activeCity && t.city !== activeCity) return false;
      if (mode === "sport" && activeSport && t.sport !== activeSport) return false;
      if (dISO) {
        const d = new Date(dISO);
        const ts = new Date(t.startISO);
        return ts.toDateString() === d.toDateString();
      }
      return true;
    });
  }, [activeCity, activeSport, activeDateISO, mode]);

  const groupTitle = useMemo(() => {
    const d = dates.find((x) => x.iso === activeDateISO)?.date;
    if (!d) return "";
    const todayISO = toISO(new Date());
    return activeDateISO === todayISO
      ? `Today · ${viewType === "tournaments" ? "Upcoming Tournaments" : "Matches"}`
      : `${d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · ${viewType === "tournaments" ? "Upcoming Tournaments" : "Matches"}`;
  }, [activeDateISO, dates, viewType]);

  const noItems = (viewType === "matches" ? filteredMatches : filteredTournaments).length === 0;

  /* ----- actions ----- */
  const handleWatch = (m) => {
    if (m.status === "live") setOpenLive(m);
    else setOpenUpcoming(m);
  };

  const handleRemind = async (m) => {
    if (!user) return promptLogin("Please log in to set a reminder.");
    const reminder = buildReminderFrom(m);
    await addReminder?.(reminder);
    showToast("Reminder added ✅");
  };

  const handleBuy = (m) => {
    if (!user) return promptLogin("Please log in to buy tickets.");
    nav(`/tickets/checkout?matchId=${encodeURIComponent(m.id)}`, { state: { item: m } });
  };

  // IMPORTANT: return a boolean result so modals can revert UI for guests.
  const handleFollow = (m) => {
    if (!user) { promptLogin("Please log in to follow teams."); return false; }
    // (You can persist follow here if needed)
    showToast("You're now following ✅");
    return true;
  };

  const userTeams =
    (user?.teams && user.teams.map((t) => ({ id: t.id || t._id || t.name, name: t.name }))) ||
    (() => {
      try { return (JSON.parse(localStorage.getItem("teams")) || []).map((n, i) => ({ id: `ls-${i}`, name: n })); }
      catch { return []; }
    })();

  const hasTeam = userTeams.length > 0;

  const handleApplyClick = (t) => {
    if (!user) return promptLogin("Please log in to apply.");
    if (!hasTeam) { setShowTeamGate(true); return; }
    setApplyFor(t);
  };

  const submitApplication = (payload) => {
    try {
      const prev = JSON.parse(localStorage.getItem("tournamentApplications") || "[]");
      prev.push(payload);
      localStorage.setItem("tournamentApplications", JSON.stringify(prev));
    } catch {}
    setApplyFor(null);
    showToast("Application submitted ✅");
  };

  return (
    <div className="page schedule-page">
      <style>{`
        .schedule-page .chip.on{ background: var(--red, #ff565a)!important; color:#fff!important; border-color:transparent!important; }
        .schedule-page .date-pill.active{ background: var(--red, #ff565a)!important; color:#fff!important; border-color:transparent!important; }
        .schedule-page .tabs .tab.active{ background: var(--red, #ff565a)!important; color:#fff!important; border-color:transparent!important; }
        .schedule-page .result-only{ margin-top:10px; font-weight:800; color:var(--text); display:flex; gap:8px; align-items:center; }
        .schedule-page .final-text{ opacity:.9 } .schedule-page .final-when{ opacity:.75 }

        /* --- HERO styles --- */
        .sched-hero {
          --hero-blend: #0f213f;
          background: radial-gradient(1200px 600px at -20% -60%, rgba(255,255,255,.08) 0%, rgba(255,255,255,0) 60%), var(--hero-blend);
          border-radius: 20px;
          padding: clamp(18px, 3vw, 28px);
          margin-bottom: 18px;
          overflow: hidden;
        }
        .sched-hero .hero-grid{
          display:grid; grid-template-columns: 1.05fr 1fr; align-items:center; gap: clamp(16px,3vw,28px);
        }
        .sched-hero .hero-copy h1{
          margin:0; line-height:1.15; letter-spacing:-.2px;
          font-size: clamp(24px, 3.2vw, 38px);
        }
        .sched-hero .hero-copy p{
          margin:.55rem 0 0; opacity:.9; max-width: 46ch;
        }
        .sched-hero .hero-vid{
          aspect-ratio: 16/9; width: 100%;
          border-radius: 16px; overflow: hidden;
          background: rgba(0,0,0,.15);
          box-shadow: 0 22px 60px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.06);
        }
        @media (max-width: 860px){
          .sched-hero .hero-grid{ grid-template-columns: 1fr; }
          .sched-hero .hero-vid{ order: -1; }
        }

        /* green “Following” state for the upcoming modal */
        .schedule-page .follow-btn.is-following{
          background: var(--brand-green, #2bb673) !important;
          color:#fff !important;
          border-color: transparent !important;
        }
        .schedule-page .follow-btn.is-following:hover{ filter:brightness(.96); }
      `}</style>

      <div className="sched-wrap">
        {/* HERO */}
        <section className="sched-hero" aria-label="Schedule overview">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>All fixtures in one place.</h1>
              <p>
                Browse live, upcoming and finished matches by date, city or sport.
                Use the filters below to quickly jump to what you want.
              </p>
            </div>

            {/* right-side artwork (image) */}
            <div className="hero-vid" aria-hidden="true">
              <img
                src={HERO_IMAGE}
                alt=""
                loading="eager"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                draggable={false}
              />
            </div>
          </div>
        </section>

        {/* CONTROLS */}
        <div className="sched-controls" role="region" aria-label="Schedule controls">
          <div className="tabs">
            <button className={`tab ${mode === "city" ? "active" : ""}`} onClick={() => setMode("city")}>By City</button>
            <button className={`tab ${mode === "sport" ? "active" : ""}`} onClick={() => setMode("sport")}>By Sport</button>
          </div>

          <div className="date-rail" role="tablist" aria-label="Select date">
            {dates.map((d) => (
              <button
                key={d.iso}
                role="tab"
                aria-selected={activeDateISO === d.iso}
                className={`date-pill ${activeDateISO === d.iso ? "active" : ""}`}
                onClick={() => setActiveDateISO(d.iso)}
              >
                <span className="dow">{d.isToday ? "TODAY" : d.dow}</span>
                <span className="dl">{d.md}</span>
              </button>
            ))}
          </div>

          <div className="chipbar">
            <div className="chip-label">Status:</div>
            {["upcoming", "live", "finished", "all"].map((s) => (
              <button key={s} className={`chip ${status === s ? "on" : ""}`} onClick={() => setStatus(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}

            {mode === "city" && (
              <div className="chip-split">
                <div className="chip-label">City:</div>
                <div className="chip-rail">
                  {CITIES.map((c) => (
                    <button key={c} className={`chip ${activeCity === c ? "on" : ""}`} onClick={() => setActiveCity(c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}

            {mode === "sport" && (
              <div className="chip-split">
                <div className="chip-label">Sport:</div>
                <div className="chip-rail">
                  {SPORTS.map((s) => (
                    <button key={s} className={`chip ${activeSport === s ? "on" : ""}`} onClick={() => setActiveSport(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Type chips – only for logged-in users */}
            {user && (
              <div className="chip-split">
                <div className="chip-label">Type:</div>
                <div className="chip-rail">
                  <button className={`chip ${viewType === "matches" ? "on" : ""}`} onClick={() => setViewType("matches")}>Matches</button>
                  <button className={`chip ${viewType === "tournaments" ? "on" : ""}`} onClick={() => setViewType("tournaments")}>Tournaments</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GRID / EMPTY */}
        {noItems ? (
          <div className="empty-wrap">
            <div className="empty-card">
              <h3>No {viewType === "tournaments" ? "tournaments" : "matches"} for these filters</h3>
              {viewType === "tournaments" ? (
                <p>Try another city/sport or pick a different date.</p>
              ) : (
                <p>Nothing scheduled for this day. Want to host your own fixture and go live?</p>
              )}
              <div className="cta-row">
                <a className="btn blue" href="/host">Host an Event</a>
                <a className="btn white" href="/create">Create a Team</a>
              </div>
            </div>
          </div>
        ) : viewType === "tournaments" ? (
          <section className="sched-group">
            <h3 className="group-title">{groupTitle}</h3>
            <div className="group-grid">
              {filteredTournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  t={t}
                  onView={(x) => setViewTour(x)}
                  onApply={handleApplyClick}
                />
              ))}
            </div>
          </section>
        ) : (
          <Group title={groupTitle} items={filteredMatches} onWatch={handleWatch} onRemind={handleRemind} onBuy={handleBuy} />
        )}

        {/* LIVE modal */}
        {openLive && (
          <LiveMatchModal
            match={openLive}
            onClose={() => setOpenLive(null)}
            onFollow={() => handleFollow(openLive)}  // returns boolean; guest -> false (revert)
            onBuy={() => handleBuy(openLive)}
          />
        )}

        {/* UPCOMING info modal – follow toggle */}
        {openUpcoming && (
          <UpcomingInfoModal
            match={openUpcoming}
            onClose={() => setOpenUpcoming(null)}
            onBuy={handleBuy}
            onFollow={handleFollow}                 // returns boolean; guest -> false (no stick)
            onRemind={handleRemind}
            authed={!!user}                         // prevent flicker for guests
          />
        )}

        {/* TOURNAMENT DETAILS modal */}
        {viewTour && (
          <TournamentDetailsModal
            t={viewTour}
            onClose={() => setViewTour(null)}
            onApply={() => { setViewTour(null); handleApplyClick(viewTour); }}
          />
        )}

        {/* APPLY SHEET (tournaments) */}
        <ApplySheet
          open={!!applyFor}
          tournament={applyFor}
          userTeams={userTeams}
          onClose={() => setApplyFor(null)}
          onSubmit={submitApplication}
        />

        {/* team-gate card */}
        <TeamGateCard
          open={showTeamGate}
          onClose={() => setShowTeamGate(false)}
          onCreate={() => { setShowTeamGate(false); nav("/create"); }}
        />

        {/* login gate */}
        <LoginGateModal
          open={gateOpen}
          message={gateMsg}
          onClose={() => setGateOpen(false)}
          onConfirm={confirmLogin}
        />

        {/* tiny toast */}
        {toast && <div className="live-toast show" role="status" aria-live="polite">{toast}</div>}
      </div>
    </div>
  );
}
