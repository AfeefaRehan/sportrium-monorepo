// src/components/layout/common/RemindButton.jsx
import { useNavigate } from "react-router-dom";
import { useReminders } from "../../../context/RemindersContext.jsx";

function buildStartISO(m) {
  if (m.startISO) return m.startISO;
  if (m.date && m.time) return `${m.date}T${m.time}:00+05:00`; // Asia/Karachi offset example
  const d = new Date(); d.setHours(20,0,0,0); // default: aaj 8pm
  return d.toISOString();
}

export default function RemindButton({ match, gotoOnAdd = true }) {
  const { isReminded, addReminder, removeReminder } = useReminders();
  const nav = useNavigate();

  const on = isReminded(match.id);
  const handle = async () => {
    if (on) { await removeReminder(match.id); return; }
    // ensure required fields
    const payload = {
      id: match.id,
      title: match.title || `${match.home ?? "Home"} vs ${match.away ?? "Away"}`,
      startISO: buildStartISO(match),
      venue: match.venue,
      city: match.city,
      href: match.href,
    };
    await addReminder(payload);
    if (gotoOnAdd) nav("/reminders");  // add hone ke turant baad Reminders page khul jaaye
  };

  return (
    <button
      onClick={handle}
      className={`btn btn-remind ${on ? "is-on" : ""}`}
      aria-label={on ? "Reminder added" : "Remind me"}
    >
      {on ? "Reminded" : "Remind me"}
    </button>
  );
}
