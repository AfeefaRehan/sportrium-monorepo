import { useMemo, useRef } from "react";
import "./shelf.css";
import MatchCard from "./MatchCard";

export default function Shelf({ country = "", matches = [] }) {
  if (!Array.isArray(matches) || matches.length === 0) return null;

  const scrollerRef = useRef(null);
  const regionLabel = useMemo(
    () => `Matches in ${country || "this country"} (${matches.length})`,
    [country, matches.length]
  );

  const onWheel = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    // shift key (or horizontal delta) → scroll the shelf horizontally
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaX || e.deltaY, behavior: "smooth" });
    }
  };

  return (
    <section className="shelf" aria-labelledby={`shelf-${slug(country)}`}>
      <h3 id={`shelf-${slug(country)}`}>{country}</h3>

      <div
        className="shelf-scroll"
        ref={scrollerRef}
        role="region"
        aria-label={regionLabel}
        tabIndex={0}
        onWheel={onWheel}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); scrollerRef.current?.scrollBy({ left: 360, behavior: "smooth" }); }
          if (e.key === "ArrowLeft")  { e.preventDefault(); scrollerRef.current?.scrollBy({ left: -360, behavior: "smooth" }); }
        }}
      >
        {matches.map((m) => (
          <MatchCard key={m.id ?? `${m.comp}-${m.city}-${m.score}`} match={m} />
        ))}
      </div>
    </section>
  );
}

function slug(s = "") {
  return String(s).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
