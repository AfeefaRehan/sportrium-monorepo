// src/components/layout/Layout.jsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import "../../styles/layout.css";
import logo from "../../assets/logo.png";
import HeaderActions from "./HeaderActions";
/* ➕ NEW */
import { useAuth } from "../../context/AuthContext.jsx";

export default function Layout() {
  const base = import.meta.env.BASE_URL || "/";
  const location = useLocation();
  /* ➕ NEW */
  const { user } = useAuth();

  // Live active check
  const liveActive =
    location.pathname.startsWith("/live") ||
    location.pathname.startsWith("/city/") ||
    location.pathname.startsWith("/news/");

  // Explore Teams active check
  const teamsActive =
    location.pathname === "/explore-teams" ||
    location.pathname.startsWith("/explore-teams/");

  // Theme
  const [theme, setTheme] = useState("system");
  useEffect(() => {
    const saved = localStorage.getItem("theme") || "system";
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute(
      "data-theme",
      saved === "system" ? (sysDark ? "dark" : "light") : saved
    );
    setTheme(saved);
  }, []);

  const toggleTheme = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : t === "light" ? "system" : "dark";
      const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute(
        "data-theme",
        next === "system" ? (sysDark ? "dark" : "light") : next
      );
      localStorage.setItem("theme", next);
      return next;
    });

  // Sidebar submenu
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const asideRef = useRef(null);

  const onSidebarLeave = () => {
    setTeamsOpen(false);
    setNavOpen(false);
  };

  // 🔻 Scroll-hide header & sidebar — LISTEN ON .app-shell (not window)
  const shellRef = useRef(null);
  const [chromeHidden, setChromeHidden] = useState(false);
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    let lastY = el.scrollTop;
    let rafId = 0;
    const THRESH = 12; // px change before toggling

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const cur = el.scrollTop;
        const diff = cur - lastY;

        if (cur < 64) {
          setChromeHidden(false);
        } else if (diff > THRESH) {
          setChromeHidden(true);   // scrolling down → hide
        } else if (diff < -THRESH) {
          setChromeHidden(false);  // scrolling up → show
        }

        lastY = cur;
        rafId = 0;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={shellRef}
      className={`app-shell ${navOpen ? "shell--nav-open" : ""}`}
      data-scroll-root        // ✅ lets ScrollToTop reset the correct scroller
    >
      {/* SIDEBAR */}
      <aside
        ref={asideRef}
        className={`sidebar ${chromeHidden ? "hidden" : ""}`}
        onMouseEnter={() => setNavOpen(true)}
        onMouseLeave={onSidebarLeave}
      >
        <NavLink to="/" className="sid-item">
          <img className="sid-icon" src={`${base}icons/home.svg`} alt="" />
          <span className="sid-label">Home</span>
        </NavLink>

        <NavLink
          to="/live"
          className={({ isActive }) =>
            `sid-item ${isActive || liveActive ? "active" : ""}`
          }
        >
          <img className="sid-icon" src={`${base}icons/live.svg`} alt="" />
          <span className="sid-label">Live</span>
        </NavLink>

        <NavLink to="/schedule" className="sid-item">
          <img className="sid-icon" src={`${base}icons/schedule.svg`} alt="" />
          <span className="sid-label">Schedule</span>
        </NavLink>

        <NavLink to="/create" className="sid-item">
          <img className="sid-icon" src={`${base}icons/create.svg`} alt="" />
          <span className="sid-label">Create</span>
        </NavLink>

        <NavLink to="/host" className="sid-item">
          <img className="sid-icon" src={`${base}icons/host.svg`} alt="" />
          <span className="sid-label">Host</span>
        </NavLink>

        <div
          className={`sidnav-group ${teamsActive ? "active" : ""}`}
          onMouseEnter={() => setTeamsOpen(true)}
          onMouseLeave={() => setTeamsOpen(false)}
        >
          <NavLink
            to="/explore-teams"
            className={({ isActive }) =>
              `sid-item ${isActive || teamsActive ? "active" : ""}`
            }
          >
            <img className="sid-icon" src={`${base}icons/teams.svg`} alt="" />
            <span className="sid-label">Explore Teams</span>
          </NavLink>

          <div className={"sid-sub " + (teamsOpen ? "open" : "")}>
            <NavLink to="/explore-teams/football">⚽ Football</NavLink>
            <NavLink to="/explore-teams/cricket">🏏 Cricket</NavLink>
            <NavLink to="/explore-teams/basketball">🏀 Basketball</NavLink>
            <NavLink to="/explore-teams/badminton">🏸 Badminton</NavLink>
            <NavLink to="/explore-teams/tennis">🎾 Tennis</NavLink>
          </div>
        </div>
      </aside>

      {/* HEADER */}
      <header className={`header ${chromeHidden ? "hidden" : ""}`}>
        <div className="brand">
          <img src={logo} alt="Sportrium" />
          <span>Sportrium</span>
        </div>

        <div className="header-right">
          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️"}
          </button>

          {/* ➕ NEW: show Reminders only when logged in */}
          {user && (
            <NavLink to="/reminders" className="btn" title="Reminders">
              Reminders
            </NavLink>
          )}

          {/* Logged-in → bell + profile; otherwise Sign up / Log in */}
          <HeaderActions base={base} />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main id="app-main" className="main">
        <div className="page">
          <Outlet />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-card">
            <div className="footer-logo">
              <img src={logo} alt="Sportrium" />
              <strong>Sportrium</strong>
            </div>
            <p>
              Community sports, simplified. Watch live, follow teams, and host
              your own fixtures.
            </p>

            <NavLink to="/signup" className="btn white wide">
              Get Started
            </NavLink>
            <div className="footer-accent" />
          </div>

          <div className="footer-links-2">
            <div>
              <h5>Site Map</h5>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/live" className={liveActive ? "active" : ""}>
                Live
              </NavLink>
              <NavLink to="/schedule">Schedule</NavLink>
              <NavLink to="/host">Host a Match</NavLink>
            </div>

            <div>
              <h5>Legal</h5>
              <NavLink to="/explore-teams">Explore Teams</NavLink>
              <NavLink to="/contact">Contact Us</NavLink>
              <NavLink to="/about">About us</NavLink>
              <NavLink to="/terms">Terms &amp; Conditions</NavLink>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} Sportrium — All rights reserved.
        </div>
      </footer>
    </div>
  );
}
