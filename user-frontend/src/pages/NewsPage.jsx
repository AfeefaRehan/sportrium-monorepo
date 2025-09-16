import "./city-news.css";
import { useParams, Link } from "react-router-dom";

const NEWS = {
  51: {
    title: "Real Sociedad 1–4 FC Barcelona — it's clicking",
    league: "La Liga",
    img: "/assets/news1.jpg",
    body: [
      "Barcelona produced a ruthless second half to put four past Sociedad.",
      "Pedri’s passing split lines repeatedly while Lewandowski bullied center backs.",
      "Xavi rotated smartly; intensity stayed high for 90'."
    ],
    bullets: [
      "xG: RS 1.2 — 2.8 BAR",
      "Shots: 9 — 19",
      "Possession: 42% — 58%"
    ],
    related: [52, 55],
  },
  52: {
    title: "Bayern edge Stuttgart in week 22",
    league: "Bundesliga",
    img: "/assets/news2.jpg",
    body: ["Kane scored early; Neuer saved late."],
    bullets: ["xG: 1.1 — 0.9", "Shots: 12 — 10"],
    related: [51],
  },
  53: {
    title: "United announce academy finals schedule",
    league: "Club",
    img: "/assets/news3.jpg",
    body: ["U18 fixtures released with venues and kick-off times."],
    bullets: ["Final on Saturday 19:30"],
    related: [51, 52],
  },
  54: {
    title: "Kick-off times announced for Matchday 7",
    league: "All leagues",
    img: "/assets/news4.jpg",
    body: ["All consolidated kickoff times posted."],
    bullets: ["Check your club page for updates"],
    related: [55],
  },
  55: {
    title: "Lahore intervarsity fixtures released",
    league: "Pakistan",
    img: "/assets/news5.jpg",
    body: ["PU vs GCU opener at Gaddafi College Ground."],
    bullets: ["Tickets live from Friday"],
    related: [56],
  },
  56: {
    title: "Karachi T20 varsity cup expands",
    league: "Pakistan",
    img: "/assets/news6.jpg",
    body: ["Eight universities to participate this year."],
    bullets: ["Final at National Stadium"],
    related: [55],
  },
};

export default function NewsPage() {
  const { id } = useParams();
  const n = NEWS[id];

  if (!n) {
    return (
      <div className="page">
        <h1>News not found</h1>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="callout" role="note">
        To get more information or buy tickets, please{" "}
        <Link to="/login">login</Link> or <Link to="/signup">signup</Link>.
      </div>

      <h1>{n.title}</h1>
      <p className="muted">{n.league}</p>

      {n.img && (
        <img
          src={n.img}
          alt={n.title}
          className="news-img"
        />
      )}

      {n.body.map((p, i) => (
        <p key={i}>{p}</p>
      ))}

      <ul className="news-bullets">
        {n.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>

      {n.related?.length > 0 && (
        <div className="related">
          <h3>Related</h3>
          <ul>
            {n.related.map((rid) => (
              <li key={rid}>
                <Link to={`/news/${rid}`}>{NEWS[rid].title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
