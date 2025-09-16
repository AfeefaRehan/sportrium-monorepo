// src/pages/home/DashboardHome.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { getDisplayName } from "@/utils/userName.js";
import "@/styles/home-dashboard.css";

/* ==== ROUTES (change if different in your app) ==== */
const PROFILE_ROUTE  = "/profile";
const SCHEDULE_ROUTE = "/schedule";
const TEAMS_EXPLORE  = "/explore-teams";
const CREATE_ROUTE   = "/create";

/* ==== helpers ==== */
const PREF_KEYS = ["prefs", "preferences"];
const API_BASE = (import.meta.env?.VITE_API_URL ?? "/api").replace(/\/$/, "");

const readJSON = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const readProfile = () => readJSON("profile", {});
const readPrefs = () => { for (const k of PREF_KEYS) { const v = readJSON(k, null); if (v && typeof v === "object") return v; } return {}; };
const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));
const titleCase = (s) => String(s||"").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const firstWord = (s) => String(s || "").trim().split(/\s+/)[0] || "";

/* --- get *true* reminders count from localStorage (no fake default) --- */
function getRemindersCount() {
  const candidates = ["reminders", "reminders:list", "reminders_v1", "reminders_v2"];
  for (const k of candidates) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v.length;
      if (v && typeof v === "object") {
        if (Array.isArray(v.items)) return v.items.length;
        if (Array.isArray(v.list))  return v.list.length;
        if (Array.isArray(v.data))  return v.data.length;
      }
    } catch {}
  }
  return 0;
}

/* --- optional: fetch /me to cache name for future renders --- */
async function fetchAndCacheMe() {
  const token = localStorage.getItem("authToken");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const endpoints = ["/users/me", "/auth/me", "/me"].map(p => API_BASE + p);
  for (const url of endpoints) {
    try {
      const r = await fetch(url, { headers, credentials: "include" });
      if (!r.ok) continue;
      const me = await r.json();
      const name = me?.display_name || me?.displayName || me?.name || me?.username || (me?.email?.split("@")[0]);
      if (name) {
        const merged = { ...readProfile(), ...me, display_name: me.display_name || name };
        localStorage.setItem("profile", JSON.stringify(merged));
        return firstWord(name);
      }
    } catch {}
  }
  return "";
}

/* --- fetch matches (respects city + sports + status) --- */
async function fetchMatches({ city, sports = [], status = "upcoming" }) {
  if (!city) return [];
  const q = new URLSearchParams({
    city,
    sports: Array.isArray(sports) ? sports.join(",") : String(sports || ""),
    status,
    limit: "8",
  }).toString();

  const token = localStorage.getItem("authToken");
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const endpoints = ["/matches", "/matches/search", "/games"].map((p) => `${API_BASE}${p}?${q}`);
  for (const url of endpoints) {
    try {
      const r = await fetch(url, { headers, credentials: "include" });
      if (!r.ok) continue;
      const data = await r.json();
      const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      if (list.length) return list.slice(0, 8);
    } catch {}
  }
  // local dev fallback (optional)
  const local = readJSON("matches", []) || readJSON("mock:matches", []);
  return Array.isArray(local) ? local.slice(0, 8) : [];
}

export default function DashboardHome() {
  const { user } = useAuth();

  const [tick, setTick] = useState(0);
  const [displayName, setDisplayName] = useState(() => getDisplayName({ user, profile: readProfile() }));
  const [status, setStatus] = useState("upcoming"); // "live" | "upcoming" | "all"
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // react to prefs/storage changes
  useEffect(() => {
    const bump = () => setTick((x) => x + 1);
    window.addEventListener("prefs:updated", bump);
    window.addEventListener("storage", bump);
    return () => { window.removeEventListener("prefs:updated", bump); window.removeEventListener("storage", bump); };
  }, []);

  const profile = readProfile();
  const prefs   = readPrefs();

  const city = titleCase(profile?.city || prefs?.city || "");
  const sports = useMemo(() => {
    const raw =
      (Array.isArray(profile?.sports) && profile.sports) ||
      (Array.isArray(prefs?.sports) && prefs.sports) ||
      (typeof prefs?.sports === "string" ? prefs.sports.split(/[,\s]+/) : []);
    return uniq(raw).slice(0, 4);
  }, [tick]);

  // name resolution (local → fetch once)
  useEffect(() => {
    (async () => {
      const local = getDisplayName({ user, profile });
      if (typeof local === "string" && local && local.toLowerCase() !== "friend") {
        setDisplayName(firstWord(local));
        return;
      }
      const fetched = await fetchAndCacheMe();
      if (fetched) setDisplayName(firstWord(fetched));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tick]);

  // matches
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingMatches(true);
      const list = await fetchMatches({ city, sports, status });
      if (!cancel) { setMatches(list); setLoadingMatches(false); }
    })();
    return () => { cancel = true; };
  }, [city, sports, status]);

  // TRUE reminders count
  const remindersCount = getRemindersCount();

  // Optional stats (leave 0 for now)
  const stats = readJSON("stats", {});

  return (
    <div className="dash-home">
      {/* HERO */}
      <section className="dash-hero" aria-label="Welcome">
        <div className="hero-media">
          <video className="hero-video" src="/media/home-hero.mp4" autoPlay muted loop playsInline preload="auto" />
          <div className="hero-scrim" />
        </div>

        <div className="hero-copy">
          <h1 className="welcome big-welcome">
            Welcome Back!!! <span className="name-accent"></span>
          </h1>

          <p className="lead">Catch live scores, manage your matches, and discover teams nearby — all in one place.</p>

          <div className="picks-row" role="list" aria-label="Your preferences">
            {city ? <span className="chip" role="listitem"><i className="chip-ic">📍</i>{city}</span>
                  : <Link className="chip ghost" to="/onboarding/preferences"><i className="chip-ic">📍</i>Choose city</Link>}
            {sports.length
              ? sports.map((s) => <span key={s} className="chip" role="listitem"><i className="chip-ic">🏅</i>{s}</span>)
              : <Link className="chip ghost" to="/onboarding/preferences"><i className="chip-ic">🏅</i>Select sports</Link>}
          </div>

          {/* CTA row (left-justified, tighter padding) */}
          <div className="hero-actions">
            <Link to={CREATE_ROUTE} className="btn red" role="button">Create a Team</Link>
            <Link to={SCHEDULE_ROUTE} className="btn blue" role="button">View Schedule</Link>
            <Link to={TEAMS_EXPLORE} className="btn ghost" role="button">Explore Teams</Link>
          </div>

          <p className="muted tip">Tip: Set your <Link to="/onboarding/preferences">Preferences</Link> to get better recommendations.</p>
        </div>
      </section>

      {/* STATS */}
      <section className="stat-grid">
        <div className="stat-card s-a">
          <div className="s-num">{stats.teams ?? 0}</div>
          <div className="s-label">Teams Follow</div>
          <Link to={PROFILE_ROUTE} className="s-link">Profile</Link>
        </div>
        <div className="stat-card s-b">
          <div className="s-num">{stats.upcoming ?? 0}</div>
          <div className="s-label">Upcoming Tournaments</div>
          <Link to={SCHEDULE_ROUTE} className="s-link">See schedule</Link>
        </div>
        <div className="stat-card s-c">
          <div className="s-num">{remindersCount}</div>
          <div className="s-label">Active Reminders</div>
          <Link to="/reminders" className="s-link">Open</Link>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <aside className="panel">
        <div className="panel-head">
          <h2>Quick actions</h2>
          <Link to="/onboarding/preferences" className="link">Preferences</Link>
        </div>

        <div className="actions actions--elevated">
          <Link to={CREATE_ROUTE} className="action card-a" role="button">
            <div className="a-icon">
              <svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="a-text"><span className="a-title">Create a Team</span><span className="a-sub">Set sport, level and city</span></div>
          </Link>

          <Link to="/reminders" className="action card-b" role="button">
            <div className="a-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <div className="a-text"><span className="a-title">Reminders</span><span className="a-sub">Never miss kick-off</span></div>
          </Link>

          <Link to={TEAMS_EXPLORE} className="action card-c" role="button">
            <div className="a-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                <path d="M21 21l-4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="a-text">
              <span className="a-title">Explore Teams</span>
              <span className="a-sub">See who’s currently with us</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* MATCHES rail with Live/Upcoming/All filter (kept from previous drop) */}
      <MatchesRail city={city} sports={sports} status={status} setStatus={setStatus} />
    </div>
  );
}

/* Split out so it’s easy to evolve later */
function MatchesRail({ city, sports, status, setStatus }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const list = await fetchMatches({ city, sports, status });
      if (!cancel) { setMatches(list); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [city, sports, status]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{city ? `Matches in ${city}` : "Set your city for local picks"}</h2>
        <div className="seg">
          <button className={"seg-btn" + (status==="live" ? " active" : "")} onClick={() => setStatus("live")}>Live</button>
          <button className={"seg-btn" + (status==="upcoming" ? " active" : "")} onClick={() => setStatus("upcoming")}>Upcoming</button>
          <button className={"seg-btn" + (status==="all" ? " active" : "")} onClick={() => setStatus("all")}>All</button>
        </div>
      </div>

      {loading ? (
        <div className="matches-skel">Loading matches…</div>
      ) : matches.length ? (
        <div className="match-grid">
          {matches.map((m, i) => {
            const id = (m.id || m._id || i).toString();
            const sport = (m.sport || m.game || "").toString();
            const lvl = (m.level || m.tier || "").toString();
            const title = m.title || m.name || `${m.homeTeam || m.teamA || "Home"} vs ${m.awayTeam || m.teamB || "Away"}`;
            const date = new Date(m.date || m.startTime || Date.now()).toLocaleString();
            const mStatus = (m.status || "").toString().toLowerCase();
            return (
              <Link to={`/matches/${id}`} key={id} className="match-card">
                <div className="mc-head"><span className="mc-sport">{sport}</span><span className="mc-level">{lvl}</span></div>
                <div className="mc-title">{title}</div>
                <div className="mc-meta"><span>📍 {m.city || city}</span><span>🗓 {date}</span></div>
                {mStatus === "live" && <span className="mc-badge live">LIVE</span>}
                {mStatus === "upcoming" && <span className="mc-badge up">UPCOMING</span>}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <p>No matches found {city ? `in ${city}` : ""} for <strong>{status}</strong>. Try another sport or city.</p>
          <Link to="/onboarding/preferences" className="btn ghost">Open Preferences</Link>
        </div>
      )}
    </section>
  );
}
