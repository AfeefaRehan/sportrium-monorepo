import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "@/styles/auth.css";
import logo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext.jsx";

export default function SignUp() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  // form state
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState({});
  const [f, setF] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    agree: false,
  });

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setF((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  const validate = () => {
    const e = {};
    if (!f.firstName.trim()) e.firstName = "First name required";
    if (!f.lastName.trim()) e.lastName = "Last name required";
    if (!/^\+?[0-9\s-]{7,15}$/.test(f.phone.trim())) e.phone = "Enter a valid phone";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email";
    if (!f.password || f.password.length < 6) e.password = "Min 6 characters";
    if (f.password !== f.confirm) e.confirm = "Passwords do not match";
    if (!f.agree) e.agree = "Please accept the Terms";
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      const name = `${f.firstName} ${f.lastName}`.trim();
      await signup({ name, email: f.email.trim(), password: f.password, remember: true });
      navigate("/onboarding/preferences", { replace: true });
    } catch (er) {
      setErr({ form: er?.message || "Unable to create account" });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- FIT CARD WITHOUT PAGE SCROLL (desktop) ---------- */
  const cardRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = cardRef.current;
    const fit = () => {
      if (!el) return;
      const vh = window.innerHeight;
      const margin = 24;
      const cardH = el.scrollHeight;
      const s = Math.min(1, (vh - margin * 2) / cardH);
      setScale(Number.isFinite(s) ? s : 1);
    };
    fit();

    const ro = new ResizeObserver(fit);
    if (el) ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      ro.disconnect();
    };
  }, []);

  const base = import.meta.env.BASE_URL || "/";

  const oauthSoon = (p) => {
    // keep buttons enabled so pointer cursor shows; this just stubs the action for now
    alert(`${p} sign-up coming soon.`);
  };

  return (
    <main className="auth-shell signup" data-theme="light">
      {/* LEFT: video with center-left copy (unchanged) */}
      <aside className="auth-left">
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
              Sportrium. Watch. Play. <span>Host.</span>
            </h3>
            <p className="hero-copy">
              Stream matches, join teams, and host fixtures — all in one place.
            </p>
          </div>
        </div>
      </aside>

      {/* RIGHT: scaled-to-fit form (no page scroll on desktop) */}
      <section className="auth-right">
        <div
          ref={cardRef}
          className="auth-card"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          <header className="brand-xl">
            <img src={logo} alt="Sportrium" className="brand-logo" />
            <div className="brand-text">
              <h1 className="brand-name">Sportrium</h1>
              <p className="brand-tag">
                Play. Watch. Host. — <span>Own the game.</span>
              </p>
            </div>
          </header>

          <h2 className="title">Create your account</h2>
          {err.form && <div className="form-error" role="alert">{err.form}</div>}

          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="grid-2">
              <Field
                label="First name"
                name="firstName"
                value={f.firstName}
                onChange={onChange}
                error={err.firstName}
              />
              <Field
                label="Last name"
                name="lastName"
                value={f.lastName}
                onChange={onChange}
                error={err.lastName}
              />
            </div>

            <Field
              label="Phone number"
              name="phone"
              type="tel"
              placeholder="+44 7xxx xxxxxx"
              value={f.phone}
              onChange={onChange}
              error={err.phone}
            />

            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={f.email}
              onChange={onChange}
              error={err.email}
            />

            <label className={`field ${err.password ? "has-error" : ""}`}>
              <span>Password</span>
              <div className="pw-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  placeholder="Create a password"
                  value={f.password}
                  onChange={onChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw((s) => !s)}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {err.password && <em className="err">{err.password}</em>}
            </label>

            <label className={`field ${err.confirm ? "has-error" : ""}`}>
              <span>Confirm password</span>
              <div className="pw-wrap">
                <input
                  type={showPw2 ? "text" : "password"}
                  name="confirm"
                  placeholder="Repeat your password"
                  value={f.confirm}
                  onChange={onChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPw2((s) => !s)}
                >
                  {showPw2 ? "Hide" : "Show"}
                </button>
              </div>
              {err.confirm && <em className="err">{err.confirm}</em>}
            </label>

            {/* Small Terms row */}
            <label className={`agree terms-mini ${err.agree ? "has-error" : ""}`}>
              <input
                type="checkbox"
                name="agree"
                checked={f.agree}
                onChange={onChange}
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="link">
                  Terms &amp; Conditions
                </Link>.
              </span>
              {err.agree && <em className="err">{err.agree}</em>}
            </label>

            <button className="btn primary" disabled={loading}>
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="divider">
            <span>or continue with</span>
          </div>

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
            Already have an account?{" "}
            <Link to="/login" className="link">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Field({ label, error, ...props }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      <input {...props} />
      {error && <em className="err">{error}</em>}
    </label>
  );
}
