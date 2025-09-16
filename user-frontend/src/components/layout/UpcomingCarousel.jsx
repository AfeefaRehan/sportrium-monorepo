// src/components/layout/UpcomingCarousel.jsx
import { useRef } from "react";

const DEFAULT_ITEMS = [
  { id: 1, sport: "Cricket", title: "Lions vs Hawks", time: "19:00" },
  { id: 2, sport: "Football", title: "Uni A vs Uni B", time: "20:30" },
  { id: 3, sport: "Badminton", title: "Shuttle Kings vs Smashers", time: "21:15" },
  { id: 4, sport: "Tennis", title: "Aces vs Spinners", time: "22:00" },
];

export default function UpcomingCarousel({ items = DEFAULT_ITEMS }) {
  const scrollerRef = useRef(null);

  const scrollByCards = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector(".up-card");
    const step = card ? card.offsetWidth + 16 : 320;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  return (
    <section className="up-sec" aria-labelledby="up-title">
      <div className="up-head">
        <h2 id="up-title">Coming up next</h2>
        <a className="btn blue" href="/schedule">Explore more →</a>
      </div>

      <div className="up-wrap">
        <button
          type="button"
          className="up-nav left"
          aria-label="Previous"
          onClick={() => scrollByCards(-1)}
        >
          ‹
        </button>

        <div className="up-scroller" ref={scrollerRef}>
          {items.map((m) => (
            <article key={m.id} className="up-card" role="group" aria-label={`${m.sport}: ${m.title}`}>
              <div className="up-sport">{m.sport}</div>
              <div className="up-title">{m.title}</div>
              <div className="up-time">{m.time}</div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="up-nav right"
          aria-label="Next"
          onClick={() => scrollByCards(1)}
        >
          ›
        </button>
      </div>

      <style>{`
        .up-sec{ margin-top: 20px; }
        .up-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .up-head h2{ margin:0; font-weight:900; }

        /* Give the wrapper real height so 50% vertical centering is perfect */
        .up-wrap{ position:relative; padding: 0 48px; min-height: 160px; }

        .up-scroller{
          display:flex; gap:16px; overflow-x:auto; scroll-snap-type:x mandatory;
          padding: 4px 0 10px;
        }
        .up-scroller::-webkit-scrollbar{ height:8px; }
        .up-scroller::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.18); border-radius:999px; }
        .up-scroller::-webkit-scrollbar-track{ background: rgba(0,0,0,.06); border-radius:999px; }

        .up-card{
          min-width: 420px; height: 140px; border-radius: 18px; background:#fff;
          box-shadow: 0 8px 24px rgba(0,0,0,.10); border:1px solid #eef1f4; padding: 16px;
          display:flex; flex-direction:column; justify-content:space-between;
          scroll-snap-align:start;
        }
        .up-sport{ font-weight:700; opacity:.7; }
        .up-title{ font-weight:900; }
        .up-time{ color:#2563eb; font-weight:800; }

        .up-nav{
          position:absolute; top:50%; transform: translateY(-50%);
          width:40px; height:40px; border:0; border-radius:999px; z-index:3;
          background:#ffffff; color:#0f172a; cursor:pointer; display:grid; place-items:center;
          font-size:22px; line-height:1; box-shadow:0 8px 24px rgba(0,0,0,.18);
        }
        .up-nav.left{ left: 8px; }
        .up-nav.right{ right: 8px; }
        .up-nav:hover{ background:#f1f5f9; }

        @media (max-width: 900px){
          .up-wrap{ padding: 0 40px; }
          .up-card{ min-width: 340px; height: 132px; }
        }
      `}</style>
    </section>
  );
}
