import "./leaguesection.css";

export default function LeagueSection({ title, matches = [], onWatch, onRemind, onBuy }) {
  const hasMatches = Array.isArray(matches) && matches.length > 0;

  return (
    <section className="league-section" aria-labelledby={`ls-${slugify(title)}`}>
      <div className="ls-head">
        <h3 id={`ls-${slugify(title)}`}>{title}</h3>
      </div>

      {!hasMatches ? (
        <div className="ls-empty">No matches available.</div>
      ) : (
        <div className="ls-grid">
          {matches.map((m) => (
            <article className="ls-card" key={m.id}>
              <div className="ls-top">
                {m.badge ? <img src={m.badge} alt="" loading="lazy" /> : <div className="ls-fallback" />}
                {m.badgeText ? <span className="pill">{m.badgeText}</span> : null}
              </div>

              <div className="ls-body">
                <div className="teams">{m.teams}</div>
                <div className="score">{m.score}</div>
                <div className="meta">
                  {m.meta}
                  {m.sport ? <> · {m.sport}</> : null}
                </div>

                <div className="actions">
                  <button className="btn btn-watch" onClick={() => onWatch?.(m)} type="button">
                    Watch
                  </button>
                  <button className="btn btn-remind" onClick={() => onRemind?.(m)} type="button">
                    Remind me
                  </button>
                  <button className="btn ghost" onClick={() => onBuy?.(m)} type="button">
                    Buy tickets
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function slugify(s = "") {
  return String(s).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
