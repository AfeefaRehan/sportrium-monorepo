import { Link } from "react-router-dom";
import { useReminders } from "@/context/RemindersContext.jsx";
import "@/styles/reminders.css";

/* ---- Quick-add suggestions (dummy) ---- */
const SUGGESTIONS = [
  {
    id: "sg-001",
    title: "Karachi United vs Korangi FC",
    startISO: new Date().toISOString().slice(0, 10) + "T18:30:00+05:00",
    venue: "KU Ground",
    city: "Karachi",
    sport: "football",
    href: "/live",
  },
  {
    id: "sg-002",
    title: "Lahore Lions vs Model Town",
    startISO: addDaysISO(1) + "T15:00:00+05:00",
    venue: "LL Stadium",
    city: "Lahore",
    sport: "cricket",
    href: "/live",
  },
  {
    id: "sg-003",
    title: "DHA United vs Lyari Wolves",
    startISO: addDaysISO(3) + "T19:00:00+05:00",
    venue: "DHA Sports Complex",
    city: "Karachi",
    sport: "football",
    href: "/live",
  },
  {
    id: "sg-004",
    title: "Gulshan Eagles vs North Nazimabad",
    startISO: addDaysISO(7) + "T17:30:00+05:00",
    venue: "City Arena",
    city: "Karachi",
    sport: "basketball",
  },
];

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function isSameDay(aISO, b = new Date()) {
  const a = new Date(aISO);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

/* ----------------- pretty toggle ----------------- */
// Make the toggle a simple label (no light-ui here)
function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e)=>onChange?.(e.target.checked)} />
      <span className="track"><span className="thumb" /></span>
      <span className="tcopy"><strong>{label}</strong>{hint && <em>{hint}</em>}</span>
    </label>
  );
}

/* ============================ page ============================ */
export default function Reminders() {
  const {
    reminders,
    addReminder,
    removeReminder,
    hourlyEnabled,
    toggleHourly,
    bgPushEnabled,
    toggleBgPush,
  } = useReminders();

  const now = new Date();
  const todays = reminders
    .filter((r) => isSameDay(r.startISO, now))
    .sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

  const upcoming = reminders
    .filter((r) => new Date(r.startISO) > now && !isSameDay(r.startISO, now))
    .sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

  const nextUp = upcoming[0];
  const total = reminders.length;

  const addFromSuggestion = (s) => addReminder(s);

  return (
    <div className="rem-page">
      {/* HERO / HEADER */}
      <section className="rem-hero">
        <div className="rem-hero-copy">
          <h1>Reminders</h1>
          <p>
            We’ll nudge you before kick-off. Add reminders from the{" "}
            <Link to="/schedule" className="link-hero">
              Schedule
            </Link>{" "}
            or use quick suggestions below.
          </p>
        </div>

        <div className="rem-stats">
          <div className="stat">
            <span className="k">{total}</span>
            <span className="l">Saved</span>
          </div>
          <div className="stat">
            <span className="k">{todays.length}</span>
            <span className="l">Today</span>
          </div>
          <div className="stat">
            <span className="k">
              {nextUp ? fmtDateTime(nextUp.startISO).time : "—"}
            </span>
            <span className="l">{nextUp ? "Next" : "No upcoming"}</span>
          </div>
        </div>
      </section>

      {/* TOGGLES */}
 <div className="rem-controls card light-ui">

        <Toggle
          checked={hourlyEnabled}
          onChange={toggleHourly}
          label="Hourly checks"
          hint="Works while this tab is open"
        />
        <Toggle
          checked={bgPushEnabled}
          onChange={toggleBgPush}
          label="Background push"
          hint="Enable FCM push notifications"
        />
        <div className="rem-ctrl-spacer" />
        <Link to="/schedule" className="btn blue">
          Browse schedule
        </Link>
      </div>

      {/* LISTS */}
      {total ? (
        <div className="rem-sections">
          {todays.length > 0 && (
            <section className="rem-group">
              <div className="group-head">
                <h2>Today</h2>
                <span className="count">{todays.length}</span>
              </div>
              <div className="rem-list timeline">
                {todays.map((r) => (
                  <ReminderCard key={r.id} r={r} onRemove={removeReminder} />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="rem-group">
              <div className="group-head">
                <h2>Upcoming</h2>
                <span className="count">{upcoming.length}</span>
              </div>
              <div className="rem-list timeline">
                {upcoming.map((r) => (
                  <ReminderCard key={r.id} r={r} onRemove={removeReminder} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <section className="rem-empty card">
          <div className="empty-emoji" aria-hidden>
            ⏰
          </div>
          <h3>No reminders yet</h3>
          <p>
            Tap <strong>Remind me</strong> on any match card, or add one from
            the suggestions below.
          </p>
          <Link to="/schedule" className="btn blue">
            Go to Schedule
          </Link>
        </section>
      )}

      {/* SUGGESTIONS */}
      <section className="rem-group">
        <div className="group-head">
          <h2>Quick add</h2>
          <span className="hint">Personalized picks</span>
        </div>

        <div className="rem-list suggestions">
          {SUGGESTIONS.map((s) => (
            <div key={s.id} className="rem-card rem-suggestion">
              <div className="dot" aria-hidden />
              <div className="rem-left">
                <div className="rem-time">
                  <div className="t">{fmtDateTime(s.startISO).time}</div>
                  <div className="d">{fmtDateTime(s.startISO).date}</div>
                </div>
                <div className="rem-body">
                  <div className="rem-title">{s.title}</div>
                  <div className="rem-meta">
                    {s.city}
                    {s.venue ? ` · ${s.venue}` : ""}
                  </div>
                  {s.sport && <span className="badge-sport">{s.sport}</span>}
                </div>
              </div>

              <div className="rem-actions">
                {s.href ? (
                  <Link to={s.href} className="btn ghost">
                    View
                  </Link>
                ) : null}
                <button className="btn blue" onClick={() => addFromSuggestion(s)}>
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ----------------- item ----------------- */
function ReminderCard({ r, onRemove }) {
  const { date, time } = fmtDateTime(r.startISO);

  return (
    <div className="rem-card">
      <div className="dot" aria-hidden />
      <div className="rem-left">
        <div className="rem-time">
          <div className="t">{time}</div>
          <div className="d">{date}</div>
        </div>
        <div className="rem-body">
          <div className="rem-title">{r.title}</div>
          <div className="rem-meta">
            {r.city ? r.city : ""}
            {r.venue ? ` · ${r.venue}` : ""}
          </div>
        </div>
      </div>

      <div className="rem-actions">
        {r.href ? (
          <Link to={r.href} className="btn ghost">
            View
          </Link>
        ) : null}
        <button className="btn red" onClick={() => onRemove(r.id)}>
          Remove
        </button>
      </div>
    </div>
  );
}
