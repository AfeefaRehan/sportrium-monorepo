import "./ticker.css";

export default function Ticker({ matches = [] }) {
  if (!Array.isArray(matches) || matches.length === 0) return null;

  return (
    <div className="ticker" role="region" aria-label="Live scores ticker">
      <div className="ticker-track">
        {matches.map((m, i) => {
          const teams = Array.isArray(m.teams) && m.teams.length >= 2
            ? `${m.teams[0]} vs ${m.teams[1]}`
            : "Match";

          return (
            <div
              key={m.id ?? `${m.city}-${i}`}
              className="ticker-item"
              aria-label={`${m.city} ${teams} score ${m.score}`}
            >
              {m.city} • {teams} · {m.score ?? "—"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
