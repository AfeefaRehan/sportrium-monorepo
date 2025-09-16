import { useState } from "react";
import { Link } from "react-router-dom";
import "@/styles/forgot.css";          // ⬅️ page-scoped CSS (doesn't touch other pages)
import logo from "@/assets/logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErr("Enter a valid email");
      return;
    }
    setErr("");
    try {
      setLoading(true);
      // TODO: call your real reset API / Firebase method here
      await new Promise((r) => setTimeout(r, 600));
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell forgot" data-theme="light">
      {/* LEFT: video / hero */}
      <aside className="auth-left">
        <div className="video-wrap">
          <video
            className="hero-video"
            src="/media/home-hero.mp4"     // use the same media as login/signup
            autoPlay muted loop playsInline preload="metadata"
          />
          <div className="video-gradient" />
        </div>

        <div className="hero-overlay">
          <div className="hero-inner">
            <h3 className="hero-quote">
              Forgot your password? <span>No problem.</span>
            </h3>
            <p className="hero-copy">
              Enter the email you use for Sportrium and we’ll send you a secure link
              to reset your password.
            </p>
          </div>
        </div>
      </aside>

      {/* RIGHT: card */}
      <section className="auth-right">
        <div className="auth-card">
          <header className="brand-xl">
            <img src={logo} alt="Sportrium" className="brand-logo" />
            <div className="brand-text">
              <h1 className="brand-name">Sportrium</h1>
              <p className="brand-tag">Play. Watch. Host. — <span>Own the game.</span></p>
            </div>
          </header>

          <h2 className="title">Reset your password</h2>
          <p className="subtitle">We’ll email you a link to create a new password.</p>

          {sent ? (
            <div className="success">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 12.75l-2-2 1.5-1.5L9 9.75l6.5-6.5L17 4.75 9 12.75zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              </svg>
              <div>
                <strong>Check your inbox</strong>
                <p>
                  We’ve sent a reset link to <b>{email}</b>. Follow the instructions
                  in the email to set a new password.
                </p>
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit} noValidate>
              <label className={`field ${err ? "has-error" : ""}`}>
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                {err && <em className="err">{err}</em>}
              </label>

              <button className="btn primary" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}

          <p className="footnote">
            Remembered it? <Link className="link" to="/login">Back to log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
