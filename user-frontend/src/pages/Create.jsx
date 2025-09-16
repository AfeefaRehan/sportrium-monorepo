import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import "@/styles/create-team.css";

/* ----------------------------- config ----------------------------- */
const SPORTS = ["Football", "Cricket", "Basketball", "Badminton", "Tennis", "Volleyball"];
const CITIES = ["Karachi", "Lahore", "Islamabad", "Peshawar", "Faisalabad", "Multan"];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Professional"];

const SPORT_LIMITS = {
  Football: 11,
  Cricket: 11,
  Basketball: 8,
  Badminton: 4,
  Tennis: 4,
  Volleyball: 12,
};

const SPORT_ROLES = {
  Football: ["Goalkeeper", "Defender", "Midfielder", "Forward"],
  Cricket: ["Batter", "Bowler", "All-rounder", "Wicket-keeper"],
  Basketball: ["Guard", "Forward", "Center"],
  Badminton: ["Singles", "Doubles"],
  Tennis: ["Singles", "Doubles"],
  Volleyball: ["Setter", "Outside", "Middle", "Opposite", "Libero"],
};

const SAMPLE_TOURNAMENTS = [
  { id: "uni-cup", name: "University Cup 2025" },
  { id: "city-league", name: "City League (Open)" },
  { id: "varsity-t20", name: "Varsity T20" },
];

/* ---------------------------- helpers ----------------------------- */
const cnicRegex = /^(?:\d{5}-\d{7}-\d|\d{13})$/;
function formatCnic(v = "") {
  const digits = v.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}
function validCnic(v = "") {
  return cnicRegex.test(v.trim());
}
const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 10)}`;

/* ---------------------- Login Gate Modal ---------------------- */
function LoginGateModal({ open, message, onClose, onConfirm }) {
  const primaryRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => primaryRef.current?.focus(), 0);
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // lock scroll
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
            width:36px; height:36px; border-radius: 999px; display:grid; place-items:center; color:#fff;
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

/* =========================== component ============================ */
export default function TeamCreate() {
  const nav = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const base = import.meta.env.BASE_URL || "/";

  // gate visibility mirrors auth: open for guests, close when logged in
  const [gateOpen, setGateOpen] = useState(false);
  useEffect(() => {
    setGateOpen(!user);
  }, [user]);

  const goLogin = () => { setGateOpen(false); nav("/login"); };
  const goHome  = () => { setGateOpen(false); nav("/"); };

  const [data, setData] = useState({
    name: "",
    sport: "Basketball",
    city: "Karachi",
    level: "Intermediate",
    about: "",
    color: "#2563eb", // default blue brand
    teamType: "Mixed", // Male | Female | Mixed
    privateTeam: false,

    tournament: false,
    tournamentId: SAMPLE_TOURNAMENTS[0].id,
    division: "Open",

    logoDataUrl: "",
    roster: [], // [{id,name,gender,cnic,role,jersey}]
  });

  const [member, setMember] = useState({ name: "", gender: "Male", cnic: "", role: "", jersey: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [showReview, setShowReview] = useState(false);

  const tourneyName = useMemo(
    () => SAMPLE_TOURNAMENTS.find(t => t.id === data.tournamentId)?.name ?? "",
    [data.tournamentId]
  );

  const maxForSport = SPORT_LIMITS[data.sport] ?? 12;
  const rolesForSport = SPORT_ROLES[data.sport] ?? [];
  const rosterCount = data.roster.length;
  const completion = Math.min(100, Math.round((rosterCount / (SPORT_LIMITS[data.sport] ?? 12)) * 100));

  const missing = {
    name: data.name.trim().length < 3,
    about: data.about.trim().length < 10,
    roster: data.roster.length < 1,
  };
  const canSubmit = !missing.name && !missing.about && !missing.roster;

  /* ---------------------------- logo pick ---------------------------- */
  const handleLogoPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      setError("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setData(d => ({ ...d, logoDataUrl: String(reader.result) }));
    reader.readAsDataURL(f);
  };

  /* --------------------------- roster logic -------------------------- */
  const addMember = () => {
    setError("");
    const n = member.name.trim();
    const c = formatCnic(member.cnic);
    const role = member.role || rolesForSport[0] || "Player";
    const jersey = String(member.jersey || "").trim();
    const gender = member.gender;

    if (!n) { setError("Member name is required."); return; }
    if (!validCnic(c)) { setError("Enter a valid CNIC (#####-#######-# or 13 digits)."); return; }

    if (data.teamType !== "Mixed" && data.teamType !== gender) {
      setError(`This is a ${data.teamType} team. Please add ${data.teamType.toLowerCase()} members only.`);
      return;
    }

    if (data.roster.length >= maxForSport) {
      setError(`${data.sport} allows maximum ${maxForSport} players.`);
      return;
    }
    if (data.roster.some(r => r.cnic.replace(/\D/g, "") === c.replace(/\D/g, ""))) {
      setError("This CNIC is already added.");
      return;
    }

    const entry = {
      id: uid(),
      name: n,
      gender,
      cnic: c,
      role,
      jersey,
    };
    setData(d => ({ ...d, roster: [...d.roster, entry] }));
    setMember({ name: "", gender, cnic: "", role: "", jersey: "" });
  };

  const removeMember = (id) =>
    setData(d => ({ ...d, roster: d.roster.filter(r => r.id !== id) }));

  /* ------------------------------ save ------------------------------- */
  const saveLocal = (payload) => {
    try {
      // 1) full objects, for richer pages later
      const keyFull = "teams_full";
      const prevFull = JSON.parse(localStorage.getItem(keyFull) || "[]");
      localStorage.setItem(keyFull, JSON.stringify([...prevFull, payload]));

      // 2) names only, to stay compatible with Schedule page fallback
      const keyNames = "teams";
      const prevNames = JSON.parse(localStorage.getItem(keyNames) || "[]");
      const nextNames = Array.from(new Set([...(Array.isArray(prevNames) ? prevNames : []), payload.name]));
      localStorage.setItem(keyNames, JSON.stringify(nextNames));
    } catch {
      /* no-op */
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // defensive gate if somehow not logged in
    if (!user) {
      setGateOpen(true);
      return;
    }

    if (!canSubmit) {
      setError("Please complete: Team name (≥3 chars), About (≥10 chars), and at least 1 member.");
      return;
    }

    setBusy(true);
    try {
      const team = {
        id: uid(),
        createdAt: new Date().toISOString(),
        ...data,
      };
      saveLocal(team);

      setOk("Team created!");
      setShowReview(true); // modal
    } catch {
      setError("Could not create team. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="create-team-page create-team--blue">
      {/* ===== HERO with video (lighter overlay + pure white text) ===== */}
      <section className="ct-hero">
        <video
          className="ct-hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={`${base}assets/hero-fallback.jpg`}
        >
          {/* Put your file at /public/media/team-hero.mp4 (or adjust path) */}
          <source src={`${base}media/team-hero.mp4`} type="video/mp4" />
        </video>
        <div className="ct-hero-overlay" /> {/* opacity handled in CSS */}
        <div className="ct-hero-content">
          <h1>Build your team. Join the league.</h1>
          <p>
            Create a team, add verified members (CNIC), choose team type (Male/Female/Mixed), pick your colors,
            and optionally register for tournaments. We’ll review your request for safety &amp; fair play.
          </p>
          <div className="row">
            <a
              className="btn blue"
              href="#team-form"
              onClick={(e) => {
                if (!user) {
                  e.preventDefault();
                  setGateOpen(true);
                }
              }}
            >
              Start creating
            </a>
            <a className="btn red ghost" href="/explore-teams" style={{ marginLeft: 12 }}>Explore teams</a>
          </div>
        </div>
      </section>

      {/* ===== Page heading / actions ===== */}
      <div className="ct-head">
        <div className="ct-title">
          <span className="ct-badge">Create</span>
          <h2>Create a New Team</h2>
          <p>Set up your team, add players with CNIC, choose team type (Male/Female/Mixed), and optionally register for a tournament.</p>
        </div>
        <div className="ct-actions">
          <button className="btn ghost" onClick={() => nav(-1)}>Back</button>
          <button className="btn red" form="team-form" disabled={!canSubmit || busy} title={!canSubmit ? "Complete the required fields below" : undefined}>
            {busy ? "Saving…" : "Create Team"}
          </button>
        </div>
      </div>

      {/* ===== Form + Preview grid ===== */}
      <div className="ct-grid">
        {/* form */}
        <form id="team-form" className="card ct-form" onSubmit={onSubmit} autoComplete="off">
          <fieldset>
            <legend>Team details</legend>

            <div className="grid-2 grid-3-lg">
              <div className="field">
                <label>Team name <span className="req">*</span></label>
                <input
                  value={data.name}
                  onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g., Karachi United"
                  required
                />
              </div>

              <div className="field">
                <label>Sport</label>
                <select
                  value={data.sport}
                  onChange={e => setData(d => ({ ...d, sport: e.target.value }))}
                >
                  {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="tiny muted mt4">
                  Roster limit for <strong>{data.sport}</strong>: <strong>{maxForSport}</strong> players.
                </div>
              </div>

              <div className="field">
                <label>City</label>
                <select
                  value={data.city}
                  onChange={e => setData(d => ({ ...d, city: e.target.value }))}
                >
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Skill level</label>
                <select
                  value={data.level}
                  onChange={e => setData(d => ({ ...d, level: e.target.value }))}
                >
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Team type</label>
                <div className="seg">
                  {["Male", "Female", "Mixed"].map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`seg-btn ${data.teamType === t ? "active" : ""}`}
                      onClick={() => setData(d => ({ ...d, teamType: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Brand color</label>
                <div className="color-row">
                  <input
                    type="color"
                    value={data.color}
                    onChange={e => setData(d => ({ ...d, color: e.target.value }))}
                    aria-label="team brand color"
                  />
                  <span className="color-swatch" style={{ background: data.color }} />
                  <code>{data.color}</code>
                </div>
              </div>

              <div className="field">
                <label>Team logo</label>
                <div className="logo-row">
                  <div
                    className="logo-preview"
                    style={{ background: data.color }}
                    aria-label="logo preview"
                  >
                    {data.logoDataUrl ? (
                      <img src={data.logoDataUrl} alt="Team logo" />
                    ) : (
                      <span className="logo-fallback">
                        {(data.name || "T").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => fileRef.current?.click()}
                    >
                      Upload logo
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleLogoPick}
                    />
                    <div className="tiny muted">PNG/JPG, ≤ 2MB recommended.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="field">
              <label>About the team <span className="req">*</span></label>
              <textarea
                rows={4}
                value={data.about}
                onChange={e => setData(d => ({ ...d, about: e.target.value }))}
                placeholder="Achievements, goals, practice days, coach info, etc."
                required
              />
            </div>

            <div className="row-split">
              <label className="check">
                <input
                  type="checkbox"
                  checked={data.privateTeam}
                  onChange={e => setData(d => ({ ...d, privateTeam: e.target.checked }))}
                />
                Make team private (invite-only)
              </label>
            </div>

            {/* live requirement hints */}
            <ul className="req-checks" aria-live="polite">
              <li className={!missing.name ? "ok" : ""}>Team name ≥ 3 characters</li>
              <li className={!missing.about ? "ok" : ""}>About ≥ 10 characters</li>
              <li className={!missing.roster ? "ok" : ""}>At least 1 member in roster</li>
            </ul>
          </fieldset>

          <fieldset>
            <legend>Roster & members</legend>

            <div className="grid-2 grid-3@lg">
              <div className="field">
                <label>Member name</label>
                <input
                  value={member.name}
                  onChange={e => setMember(m => ({ ...m, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>

              <div className="field">
                <label>Gender</label>
                <select
                  value={member.gender}
                  onChange={e => setMember(m => ({ ...m, gender: e.target.value }))}
                >
                  {["Male", "Female"].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="field">
                <label>CNIC</label>
                <input
                  value={member.cnic}
                  onChange={e => setMember(m => ({ ...m, cnic: formatCnic(e.target.value) }))}
                  placeholder="#####-#######-#"
                  inputMode="numeric"
                />
                <div className="tiny muted mt4">Format: 13 digits or 5-7-1 with dashes.</div>
              </div>

              <div className="field">
                <label>Role / position</label>
                <select
                  value={member.role}
                  onChange={e => setMember(m => ({ ...m, role: e.target.value }))}
                >
                  <option value="">Choose…</option>
                  {rolesForSport.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Jersey # (optional)</label>
                <input
                  value={member.jersey}
                  onChange={e => setMember(m => ({ ...m, jersey: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                  placeholder="e.g., 7"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="roster-actions">
              <button className="btn red" type="button" onClick={addMember}>Add member</button>
              <div className="tiny muted">
                {data.roster.length}/{maxForSport} added for {data.sport}.
              </div>
            </div>

            <div className="roster-list">
              {data.roster.length ? data.roster.map(r => (
                <div key={r.id} className="roster-card">
                  <div className="rc-left" style={{ background: data.color }}>
                    <span>{(r.name || "?").slice(0, 1).toUpperCase()}</span>
                  </div>
                  <div className="rc-body">
                    <div className="rc-top">
                      <strong>{r.name}</strong>
                      {r.jersey && <span className="badge">#{r.jersey}</span>}
                    </div>
                    <div className="rc-meta">
                      <span>{r.gender}</span> · <span>{r.role || "Player"}</span> · <span>{r.cnic}</span>
                    </div>
                  </div>
                  <button className="icon-x" type="button" onClick={() => removeMember(r.id)} aria-label="Remove">×</button>
                </div>
              )) : <div className="empty">No members yet — add at least one.</div>}
            </div>
          </fieldset>

          <fieldset>
            <legend>Tournament (optional)</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={data.tournament}
                onChange={e => setData(d => ({ ...d, tournament: e.target.checked }))}
              />
              Register for a tournament now
            </label>

            {data.tournament && (
              <div className="grid-2 mt8">
                <div className="field">
                  <label>Tournament</label>
                  <select
                    value={data.tournamentId}
                    onChange={e => setData(d => ({ ...d, tournamentId: e.target.value }))}
                  >
                    {SAMPLE_TOURNAMENTS.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Division / Category</label>
                  <select
                    value={data.division}
                    onChange={e => setData(d => ({ ...d, division: e.target.value }))}
                  >
                    {["Open", "U19", "Women", "Corporate"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="tiny muted span-2">
                  We’ll submit a registration request to <strong>{tourneyName}</strong>. The organizer may contact you for verification/payment.
                </div>
              </div>
            )}
          </fieldset>

          {error && <div className="alert error" role="alert">{error}</div>}
          {ok && <div className="alert success" role="status">{ok}</div>}

          <div className="form-actions">
            <button className="btn ghost" type="button" onClick={() => nav("/explore-teams")}>
              Cancel
            </button>
            <button className="btn red" type="submit" disabled={!canSubmit || busy} title={!canSubmit ? "Complete the required fields above" : undefined}>
              {busy ? "Saving…" : "Create Team"}
            </button>
          </div>
        </form>

        {/* live preview */}
        <aside className="card ct-preview">
          <div className="preview-head">Live Preview</div>

          <div className="tp-banner" style={{ background: data.color }}>
            <div className="tp-banner-overlay" aria-hidden="true" />
            <div className="tp-banner-row">
              <div className="tp-logo">
                {data.logoDataUrl
                  ? <img src={data.logoDataUrl} alt="" />
                  : <span>{(data.name || "T").slice(0, 1).toUpperCase()}</span>}
              </div>

              <div className="tp-title-group">
                <h3 className="tp-name">{data.name || "Your Team Name"}</h3>
                <div className="tp-meta">
                  <span>{data.sport}</span> · <span>{data.city}</span> · <span>{data.level}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="tp-body">
            <p className="tp-about">{data.about || "Team bio preview will appear here."}</p>

            <div className="tp-section">
              <div className="tp-row">
                <div className="tp-label">Roster</div>
                <div className="tp-value">{rosterCount}/{SPORT_LIMITS[data.sport]}</div>
              </div>
              <div className="tp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
                <div className="tp-progress-bar" style={{ width: `${completion}%` }} />
              </div>

              <div className="tp-avatars">
                {data.roster.slice(0, 5).map(r => (
                  <span className="av" key={r.id} style={{ background: data.color }}>
                    {(r.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                ))}
                {rosterCount > 5 && (
                  <span className="av more">+{rosterCount - 5}</span>
                )}
              </div>
            </div>

            <div className="tp-tags">
              {data.privateTeam && <span className="pill">Private</span>}
              {data.teamType && <span className="pill">{data.teamType} team</span>}
              {data.tournament && (
                <span className="pill danger">
                  Registering: {SAMPLE_TOURNAMENTS.find(t => t.id === data.tournamentId)?.name}
                </span>
              )}
            </div>

            <div className="tp-actions">
              <button className="btn ghost" type="button">View profile</button>
              <button
                className="btn red"
                type="button"
                onClick={() => document.getElementById("team-form")?.requestSubmit()}
              >
                Create
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* review popup */}
      {showReview && (
        <div className="review-modal" role="dialog" aria-modal="true" aria-labelledby="rv-title">
          <div className="rv-card">
            <div className="rv-icon">✅</div>
            <h3 id="rv-title">Request submitted</h3>
            <p>Your team has been created. <strong>Your request will be reviewed.</strong> You’ll be notified once approved.</p>
            <div className="rv-actions">
              <button className="btn ghost" onClick={() => setShowReview(false)}>Close</button>
              <button className="btn red" onClick={() => nav("/explore-teams")}>Go to Explore Teams</button>
            </div>
          </div>
        </div>
      )}

      {/* Login gate for guest mode */}
      <LoginGateModal
        open={gateOpen}
        message="Please log in to create a team."
        onClose={goHome}
        onConfirm={goLogin}
      />
    </div>
  );
}
