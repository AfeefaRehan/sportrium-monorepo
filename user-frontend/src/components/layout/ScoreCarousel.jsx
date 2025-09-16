import { useEffect, useMemo, useRef, useState } from "react";
import "./scorecarousel.css";

export default function ScoreCarousel({
  items = [],
  onWatch,
  onRemind,
  onBuy,
  showNav = true, // 👈 new prop
}) {
  const trackRef = useRef(null);
  const [step, setStep] = useState(640);

  // responsive scroll step
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const calc = () => {
      const card = el.querySelector(".score-slide");
      const w = card ? card.offsetWidth : 320;
      setStep(Math.max(320, w) * 2);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasItems = Array.isArray(items) && items.length > 0;
  const regionLabel = useMemo(
    () => `Live scores carousel${hasItems ? ` (${items.length} items)` : ""}`,
    [hasItems, items.length]
  );

  const scrollByCards = (dir = 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const onWheel = (e) => {
    const el = trackRef.current;
    if (!el) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaX || e.deltaY, behavior: "smooth" });
    }
  };

  return (
    <div className="score-carousel">
      {showNav && (
        <button
          className="nav-btn nav-left"
          aria-label="Previous"
          onClick={() => scrollByCards(-1)}
          type="button"
        >
          ‹
        </button>
      )}

      <div
        className="score-track"
        ref={trackRef}
        role="region"
        aria-label={regionLabel}
        tabIndex={0}
        onWheel={onWheel}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); scrollByCards(1); }
          if (e.key === "ArrowLeft")  { e.preventDefault(); scrollByCards(-1); }
        }}
      >
        {hasItems ? (
          items.map((s) => (
            <article key={s.id} className="score-slide">
              <div className="thumb-wrap">
                {s.img ? (
                  <img src={s.img} alt={s.teams || "match thumbnail"} loading="lazy" />
                ) : (
                  <div className="img-fallback" />
                )}
                {s.league ? <div className="pill">{s.league}</div> : null}
                {s.live && <span className="live-dot" aria-label="Live" />}
              </div>

              <div className="slide-body">
                <div className="teams">{s.teams || "Home vs Away"}</div>

                <div className="meta-row">
                  <div className="score">{s.score ?? "—"}</div>

                  <div className="btns">
                    {/* Watch */}
                    <button className="btn btn-watch" onClick={() => onWatch?.(s)} type="button">
                      Watch Now
                    </button>

                    {/* Remind me */}
                    <button className="btn btn-remind" onClick={() => onRemind?.(s)} type="button">
                      Remind me
                    </button>

                    {/* Buy tickets */}
                    <button className="btn ghost buy-btn" onClick={() => onBuy?.(s)} type="button">
                      Buy tickets
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="score-empty">No live scores right now.</div>
        )}
      </div>

      {showNav && (
        <button
          className="nav-btn nav-right"
          aria-label="Next"
          onClick={() => scrollByCards(1)}
          type="button"
        >
          ›
        </button>
      )}
    </div>
  );
}
