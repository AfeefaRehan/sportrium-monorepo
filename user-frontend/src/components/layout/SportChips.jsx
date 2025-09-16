import "./sportchips.css";

export default function SportChips({ selected, onSelect, counts = {} }) {
  const sports = Object.keys(counts);

  if (!sports.length) return null;

  return (
    <div className="sport-chips" role="tablist" aria-label="Sports filter">
      {sports.map((s) => (
        <button
          key={s}
          className={`chip ${selected === s ? "active" : ""}`}
          onClick={() => onSelect?.(s)}
          role="tab"
          aria-selected={selected === s}
        >
          {s}
          <span className="count">{counts[s]}</span>
        </button>
      ))}
    </div>
  );
}
