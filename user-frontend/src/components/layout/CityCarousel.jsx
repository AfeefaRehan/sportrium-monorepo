// src/components/layout/CityCarousel.jsx
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function CityCarousel({ items = [] }) {
  const scrollerRef = useRef(null);
  const nav = useNavigate();

  const goToSchedule = (city) => {
    if (city) {
      nav(`/schedule?city=${encodeURIComponent(city)}`);
    } else {
      nav("/schedule");
    }
  };

  const scrollByCards = (dir = 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector(".city-card");
    const step = card ? card.offsetWidth + 16 : 320;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  return (
    <section className="city-sec" aria-labelledby="city-sec-title">
      <div className="city-sec-head">
        <h2 id="city-sec-title">Explore matches by city</h2>
        {/* Top-right Explore takes user to the Schedule page */}
        <button className="btn blue ghost" onClick={() => goToSchedule()}>
          Explore more →
        </button>
      </div>

      <div className="city-wrap">
        <button
          type="button"
          className="city-nav left"
          aria-label="Previous cities"
          onClick={() => scrollByCards(-1)}
        >
          ‹
        </button>

        <div className="city-scroller" ref={scrollerRef}>
          {items.map((c) => (
            <article key={c.id} className="city-card">
              <div className="city-grad" />
              {/* This pill now routes to the Schedule page for that city */}
              <button
                type="button"
                className="city-pill"
                aria-label={`Explore more in ${c.city}`}
                onClick={() => goToSchedule(c.city)}
              >
                Explore more in →
              </button>
              <div className="city-meta">
                <span className="city-name">{c.city}</span>
                <span className="city-sub">{c.title || "matches ·"}</span>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="city-nav right"
          aria-label="Next cities"
          onClick={() => scrollByCards(1)}
        >
          ›
        </button>
      </div>

      {/* scoped styles */}
      <style>{`
        .city-sec{ margin-top:18px; }
        .city-sec-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
        .city-sec-head h2{ margin:0; font-weight:900; }

        /* Padding so arrows don't overlap first/last card */
        .city-wrap{ position:relative; padding: 0 48px; }

        .city-scroller{
          display:flex; gap:16px; overflow-x:auto; scroll-snap-type:x mandatory;
          padding-bottom:8px;
        }
        .city-scroller::-webkit-scrollbar{ height:8px; }
        .city-scroller::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.18); border-radius:999px; }
        .city-scroller::-webkit-scrollbar-track{ background: rgba(0,0,0,.06); border-radius:999px; }

        .city-card{
          position:relative; min-width:320px; height:170px; border-radius:18px; overflow:hidden;
          background:#0f172a; color:#fff; scroll-snap-align:start; box-shadow:0 8px 30px rgba(0,0,0,.18);
        }
        .city-grad{ position:absolute; inset:0; background: linear-gradient(180deg, rgba(255,255,255,.65), rgba(15,23,42,1) 80%); opacity:.75; }
        .city-pill{
          position:absolute; left:16px; top:16px; border:0; border-radius:999px; padding:10px 16px;
          font-weight:800; cursor:pointer; background:#fff; color:#0f172a; box-shadow:0 6px 16px rgba(0,0,0,.12);
        }
        .city-pill:hover{ background:#f1f5f9; }

        .city-meta{ position:absolute; left:18px; bottom:16px; right:18px; display:flex; gap:10px; color:#e5e7eb; }
        .city-name{ font-weight:900; color:#fff; font-size:18px; }
        .city-sub{ opacity:.9; }

        .city-nav{
          position:absolute; top:50%; transform:translateY(-50%);
          width:40px; height:40px; border:0; border-radius:999px; z-index:3;
          background:#ffffff; color:#0f172a; cursor:pointer; display:grid; place-items:center;
          font-size:22px; line-height:1; box-shadow:0 8px 24px rgba(0,0,0,.18);
        }
        .city-nav.left{ left: 8px; }
        .city-nav.right{ right: 8px; }
        .city-nav:hover{ background:#f1f5f9; }

        @media (max-width:720px){
          .city-wrap{ padding: 0 40px; }
          .city-card{ min-width:280px; }
          .city-nav.left{ left: 6px; }
          .city-nav.right{ right: 6px; }
        }
      `}</style>
    </section>
  );
}
