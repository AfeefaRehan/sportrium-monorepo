// src/pages/onboarding/Preferences.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/preferences.css";

export default function Preferences() {
  const base = (import.meta?.env?.BASE_URL || "/").replace(/\/+$/, "") + "/";
  const navigate = useNavigate();

  const SPORTS = useMemo(
    () => [
      { id: "football",   name: "Football",   icon: base + "icons/football.svg" },
      { id: "cricket",    name: "Cricket",    icon: base + "icons/cricket.svg" },
      { id: "basketball", name: "Basketball", icon: base + "icons/basketball.svg" },
      { id: "badminton",  name: "Badminton",  icon: base + "icons/badminton.svg" },
      { id: "tennis",     name: "Tennis",     icon: base + "icons/tennis.svg" },
    ],
    [base]
  );

  const [selected, setSelected] = useState([]);   // max 3
  const [city, setCity] = useState("");

  // Prefill if already saved
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem("prefs") || "null");
      const b = JSON.parse(localStorage.getItem("preferences") || "null");
      const v = a && typeof a === "object" ? a : b || {};
      if (Array.isArray(v.sports)) setSelected(v.sports.slice(0, 3));
      if (typeof v.city === "string") setCity(v.city);
    } catch {}
  }, []);

  const maxReached  = selected.length >= 3;
  const canContinue = selected.length >= 1 && city.trim().length > 1;

  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3)  return prev;
      return [...prev, id];
    });
  };

  const saveAndGo = async () => {
    const prefs = { sports: selected, city: city.trim() };
    try {
      // Write to both keys for compatibility with Home
      localStorage.setItem("preferences", JSON.stringify(prefs));
      localStorage.setItem("prefs", JSON.stringify(prefs));
    } catch {}

    // notify any listeners (Home listens to this)
    try { window.dispatchEvent(new CustomEvent("prefs:updated", { detail: prefs })); } catch {}

    // ✅ Go to the true Home route ("/") — avoids your /home 404
    navigate("/", { replace: true });
  };

  return (
    <div className="pref-screen" data-theme={localStorage.getItem("theme") || "light"}>
      <div className="pref-card-xl" role="region" aria-label="Choose your preferences">
        <header className="pref-header">
          <h1>Tell us what you like</h1>
          <p>
            Select <strong>up to 3</strong> sports. We’ll tailor matches and reminders for you.
          </p>
        </header>

        <div className="sport-grid">
          {SPORTS.map((s) => {
            const active   = selected.includes(s.id);
            const disabled = maxReached && !active;
            return (
              <button
                key={s.id}
                type="button"
                className={"sport-card" + (active ? " active" : "") + (disabled ? " disabled" : "")}
                onClick={() => toggle(s.id)}
                aria-pressed={active}
                disabled={disabled}
                aria-label={active ? `${s.name} selected` : `Select ${s.name}`}
              >
                <img src={s.icon} alt="" aria-hidden="true" />
                <span>{s.name}</span>
                <i className="tick" aria-hidden="true">✓</i>
              </button>
            );
          })}
        </div>

        <div className="city-block">
          <label htmlFor="city">Which city do you usually watch or play in?</label>
          <div className="city-row">
            <input
              id="city"
              className="city-input"
              placeholder="e.g., Karachi, Lahore, Islamabad"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <button
              className={"btn primary go" + (canContinue ? "" : " disabled")}
              onClick={saveAndGo}
              disabled={!canContinue}
            >
              Continue
            </button>
          </div>
          <p className="small-hint">Pick up to 3 sports. You can update this later in Settings.</p>
        </div>
      </div>
    </div>
  );
}
