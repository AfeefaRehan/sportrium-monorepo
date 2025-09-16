// src/pages/home/DashboardHome.jsx
import { useMemo } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { MATCHES } from "@/data/matches.sample";
import "@/styles/home-dashboard.css";

/**
 * Minimal preferences reader (keeps your existing key).
 */
function getPrefs() {
  try { return JSON.parse(localStorage.getItem("preferences") || "{}"); }
  catch { return {}; }
}

/**
 * Logged-in home — revamped hero that keeps your video palette,
 * fully responsive, and readable in both light & dark modes.
 * (Drop-in replacement. Do not change imports elsewhere.)
 */
export default function DashboardHome() {
  const { user } = useAuth();
  const prefs = getPrefs();
  const favSports = Array.isArray(prefs?.sports) ? prefs.sports : [];
  const favCity   = prefs?.city || "";

  // Filter sample matches in a stable way (keeps your existing data shape)
  const upcoming = useMemo(() => {
    const now = Date.now();
    return (MATCHES || [])
      .filter(m => new Date(m.start).getTime() > now)
      .sort((a,b) => new Date(a.start) - new Date(b.start))
      .slice(0, 8);
  }, []);

  const recByCity = useMemo(() => {
    if (!favCity) return [];
    return (MATCHES || [])
      .filter(m => (m.city || "").toLowerCase() === String(favCity).toLowerCase())
      .sort((a,b) => new Date(a.start) - new Date(b.start))
      .slice(0, 12);
  }, [favCity]);

  const recBySport = useMemo(() => {
    if (!favSports?.length) return [];
    const set = new Set(favSports.map(s => String(s).toLowerCase()));
    return (MATCHES || [])
      .filter(m => set.has(String(m.sport).toLowerCase()))
      .sort((a,b) => new Date(a.start) - new Date(b.start))
      .slice(0, 12);
  }, [favSports]);

  return (
    <div className="dash-home" data-testid="dash-home">
      {/* ===== HERO with background video ===== */}
      <section className="dash-hero" aria-label="Welcome">
        <div className="hero-media">
          {/* Uses your existing public video so the palette stays on-brand */}
          <video
            className="hero-video"
            src="/media/home-hero.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
          <div className="hero-scrim" aria-hidden="true" />
        </div>

        <div className="hero-copy">
          <h1>
            Welcome{user?.displayName ? `, ${first(user.displayName)}` : ""}
          </h1>
          <p className="lead">
            Catch live scores, manage your matches, and discover teams nearby —
            all in one place.
          </p>

          <div className="hero-actions">
            <NavLink to="/create" className="btn red">Create a Match</NavLink>
            <NavLink to="/schedule" className="btn blue">View Schedule</NavLink>
            <NavLink to="/explore-teams" className="btn ghost">Explore Teams</NavLink>
          </div>

          {/* small helper text that works in both themes */}
          <p className="muted tip">
            Tip: Set your <NavLink to="/preferences">Preferences</NavLink> to get better recommendations.
          </p>
        </div>
      </section>

      {/* ===== Primary grid ===== */}
      <div className="primary-row">
        {/* Upcoming */}
        <section className="panel">
          <div className="panel-head">
            <h2>Upcoming</h2>
            <Link to="/schedule" className="link">See all</Link>
          </div>
          {upcoming?.length ? (
            <div className="grid-2">
              {upcoming.map(m => <MatchCard key={`u-${m.id}`} m={m} />)}
            </div>
          ) : (
            <Empty text="No upcoming matches yet." />
          )}
        </section>

        {/* Quick actions & shortcuts */}
        <aside className="panel">
          <div className="panel-head">
            <h2>Quick actions</h2>
          </div>
          <div className="actions">
            <NavLink to="/create" className="action">
              <span className="a-title">Host a match</span>
              <span className="a-sub">Publish fixtures and go live</span>
            </NavLink>

            <NavLink to="/reminders" className="action">
              <span className="a-title">Reminders</span>
              <span className="a-sub">Never miss kick-off</span>
            </NavLink>

            <NavLink to="/explore-teams" className="action">
              <span className="a-title">Find a team</span>
              <span className="a-sub">Join local squads</span>
            </NavLink>
          </div>

          <div className="shortcuts">
            <NavLink to="/live" className="chip">Live now</NavLink>
            <NavLink to="/news" className="chip">News</NavLink>
            <NavLink to="/cities" className="chip">Cities</NavLink>
            <NavLink to="/sports-101" className="chip">Sports 101</NavLink>
            <NavLink to="/about" className="chip">About</NavLink>
          </div>
        </aside>
      </div>

      {/* ===== Personalized rails (optional but kept minimal) ===== */}
      <section className="panel">
        <div className="panel-head">
          <h2>
            {favCity ? `Matches in ${favCity}` : "Set your city for local picks"}
          </h2>
          {favCity && <Link to="/cities" className="link">Change</Link>}
        </div>
        {recByCity?.length ? (
          <div className="hscroll">
            {recByCity.map(m => <MatchCard key={`c-${m.id}`} m={m} />)}
          </div>
        ) : (
          <Empty text={favCity ? `No upcoming matches in ${favCity}.` : `Go to Preferences to set your city.`} />
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>
            {favSports?.length ? `Because you like: ${favSports.join(", ")}` : "Pick favourite sports"}
          </h2>
          {!!favSports?.length && <Link to="/preferences" className="link">Edit</Link>}
        </div>
        {recBySport?.length ? (
          <div className="hscroll">
            {recBySport.map(m => <MatchCard key={`s-${m.id}`} m={m} />)}
          </div>
        ) : (
          <Empty text={favSports?.length ? "Nothing scheduled yet." : "Select sports in Preferences for better recommendations."} />
        )}
      </section>
    </div>
  );
}

/* =========================
   Small components
   ========================= */
function MatchCard({ m }) {
  const start = new Date(m.start);
  const time  = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date  = start.toLocaleDateString([], { month: "short", day: "2-digit" });
  const live  = !!m.live;

  return (
    <article className="match-card">
      <div className="m-top">
        <span className={`tag ${live ? "live" : ""}`}>{live ? "LIVE" : date}</span>
        <span className="time">{time}</span>
      </div>

      <h3 className="m-title">
        {m.title || `${cap(m.home)} vs ${cap(m.away)}`}
      </h3>

      <p className="m-meta">
        <span className="sport">{cap(m.sport)}</span>
        {m.city ? <> · <span className="city">{cap(m.city)}</span></> : null}
        {m.venue ? <> · <span className="venue">{m.venue}</span></> : null}
      </p>

      <div className="m-actions">
        {live ? (
          <Link to="/live" className="btn red">Watch</Link>
        ) : (
          <Link to="/reminders" className="btn blue">Remind me</Link>
        )}
      </div>
    </article>
  );
}

function Empty({ text }) {
  return (
    <div className="empty">
      <p>{text}</p>
      <NavLink to="/preferences" className="btn ghost">Open Preferences</NavLink>
    </div>
  );
}

function cap(s) {
  return String(s || "").slice(0,1).toUpperCase() + String(s || "").slice(1);
}
function first(s) {
  const t = String(s || "").trim();
  const sp = t.split(/\s+/);
  return sp[0] || t;
}
