import "./matchcard.css";
import { NavLink } from "react-router-dom";

export default function MatchCard({ match = {} }) {
  const teams = Array.isArray(match.teams) && match.teams.length >= 2
    ? match.teams
    : ["Home", "Away"];

  const score = match.score ?? "—";
  const comp  = match.comp  ?? "";
  const city  = match.city  ?? "";

  return (
    <article className="match-card" aria-label={`${teams[0]} vs ${teams[1]}`}>
      <div className="teams">
        <strong>{teams[0]}</strong>
        <span>vs</span>
        <strong>{teams[1]}</strong>
      </div>

      <div className="score">{score}</div>

      <div className="meta">
        {[comp, city].filter(Boolean).join(" · ")}
      </div>

      <div className="actions">
        {/* Red button (Watch) — hover behavior per global styles */}
        <NavLink
          to="/login"
          className="btn btn-watch"
          aria-label={`Watch ${teams[0]} vs ${teams[1]}`}
        >
          Watch
        </NavLink>

        {/* Blue button (Remind me) — invert on hover */}
        <NavLink
          to="/login"
          className="btn btn-remind"
          aria-label={`Remind me about ${teams[0]} vs ${teams[1]}`}
        >
          Remind me
        </NavLink>
      </div>
    </article>
  );
}
