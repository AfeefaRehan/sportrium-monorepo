// src/pages/Home.jsx
import "./home.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { useEffect, useRef, useState } from "react";
import DashboardHome from "./home/DashboardHome.jsx";

export default function Home() {
  const { user } = useAuth();
  return user ? <DashboardHome /> : <GuestHome />;
}

/* ---------------- LoginGate Modal ---------------- */
function LoginGateModal({ open, message, onClose, onConfirm }) {
  const primaryRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => primaryRef.current?.focus(), 0);
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
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
            background: rgba(13,27,42,.38);
            backdrop-filter: blur(2px);
            display:grid; place-items:center;
            animation: modalFade .18s ease-out;
          }
          .modal-card{
            width:min(92vw, 420px);
            background: var(--bg);
            color: var(--text);
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,.18);
            padding: 18px 18px 16px 18px;
            animation: modalPop .22s cubic-bezier(.2,.8,.2,1);
          }
          .modal-head{ display:flex; align-items:center; gap:10px; margin-bottom:8px; }
          .modal-icon{
            width:36px; height:36px; border-radius:999px;
            display:grid; place-items:center; color:#fff;
            background: linear-gradient(135deg, #0d6c9e 0%, #2aab7c 100%);
            box-shadow: 0 6px 16px rgba(0,0,0,.12);
          }
          .modal-card h3{ margin:0; font-weight:900; }
          .modal-body{ margin:8px 0 14px 0; color:var(--muted); }
          .modal-actions{ display:flex; justify-content:flex-end; gap:10px; }
          @keyframes modalPop{ from{ transform:scale(.96); opacity:0 } to{ transform:scale(1); opacity:1 } }
          @keyframes modalFade{ from{ opacity:0 } to{ opacity:1 } }
        `}</style>
      </div>
    </div>
  );
}

/* ---------------- Guest view ---------------- */
function GuestHome() {
  const navigate = useNavigate();
  const base = import.meta.env.BASE_URL || "/";

  // Modal state
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMsg, setGateMsg] = useState("Please log in to continue.");

  const promptLogin = (e, msg) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setGateMsg(msg || "Please log in to continue.");
    setGateOpen(true);
  };
  const confirmLogin = () => {
    setGateOpen(false);
    navigate("/login");
  };

  return (
    <div className="home">
      {/* HERO */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="hero-left">
          <h1 id="home-hero-title">Play. Watch. Host.</h1>
          <p>
            Discover matches across Pakistan. Stream live, follow teams,
            and host your own fixtures.
          </p>

          <div className="cta-row">
            <NavLink to="/live" className="btn red" aria-label="Watch live matches">
              Watch Live
            </NavLink>
            <NavLink to="/explore-teams" className="btn blue" aria-label="Explore teams">
              Explore Teams
            </NavLink>
          </div>

          <div className="kpi-row" aria-label="Site statistics">
            <div className="kpi">
              <div className="num">16</div>
              <div className="lbl">Live streams</div>
            </div>
            <div className="kpi">
              <div className="num">48</div>
              <div className="lbl">Matches today</div>
            </div>
            <div className="kpi">
              <div className="num">312</div>
              <div className="lbl">Active teams</div>
            </div>
          </div>
        </div>

        <div className="hero-video">
          <video
            src={`${base}media/home-hero.mp4`}
            autoPlay
            muted
            loop
            playsInline
            aria-label="Highlight clips of community sports"
          />
        </div>
      </section>

      {/* LIVE NOW & UPCOMING */}
      <section className="list-section" aria-labelledby="home-live-upcoming">
        <h2 id="home-live-upcoming" className="sr-only">Live now and upcoming</h2>

        <div className="list-col">
          <h3>Live Now</h3>

          <ul className="tile-list">
            <li style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
              <span>Eagles 1 — 0 Sharks · City Stadium A · 54’</span>
              <NavLink to="/live" className="btn red" aria-label="Watch this match now">Watch Now</NavLink>
            </li>
            <li style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
              <span>Falcons 2 — 1 Wolves · Karachi Dome · 61’</span>
              <NavLink to="/live" className="btn red" aria-label="Watch this match now">Watch Now</NavLink>
            </li>
            <li style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
              <span>Warriors 78 — 72 Panthers · Lahore Arena · Q4</span>
              <NavLink to="/live" className="btn red" aria-label="Watch this match now">Watch Now</NavLink>
            </li>
            <li style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
              <span>Spikers 19 — 17 Smashers · Islamabad Court · G2</span>
              <NavLink to="/live" className="btn red" aria-label="Watch this match now">Watch Now</NavLink>
            </li>
            <li style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
              <span>Titans 3 — 2 Kings · Rawalpindi Park · 73’</span>
              <NavLink to="/live" className="btn red" aria-label="Watch this match now">Watch Now</NavLink>
            </li>
          </ul>
        </div>

        <div className="list-col">
          <h3>Upcoming Matches</h3>
          <ul className="match-list">
            <li>
              <span>17:00</span> · City Cup (T20) · Karachi · Cricket{" "}
              <NavLink
                to="/login"
                className="btn blue"
                onClick={(e) => promptLogin(e, "Please log in to set a reminder.")}
              >
                Remind me
              </NavLink>
            </li>
            <li>
              <span>19:30</span> · Hoops Night · Islamabad · Basketball{" "}
              <NavLink
                to="/login"
                className="btn blue"
                onClick={(e) => promptLogin(e, "Please log in to set a reminder.")}
              >
                Remind me
              </NavLink>
            </li>
            <li>
              <span>20:15</span> · Inter-Uni Friendly · Lahore · Football{" "}
              <NavLink
                to="/login"
                className="btn blue"
                onClick={(e) => promptLogin(e, "Please log in to set a reminder.")}
              >
                Remind me
              </NavLink>
            </li>
            <li>
              <span>21:00</span> · Racket Fest · Karachi · Badminton{" "}
              <NavLink
                to="/login"
                className="btn blue"
                onClick={(e) => promptLogin(e, "Please log in to set a reminder.")}
              >
                Remind me
              </NavLink>
            </li>
            <li>
              <span>21:30</span> · Court Clash · Islamabad · Tennis{" "}
              <NavLink
                to="/login"
                className="btn blue"
                onClick={(e) => promptLogin(e, "Please log in to set a reminder.")}
              >
                Remind me
              </NavLink>
            </li>
          </ul>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-split" aria-labelledby="home-about">
        <h2 id="home-about" className="sr-only">About Sportrium</h2>

        <div className="about-card">
          <img
            src="https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1200&auto=format&fit=crop"
            alt="Fans cheering at a local sports match"
            loading="lazy"
          />
        </div>
        <div className="about-copy">
          <h3>Built for fans, players, and organizers</h3>
          <p>
            Sportrium brings community sports to one place. Watch streams, follow your
            favorite teams, and create your own events. Our goal is to make local sports
            discovery and participation effortless—on any device.
          </p>
          <div className="cta-row">
            <NavLink to="/explore-teams" className="btn blue">Explore Teams</NavLink>
            <NavLink
              to="/login"
              className="btn red"
              onClick={(e) => promptLogin(e, "Please log in to host a match.")}
            >
              Host a Match
            </NavLink>
          </div>
        </div>
      </section>

      {/* Guest CTAs */}
      <section className="cta-row-3" aria-labelledby="home-ctas">
        <h2 id="home-ctas" className="sr-only">Get started actions</h2>

        <div className="cta-card">
          <h4>Join Sportrium</h4>
          <p>Create your account to follow teams, get reminders, and stream matches.</p>
          <NavLink to="/signup" className="btn red">Sign up</NavLink>
        </div>

        <div className="cta-card">
          <h4>Become a Host</h4>
          <p>Run your fixtures, publish schedules and go live for your audience.</p>
          <div className="cta-row">
            <NavLink
              to="/login"
              className="btn blue"
              onClick={(e) => promptLogin(e, "Please log in to create a team.")}
            >
              Create a Team
            </NavLink>
            <NavLink
              to="/login"
              className="btn red"
              onClick={(e) => promptLogin(e, "Please log in to host a match.")}
            >
              Host a Match
            </NavLink>
          </div>
        </div>

        <div className="cta-card">
          <h4>Join a Team</h4>
          <p>Find local teams and request to join right from your profile.</p>
          <NavLink to="/login" className="btn red">Log in to Explore</NavLink>
        </div>
      </section>

      {/* Login gate modal */}
      <LoginGateModal
        open={gateOpen}
        message={gateMsg}
        onClose={() => setGateOpen(false)}
        onConfirm={confirmLogin}
      />
    </div>
  );
}
