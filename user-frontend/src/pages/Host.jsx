// src/pages/Host.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { EVENTS, SPORT_LABEL, SPORT_ICON } from "@/data/events";
import "@/styles/host.css";

/* ---------- small helper ---------- */
const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/* ---------- Login Gate Modal ---------- */
function LoginGateModal({ open, message, onClose, onConfirm }) {
  const primaryRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => primaryRef.current?.focus(), 0);
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
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

        <style>{`
          .modal-overlay{
            position:fixed; inset:0; z-index:9999;
            background: rgba(13,27,42,.38); backdrop-filter: blur(2px);
            display:grid; place-items:center; animation: modalFade .18s ease-out;
          }
          .modal-card{
            width:min(92vw, 420px); background: var(--bg,#fff); color: var(--text,#0f172a);
            border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.18);
            padding: 18px 18px 16px; animation: modalPop .22s cubic-bezier(.2,.8,.2,1);
          }
          .modal-head{ display:flex; align-items:center; gap:10px; margin-bottom:8px; }
          .modal-icon{
            width:36px; height:36px; border-radius:999px; display:grid; place-items:center; color:#fff;
            background: linear-gradient(135deg, #0d6c9e 0%, #2aab7c 100%);
            box-shadow: 0 6px 16px rgba(0,0,0,.12);
          }
          .modal-card h3{ margin:0; font-weight:900; }
          .modal-body{ margin:8px 0 14px; color: var(--muted,#334155); }
          .modal-actions{ display:flex; justify-content:flex-end; gap:10px; }

          @keyframes modalPop{ from{ transform:scale(.96); opacity:0 } to{ transform:scale(1); opacity:1 } }
          @keyframes modalFade{ from{ opacity:0 } to{ opacity:1 } }
        `}</style>
      </div>
    </div>
  );
}

/* ================================ Page ================================ */
export default function Host() {
  const [sport, setSport] = useState("all");
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // show gate immediately in guest mode
  const [gateOpen, setGateOpen] = useState(false);
  useEffect(() => {
    if (!user) setGateOpen(true);
  }, [user]);

  const goLogin = () => { setGateOpen(false); nav("/login"); };
  const cancelToHome = () => { setGateOpen(false); nav("/"); }; // <-- Cancel goes HOME

  // group by sport
  const sections = useMemo(() => {
    const g = {};
    for (const ev of EVENTS) {
      const k = ev.sport === "multi" ? "multi" : ev.sport;
      (g[k] = g[k] || []).push(ev);
    }
    for (const k of Object.keys(g))
      g[k].sort((a, b) => new Date(a.date) - new Date(b.date));
    return g;
  }, []);

  const keys = ["all", ...Object.keys(sections)];
  const list = sport === "all" ? EVENTS : sections[sport] || [];
  const base = import.meta.env.BASE_URL || "/";

  return (
    <div className="host-page">
      {/* HERO */}
      <section className="host-hero">
        <video
          className="host-video"
          src={`${base}media/host-hero.mp4`}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="host-veil" />
        <div className="host-hero-content">
          <h1
            className="host-title"
            style={{
              color: "#fff",
              fontSize: "clamp(34px, 5.2vw, 56px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "0.2px",
              margin: "0 0 8px",
              textShadow:
                "0 6px 24px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.45)",
            }}
          >
            Host an event
          </h1>

          <p
            className="host-sub"
            style={{
              color: "rgba(255,255,255,.96)",
              margin: "0 0 16px",
              maxWidth: 680,
              textShadow: "0 2px 6px rgba(0,0,0,.45)",
              fontSize: "clamp(14px, 1.6vw, 18px)",
            }}
          >
            Create tournaments, friendlies and pickup games. Simple tools,
            secure verification.
          </p>

          <div className="host-hero-cta">
            {user ? (
              <Link className="btn primary xl" to="/host/new">
                Host an event
              </Link>
            ) : (
              <button className="btn primary xl" onClick={() => setGateOpen(true)}>
                Host an event
              </button>
            )}
            <a className="btn ghost xl" href="#discover">
              See what’s hosting
            </a>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="host-toolbar" id="discover">
        <div className="spacer" />
        <div className="chip-row">
          {keys.map((k) => (
            <button
              key={k}
              className={`chip ${sport === k ? "active" : ""}`}
              onClick={() => setSport(k)}
            >
              {k === "all" ? "All" : `${SPORT_ICON(k)} ${SPORT_LABEL(k)}`}
            </button>
          ))}
        </div>
      </section>

      {/* SECTIONS */}
      {sport === "all" ? (
        Object.keys(sections).map((k) => (
          <SportSection
            key={k}
            title={`${SPORT_ICON(k)} ${SPORT_LABEL(k)}`}
            items={sections[k]}
            user={user}
            onGate={() => setGateOpen(true)}
          />
        ))
      ) : (
        <SportSection
          title={`${SPORT_ICON(sport)} ${SPORT_LABEL(sport)}`}
          items={list}
          user={user}
          onGate={() => setGateOpen(true)}
        />
      )}

      {/* guest popup */}
      <LoginGateModal
        open={gateOpen}
        message="Please log in to host or register for events."
        onClose={cancelToHome}   // <-- Cancel / outside-click => HOME
        onConfirm={goLogin}
      />
    </div>
  );
}

function SportSection({ title, items, user, onGate }) {
  return (
    <section className="host-section">
      <h2 className="section-title">{title}</h2>

      {!items?.length ? (
        <div className="empty">There’s no event happening.</div>
      ) : (
        <div className="media-grid">
          {items.map((ev) => (
            <article key={ev.id} className="media-card">
              {/* Image */}
              {ev.banner ? (
                <img className="media-img" src={ev.banner} alt="" />
              ) : (
                <div className="media-img media-fallback">
                  {SPORT_ICON(ev.sport)}
                </div>
              )}
              <div className="media-overlay" />

              {/* TOP-LEFT: sport badge only */}
              <div className="media-top">
                <span className={`badge sport ${ev.sport}`}>
                  {SPORT_ICON(ev.sport)} {SPORT_LABEL(ev.sport)}
                </span>
              </div>

              {/* TOP-RIGHT: city pill */}
              <span className="media-city pill light">{ev.city}</span>

              {/* Bottom stacked content */}
              <div className="media-bottom">
                <div className="media-host">
                  {ev.host?.avatar ? (
                    <img
                      className="media-ava"
                      src={ev.host.avatar}
                      alt={ev.host.name}
                    />
                  ) : (
                    <div className="media-ava initials">
                      {initials(ev.host?.name || "")}
                    </div>
                  )}
                  <div className="host-meta">
                    <div className="name">
                      {ev.host?.name}
                      {ev.host?.verified && <span className="verify">✔</span>}
                    </div>
                    <div className="type">{ev.host?.type}</div>
                  </div>
                </div>

                <h3 className="media-title">{ev.title}</h3>
                <div className="media-sub">
                  {ev.venue} • {new Date(ev.date).toLocaleDateString()}
                </div>

                <div className="media-tags">
                  <span className="tag light">
                    Slots {ev.filled}/{ev.slots}
                  </span>
                  <span className="tag light">Entry Rs {ev.entryFee}</span>
                  {ev.games?.length > 1 && (
                    <span className="tag light">Games {ev.games.length}</span>
                  )}
                </div>

                <div className="media-cta">
                  <Link className="btn white" to={`/events/${ev.slug}`}>
                    Details
                  </Link>
                  {user ? (
                    <Link className="btn primary" to={`/events/${ev.slug}#register`}>
                      Register team
                    </Link>
                  ) : (
                    <button className="btn primary" onClick={onGate}>
                      Register team
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
