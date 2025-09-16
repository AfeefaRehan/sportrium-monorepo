// src/components/layout/TrendingPanel.jsx
import { NavLink } from "react-router-dom";

/**
 * TrendingPanel
 * props:
 *  - items: [{ id, title, meta, ... }]
 *  - onItemClick?: (item) => void   // if provided, open modal instead of routing
 */
export default function TrendingPanel({ items = [], onItemClick }) {
  return (
    <aside className="trending" aria-labelledby="trending-title">
      <h3 id="trending-title" className="trend-heading">Trending News</h3>

      <div className="trend-list">
        {items.map((item) => {
          const CardInner = (
            <>
              <div className="trend-thumb" aria-hidden="true" />
              <div className="trend-body">
                <div className="trend-title">{item.title}</div>
                <div className="trend-meta">{item.meta}</div>
              </div>
            </>
          );

          if (onItemClick) {
            return (
              <button
                key={item.id}
                type="button"
                className="trend-card"
                onClick={() => onItemClick(item)}
                aria-label={item.title}
              >
                {CardInner}
              </button>
            );
          }

          return (
            <NavLink key={item.id} className="trend-card" to={`/news/${item.id}`}>
              {CardInner}
            </NavLink>
          );
        })}
      </div>

      <style>{`
        .trend-heading{ margin:0 0 10px; font-weight:900; }
        .trend-list{ display:grid; gap:10px; max-height: 520px; overflow:auto; padding-right: 6px; }
        .trend-list::-webkit-scrollbar{ width:8px; }
        .trend-list::-webkit-scrollbar-thumb{ background: rgba(0,0,0,.18); border-radius:999px; }
        .trend-list::-webkit-scrollbar-track{ background: rgba(0,0,0,.05); border-radius:999px; }

        .trend-card{
          all: unset;
          display:grid; grid-template-columns:56px 1fr; gap:12px; align-items:center;
          width:100%; padding:12px 12px;
          border-radius:14px;
          background:#ffffff;
          border:1px solid #e5e7eb;
          box-shadow: 0 6px 16px rgba(0,0,0,.06);
          cursor:pointer;
        }
        .trend-card:hover{ box-shadow: 0 10px 20px rgba(0,0,0,.10); }
        .trend-card:focus-visible{ outline:2px solid #2563eb; outline-offset:2px; }

        .trend-thumb{
          width:56px; height:56px; border-radius:12px;
          background: radial-gradient(circle at 30% 30%, #0ea5e9, #22c55e);
          opacity:.9;
        }
        .trend-title{
          font-weight:800; line-height:1.25;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
        }
        .trend-meta{ margin-top:2px; opacity:.7; font-size: 13.5px; }
      `}</style>
    </aside>
  );
}
