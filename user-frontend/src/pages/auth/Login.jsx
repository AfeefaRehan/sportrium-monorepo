import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "@/styles/login.css";
import logo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext.jsx";

export default function Login() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ email: "", password: "", remember: true });
  const [err, setErr] = useState({});
  const navigate = useNavigate();
  const { login } = useAuth();

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setF((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email";
    if (!f.password) e.password = "Password is required";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      await login({
        email: f.email.trim(),
        password: f.password,
        remember: f.remember,
      });
      navigate("/", { replace: true });
    } catch (er) {
      setErr({ form: er?.message || "Unable to sign in" });
    } finally {
      setLoading(false);
    }
  };

  const base = import.meta.env.BASE_URL || "/";

  const oauthSoon = (p) => alert(`${p} login coming soon.`);

  return (
    <main className="auth-shell login" data-theme="light">
      {/* LEFT SIDE (card) */}
      <section className="auth-left">
        <div className="auth-card">
          <header className="brand-xl">
            <img src={logo} alt="Sportrium" className="brand-logo" />
            <div className="brand-text">
              <h1 className="brand-name">Sportrium</h1>
              <p className="brand-tag">
                Play. Watch. Host. — <span>Own the game.</span>
              </p>
            </div>
          </header>

          <h2 className="title">Welcome back</h2>
          <p className="subtitle">Log in to track matches, join teams, and host events.</p>

          {err.form && <div className="form-error" role="alert">{err.form}</div>}

          <form className="auth-form" onSubmit={submit} noValidate>
            <label className={`field ${err.email ? "has-error" : ""}`}>
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={f.email}
                onChange={onChange}
                autoComplete="email"
              />
              {err.email && <em className="err">{err.email}</em>}
            </label>

            <label className={`field ${err.password ? "has-error" : ""}`}>
              <span>Password</span>
              <div className="pw-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={f.password}
                  onChange={onChange}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {err.password && <em className="err">{err.password}</em>}
            </label>

            {/* Footer row: left = remember, right = login + forgot */}
            <div className="form-footer">
              <label className="check">
                <input
                  type="checkbox"
                  name="remember"
                  checked={f.remember}
                  onChange={onChange}
                />
                <span>Remember me</span>
              </label>

              <div className="cta">
                <button className="btn primary login-btn" disabled={loading}>
                  {loading ? "Logging in…" : "Log in"}
                </button>
                <Link to="/forgot" className="link forgot-link">Forgot password?</Link>
              </div>
            </div>
          </form>

          <div className="divider"><span>or continue with</span></div>

          <div className="providers">
            <button className="btn social google" type="button" onClick={() => oauthSoon("Google")}>
              <img className="ico" src={`${base}icons/google.svg`} alt="" aria-hidden="true" />
              Google
            </button>

            <button className="btn social fb" type="button" onClick={() => oauthSoon("Facebook")}>
              <img className="ico" src={`${base}icons/facebook.svg`} alt="" aria-hidden="true" />
              Facebook
            </button>
          </div>

          <p className="footnote">
            Don’t have an account? <Link to="/signup" className="link">Create one</Link>
          </p>
        </div>
      </section>

      {/* RIGHT SIDE (video, center-left text like your screenshot) */}
      <aside className="auth-right">
        <div className="video-wrap">
          <video
            className="hero-video"
            src="/media/sports03.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
          <div className="video-gradient" />
        </div>

        <div className="hero-overlay">
          <div className="hero-inner">
            <h3 className="hero-quote">
              “Train hard. Play smart. <span>Win together.</span>”
            </h3>
            <p className="hero-copy">
              Discover matches near you, follow teams, and stream live games across Pakistan.
            </p>
          </div>
        </div>
      </aside>
    </main>
  );
}
