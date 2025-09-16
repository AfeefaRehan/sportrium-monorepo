import "./city-news.css";
import { useParams, Link } from "react-router-dom";

const CITY_DATA = {
  lahore: {
    title: "Lahore",
    matches: [
      { id: 1, teams: "PU Lions vs LUMS Falcons", time: "Today 19:30", venue: "Gaddafi College Ground" },
      { id: 2, teams: "UET Bulls vs FC Wolves", time: "Tomorrow 18:00", venue: "UET Main Stadium" },
      { id: 3, teams: "IBA Lahore vs GCU Tigers", time: "Fri 20:00", venue: "Govt College Field" },
    ],
  },
  karachi: {
    title: "Karachi",
    matches: [
      { id: 4, teams: "NED Titans vs KU Kings", time: "Today 21:00", venue: "NED Arena" },
      { id: 5, teams: "IBA Karachi vs SZABIST", time: "Tomorrow 17:30", venue: "IBA Varsity Ground" },
    ],
  },
  islamabad: {
    title: "Islamabad",
    matches: [
      { id: 6, teams: "FAST Islamabad vs NUST", time: "Sat 19:00", venue: "FAST Sports Complex" },
    ],
  },
  multan: {
    title: "Multan",
    matches: [
      { id: 7, teams: "BZU Panthers vs NFC Hawks", time: "Sun 18:00", venue: "BZU Sports Field" },
    ],
  },
  peshawar: {
    title: "Peshawar",
    matches: [
      { id: 8, teams: "UoP Eagles vs City FC", time: "Mon 20:30", venue: "University of Peshawar" },
    ],
  },
  faisalabad: {
    title: "Faisalabad",
    matches: [
      { id: 9, teams: "UAF Riders vs GCUF", time: "Wed 19:00", venue: "University of Agriculture" },
    ],
  },
};

export default function CityPage() {
  const { slug } = useParams();
  const city = CITY_DATA[slug] || { title: "Unknown", matches: [] };

  return (
    <div className="page">
      <div className="callout" role="note">
        To get more information or buy tickets, please{" "}
        <Link to="/login">login</Link> or <Link to="/signup">signup</Link>.
      </div>

      <h1>{city.title} · Matches</h1>

      <div className="list">
        {city.matches.map((m) => (
          <article key={m.id} className="list-card">
            <h3>{m.teams}</h3>
            <p>
              {m.time} · {m.venue}
            </p>
            <div className="actions">
              {/* Blue button (Remind me) — hover → white/black */}
              <Link className="btn btn-remind" to="/login" aria-label={`Remind me about ${m.teams}`}>
                Remind me
              </Link>

              {/* Red button (Buy tickets) — uses same primary style as Watch */}
              <Link className="btn btn-watch" to="/signup" aria-label={`Buy tickets for ${m.teams}`}>
                Buy tickets
              </Link>
            </div>
          </article>
        ))}

        {city.matches.length === 0 && <p>No matches yet.</p>}
      </div>
    </div>
  );
}
