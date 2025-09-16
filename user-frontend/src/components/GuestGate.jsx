// src/components/GuestGate.jsx
import { Link } from "react-router-dom";
import { useEffect } from "react";
import "@/styles/guest-gate.css";

export default function GuestGate({
  title = "Login required",
  message = "First login in",
}) {
  useEffect(() => {
    const html  = document.documentElement;
    const body  = document.body;
    const root  = document.getElementById("root");         // Vite root
    const shell = document.querySelector(".app-shell");     // << scroll container

    const add    = (el) => el && el.classList.add("guest-no-scroll", "guest-mode");
    const remove = (el) => el && el.classList.remove("guest-no-scroll", "guest-mode");

    [html, body, root, shell].forEach(add);
    return () => [html, body, root, shell].forEach(remove);
  }, []);

  return (
    <main className="guest-gate" role="main" aria-labelledby="guest-title">
      <div className="guest-card">
        <div className="guest-icon" aria-hidden="true">🔒</div>
        <h1 id="guest-title" className="guest-title">{title}</h1>
        <p className="guest-text">{message}</p>
        <div className="guest-actions">
          <Link to="/login"  className="btn primary">Log in</Link>
          <Link to="/signup" className="btn ghost">Create account</Link>
        </div>
        <p className="guest-note">You need an account to continue.</p>
      </div>
    </main>
  );
}
