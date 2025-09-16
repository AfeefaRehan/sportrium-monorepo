import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EVENTS, SPORT_LABEL, SPORT_ICON } from "@/data/events";
import { useAuth } from "@/context/AuthContext.jsx";
import "@/styles/host.css";

export default function EventDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const ev = useMemo(() => EVENTS.find(e => e.slug === slug), [slug]);

  const [reg, setReg] = useState({
    teamName: "", captain: "", phone: "", email: "", city: "",
    roster: 5, category: "Open", level: "Intermediate",
    jersey: "Blue", slot: "", notes: "", agree: false,
  });
  const onChange = (k, v) => setReg(r => ({ ...r, [k]: v }));

  if (!ev) return <div className="page" style={{ padding: 16 }}>Event not found.</div>;

  const remaining = Math.max(ev.slots - ev.filled, 0);
  const canRegister = remaining > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: `/events/${slug}#register` }, replace: true });
      return;
    }
    if (!reg.agree) return;
    const prev = JSON.parse(localStorage.getItem("eventRegs") || "[]");
    prev.push({ eventId: ev.id, by: user?.email || "user", at: Date.now(), ...reg });
    localStorage.setItem("eventRegs", JSON.stringify(prev));
    alert("Registered! Organizer will contact you for verification.");
    setReg(r => ({ ...r, teamName: "", captain: "", phone: "", email: "", notes: "" }));
  };

  const base = import.meta.env.BASE_URL || "/";
  const hostInitials = (name="") =>
    name.split(" ").map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase();

  return (
    <div className="event-page">
      {/* HERO STRIP */}
      <header className="event-hero">
        <div className="hero-left">
          <span className={`badge sport ${ev.sport}`}>
            {SPORT_ICON(ev.sport)} {SPORT_LABEL(ev.sport)}
          </span>
          <h1 className="ev-title">{ev.title}</h1>
          <div className="ev-sub">{ev.venue} • {ev.city}</div>
          <div className="ev-meta">
            <span className="tag">{new Date(ev.date).toLocaleDateString()} — {ev.time}</span>
            <span className="tag">Slots {ev.filled}/{ev.slots}</span>
            <span className="tag">Entry Rs {ev.entryFee}</span>
          </div>
        </div>
        <div className="hero-right">
          {ev.banner ? (
            <img className="mini-vid" src={ev.banner} alt="" />
          ) : (
            <video className="mini-vid" src={`${base}videos/host-hero.mp4`} autoPlay muted loop playsInline />
          )}
        </div>
      </header>

      {/* CONTENT GRID */}
      <div className="ev-grid">
        {/* ---------- LEFT: OVERVIEW / SCHEDULE / RULES ---------- */}
        <section className="stack">
          {/* Organizer + About */}
          <div className="card">
            <div className="org-row">
              <div className="org-left">
                {ev.host?.avatar ? (
                  <img className="org-avatar" src={ev.host.avatar} alt={ev.host.name} />
                ) : (
                  <div className="org-avatar initials">{hostInitials(ev.host?.name)}</div>
                )}
                <div>
                  <div className="org-name">
                    {ev.host?.name}
                    {ev.host?.verified && <span className="verify">✔</span>}
                  </div>
                  <div className="org-type">{ev.host?.type}</div>
                </div>
              </div>
              <div className="org-contact">
                {ev.host?.phone && <span className="pill soft">📞 {ev.host.phone}</span>}
                {ev.host?.email && <span className="pill soft">✉️ {ev.host.email}</span>}
              </div>
            </div>

            <div className="about-block">
              <div className="about-line">
                <span className="k">Format</span>
                <span className="v">{ev.format}</span>
              </div>
              <p className="about-text">{ev.description}</p>
            </div>
          </div>

          {/* Schedule timeline */}
          {ev.games?.length > 0 && (
            <div className="card">
              <h3 className="card-title">Games / Schedule</h3>
              <ul className="timeline">
                {ev.games.map((g, i) => (
                  <li key={i} className="tl-item">
                    <span className="dot" />
                    <div className="tl-body">
                      <div className="tl-title">{g.round}</div>
                      <div className="tl-sub">
                        {new Date(g.when).toLocaleString()}
                        {g.sport ? ` • ${SPORT_ICON(g.sport)} ${g.sport[0].toUpperCase()+g.sport.slice(1)}` : ""}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rules + Disqualifications + Eligibility */}
          <div className="card">
            <h3 className="card-title">Rules & Eligibility</h3>
            <div className="rules-grid">
              <div>
                <div className="subhead">General rules</div>
                <ul className="bullets">
                  {ev.rules?.map((r,i)=><li key={i}>{r}</li>)}
                </ul>
              </div>
              <div>
                <div className="subhead">Eligibility</div>
                <ul className="bullets">
                  {ev.eligibility?.map((r,i)=><li key={i}>{r}</li>)}
                </ul>
              </div>
              <div>
                <div className="subhead bad">Disqualification (DQ)</div>
                <ul className="bullets bad">
                  {ev.disqualify?.map((r,i)=><li key={i}>{r}</li>)}
                </ul>
              </div>
            </div>

            <div className="deadline">
              <span>Registration closes:</span> <b>{new Date(ev.regDeadline).toLocaleDateString()}</b>
            </div>
          </div>
        </section>

        {/* ---------- RIGHT: MAP / REGISTER / MORE ---------- */}
        <aside className="side">
          <div className="card">
            <h3 className="card-title">Location</h3>
            <div className="mapwrap">
              <iframe
                title="map"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${ev.lng-0.01}%2C${ev.lat-0.01}%2C${ev.lng+0.01}%2C${ev.lat+0.01}&layer=mapnik&marker=${ev.lat}%2C${ev.lng}`}
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              {ev.venue}, {ev.city}
            </div>
          </div>

          <div id="register" className="card reg-card slide-in">
            <div className="reg-head">
              <h3 className="card-title">Register your team</h3>
              <div className="reg-meta">
                <span className="pill soft">Remaining: <b>{remaining}</b></span>
                <span className="pill soft">Entry: <b>Rs {ev.entryFee}</b></span>
                <span className="pill soft">Deadline: <b>{new Date(ev.regDeadline).toLocaleDateString()}</b></span>
              </div>
            </div>

            {!canRegister ? (
              <div className="empty">Registration closed / full.</div>
            ) : (
              <form onSubmit={submit} className="reg-form">
                <div className="grid2">
                  <div className="field">
                    <label>Team name</label>
                    <input required value={reg.teamName} onChange={e=>onChange("teamName", e.target.value)} placeholder="e.g. Gulshan United" />
                  </div>
                  <div className="field">
                    <label>Captain name</label>
                    <input required value={reg.captain} onChange={e=>onChange("captain", e.target.value)} placeholder="Full name" />
                  </div>

                  <div className="field">
                    <label>Contact phone</label>
                    <input required inputMode="tel" pattern="^[0-9+\\-\\s]{8,}$" value={reg.phone} onChange={e=>onChange("phone", e.target.value)} placeholder="+92-3xx-xxxxxxx" />
                    <small className="help">Organizer will use this to confirm your slot.</small>
                  </div>
                  <div className="field">
                    <label>Contact email (optional)</label>
                    <input type="email" value={reg.email} onChange={e=>onChange("email", e.target.value)} placeholder="name@email.com" />
                  </div>

                  <div className="field">
                    <label>City</label>
                    <input value={reg.city} onChange={e=>onChange("city", e.target.value)} placeholder="Karachi / Lahore / …" />
                  </div>
                  <div className="field">
                    <label>Roster size</label>
                    <input type="number" min="1" max="30" value={reg.roster} onChange={e=>onChange("roster", e.target.value)} />
                  </div>
                </div>

                <div className="subhead">Category & level</div>
                <div className="pillset">
                  {["Open","Men","Women","Mixed"].map(c=>(
                    <button type="button" key={c} className={"pill-opt"+(reg.category===c?" on":"")} onClick={()=>onChange("category",c)}>{c}</button>
                  ))}
                </div>
                <div className="pillset">
                  {["Beginner","Intermediate","Advanced"].map(l=>(
                    <button type="button" key={l} className={"pill-opt"+(reg.level===l?" on":"")} onClick={()=>onChange("level",l)}>{l}</button>
                  ))}
                </div>

                <div className="grid2">
                  <div className="field">
                    <label>Preferred jersey color</label>
                    <input value={reg.jersey} onChange={e=>onChange("jersey", e.target.value)} placeholder="Blue / Red / Black…" />
                  </div>
                  <div className="field">
                    <label>Preferred slot</label>
                    <select value={reg.slot} onChange={e=>onChange("slot", e.target.value)}>
                      <option value="">{ev.games?.length ? "Select…" : "No fixed slots"}</option>
                      {ev.games?.map((g,i)=>(
                        <option key={i} value={g.when}>{`${g.round} — ${new Date(g.when).toLocaleString()}`}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Notes for organizer (optional)</label>
                  <textarea rows="3" value={reg.notes} onChange={e=>onChange("notes", e.target.value)} placeholder="Any special request, kit info, invoicing, etc." />
                </div>

                <label className="check">
                  <input type="checkbox" checked={reg.agree} onChange={e=>onChange("agree", e.target.checked)} />
                  <span>I agree to event rules & Sportrium policies.</span>
                </label>

                <button className="btn primary big" disabled={!reg.teamName || !reg.captain || !reg.phone || !reg.agree}>
                  {user ? "Submit registration" : "Log in to register"}
                </button>
              </form>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">More events</h3>
            <div className="more">
              {EVENTS.filter(e=>e.id!==ev.id).slice(0,3).map(e => (
                <Link key={e.id} to={`/events/${e.slug}`} className="more-item">
                  <span className="emoji">{SPORT_ICON(e.sport)}</span>
                  <span className="t">{e.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
