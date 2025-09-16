// src/pages/Teams.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { SPORTS, TEAMS } from "@/data/teams";
import { useAuth } from "@/context/AuthContext.jsx";
import "@/styles/teams.css";

/* ───────── helpers ───────── */
const titleCase = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const initials = (name) => {
  const p = name.split(" ").filter(Boolean);
  return (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase();
};
const winRate = (t) => {
  const total = (t.wins ?? 0) + (t.losses ?? 0) + (t.draws ?? 0);
  return total ? Math.round(((t.wins ?? 0) / total) * 100) : 0;
};

/* ───────── Avatar with onError fallback (to /icons/users.svg) ───────── */
function Avatar({ src, alt, bg, size = 44 }) {
  const base = import.meta.env.BASE_URL || "/";
  const [broken, setBroken] = useState(false);
  const showImg = typeof src === "string" && src.trim() !== "" && !broken;

  return (
    <div
      className="avatar"
      style={{ background: bg, color: "#fff", width: size, height: size }}
    >
      {showImg ? (
        <img src={src} alt={alt} onError={() => setBroken(true)} />
      ) : (
        <img
          src={`${base}icons/users.svg`}
          alt=""
          className="avatar-icon"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/* ───────── Login-gate modal ───────── */
function LoginGateModal({ open, message, onClose, onConfirm }) {
  const primaryRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => primaryRef.current?.focus(), 0);
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-gate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 10V8a5 5 0 0 1 10 0v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <rect
                x="4"
                y="10"
                width="16"
                height="10"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="12" cy="15" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <h3 id="login-gate-title">Login required</h3>
        </div>

        <p className="modal-body">{message || "Please log in to continue."}</p>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn blue" ref={primaryRef} onClick={onConfirm}>
            Log in
          </button>
        </div>

        <style>{`
          .modal-overlay{
            position:fixed; inset:0; z-index:9999;
            background: rgba(13,27,42,.38); backdrop-filter: blur(2px);
            display:grid; place-items:center; animation: modalFade .18s ease-out;
          }
          .modal-card{
            width:min(92vw, 420px); background: var(--team-card); color: var(--team-text);
            border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.18);
            padding: 18px 18px 16px; animation: modalPop .22s cubic-bezier(.2,.8,.2,1);
            border:1px solid rgba(2,6,23,.10);
          }
          .modal-head{ display:flex; align-items:center; gap:10px; margin-bottom:8px; }
          .modal-icon{
            width:36px; height:36px; border-radius: 999px; display:grid; place-items:center; color:#fff;
            background: linear-gradient(135deg, #0d6c9e 0%, #2aab7c 100%);
            box-shadow: 0 6px 16px rgba(0,0,0,.12);
          }
          .modal-card h3{ margin:0; font-weight:900; }
          .modal-body{ margin:8px 0 14px; color: var(--team-muted); }
          .modal-actions{ display:flex; justify-content:flex-end; gap:10px; }
          .btn{ height:36px; padding:0 12px; border-radius:10px; border:none; font-weight:700; cursor:pointer; }
          .btn.blue{ background: var(--team-ring); color:#fff; }
          @keyframes modalPop{ from{ transform:scale(.96); opacity:0 } to{ transform:scale(1); opacity:1 } }
          @keyframes modalFade{ from{ opacity:0 } to{ opacity:1 } }
        `}</style>
      </div>
    </div>,
    document.body
  );
}

/* ───────── PAGE ───────── */
export default function Teams() {
  const { sport: sportParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // login-gate
  const [gateOpen, setGateOpen] = useState(false);
  const [gateMsg, setGateMsg] = useState("Please log in to continue.");
  const openLoginGate = (msg) => {
    setGateMsg(msg || "Please log in to continue.");
    setGateOpen(true);
  };
  const confirmLogin = () => {
    setGateOpen(false);
    navigate("/login");
  };

  const sport = (sportParam || "all").toLowerCase();
  const sportKeys = useMemo(() => SPORTS.map((s) => s.key), []);
  const isValidSport = sport === "all" || sportKeys.includes(sport);

  useEffect(() => {
    if (!isValidSport) navigate("/explore-teams", { replace: true });
  }, [isValidSport, navigate]);

  // followed teams (persist)
  const [followedTeams, setFollowedTeams] = useState(
    () => new Set(JSON.parse(localStorage.getItem("followedTeams") || "[]"))
  );

  const toggleFollowTeam = (teamId) => {
    if (!user) return openLoginGate("Please log in to follow teams.");
    setFollowedTeams((prev) => {
      const next = new Set(prev);
      next.has(teamId) ? next.delete(teamId) : next.add(teamId);
      localStorage.setItem("followedTeams", JSON.stringify([...next]));
      return next;
    });
  };

  // search/sort
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("followers");
  const [openTeam, setOpenTeam] = useState(null);

  const list = useMemo(() => {
    const pool = sport === "all" ? TEAMS : TEAMS.filter((t) => t.sport === sport);
    const filtered = q
      ? pool.filter((t) =>
          (t.name + " " + t.city + " " + t.coach)
            .toLowerCase()
            .includes(q.toLowerCase())
        )
      : pool;

    const wr = (t) => {
      const total = (t.wins ?? 0) + (t.losses ?? 0) + (t.draws ?? 0);
      return total ? (t.wins ?? 0) / total : 0;
    };

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "titles":
          return (b.titles ?? 0) - (a.titles ?? 0);
        case "wins":
          return (b.wins ?? 0) - (a.wins ?? 0);
        case "winrate":
          return wr(b) - wr(a);
        case "az":
          return a.name.localeCompare(b.name);
        case "newest":
          return (b.founded ?? 0) - (a.founded ?? 0);
        default:
          return (b.followers ?? 0) - (a.followers ?? 0);
      }
    });
  }, [q, sort, sport]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(sportKeys.map((k) => [k, 0]));
    for (const t of TEAMS) c[t.sport] = (c[t.sport] || 0) + 1;
    return c;
  }, [sportKeys]);

  const totals = useMemo(() => {
    const pool = sport === "all" ? TEAMS : TEAMS.filter((t) => t.sport === sport);
    return {
      teams: pool.length,
      players: pool.reduce((n, t) => n + (t.players?.length || 0), 0),
      titles: pool.reduce((n, t) => n + (t.titles || 0), 0),
    };
  }, [sport]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [sport]);

  const base = import.meta.env.BASE_URL || "/";

  return (
    <div className="page-teams">
      {/* HERO */}
      <div className="teams-hero">
        <div className="title-row">
          <img src={`${base}icons/teams.svg`} width={28} height={28} alt="" />
          <h1>Explore Teams</h1>
        </div>
        <div className="subtitle">
          Pakistan-based registered teams by sport. Click <b>Team Details</b> to
          open a separate info card; click a player to see their profile.
        </div>

        {/* quick stats */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="k">Teams</div>
            <div className="v">{totals.teams}</div>
          </div>
          <div className="stat-card">
            <div className="k">Players</div>
            <div className="v">{totals.players}</div>
          </div>
          <div className="stat-card">
            <div className="k">Titles</div>
            <div className="v">{totals.titles}</div>
          </div>
        </div>

        {/* toolbar */}
        <div className="teams-toolbar">
          <input
            className="input"
            placeholder="Search teams, city, coach…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="followers">Sort: Followers</option>
            <option value="titles">Sort: Most Titles</option>
            <option value="wins">Sort: Most Wins</option>
            <option value="winrate">Sort: Win Rate</option>
            <option value="az">Sort: A → Z</option>
            <option value="newest">Sort: Newest</option>
          </select>

          <Link to="/create" className="btn primary create-btn">
            + Create your team
          </Link>
        </div>

        {/* sport chips */}
        <div className="team-chips">
          <Chip to="/explore-teams" active={sport === "all"} label="All Sports" />
          {SPORTS.map((s) => (
            <Chip
              key={s.key}
              to={`/explore-teams/${s.key}`}
              active={sport === s.key}
              label={`${s.emoji} ${s.label}`}
              count={counts[s.key] || 0}
            />
          ))}
        </div>
      </div>

      {/* GRID */}
      <div className="team-grid">
        {list.map((team) => (
          <div key={team.id} className="team-card">
            <div className="team-card-head">
              <div className="crest-sm" style={{ background: team.color }}>
                {initials(team.name)}
              </div>
              <div className="tc-meta">
                <div className="tc-name">{team.name}</div>
                <div className="tc-sub">
                  {titleCase(team.sport)} • {team.city} • Est. {team.founded}
                </div>
                <div className="tc-tags">
                  <span className="tag">W {team.wins}</span>
                  {"losses" in team && <span className="tag">L {team.losses}</span>}
                  {"draws" in team && <span className="tag">D {team.draws}</span>}
                  <span className="tag">{winRate(team)}% WR</span>
                </div>
              </div>
              <div className="tc-actions">
                <button className="btn primary" onClick={() => setOpenTeam(team)}>
                  Team Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <div style={{ opacity: 0.75, marginTop: 20 }}>No teams match your filters.</div>
      )}

      {/* MODALS */}
      {openTeam && (
        <TeamDetailsModal
          team={openTeam}
          onClose={() => setOpenTeam(null)}
          isFollowed={followedTeams.has(openTeam.id)}
          onToggleFollow={() => toggleFollowTeam(openTeam.id)}
        />
      )}

      <LoginGateModal
        open={gateOpen}
        message={gateMsg}
        onClose={() => setGateOpen(false)}
        onConfirm={confirmLogin}
      />
    </div>
  );
}

/* ───────── chip ───────── */
function Chip({ to, label, active, count }) {
  return (
    <Link to={to} className={`team-chip ${active ? "active" : ""}`}>
      <span>{label}</span>
      {typeof count === "number" && <span style={{ opacity: 0.8 }}> • {count}</span>}
    </Link>
  );
}

/* ───────── team details modal ───────── */
function TeamDetailsModal({ team, onClose, isFollowed, onToggleFollow }) {
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const html = document.documentElement,
      body = document.body,
      shell = document.querySelector(".app-shell");
    const oh = html.style.overflow,
      ob = body.style.overflow,
      os = shell?.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (shell) shell.style.overflow = "hidden";
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      html.style.overflow = oh || "";
      body.style.overflow = ob || "";
      if (shell) shell.style.overflow = os || "";
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-wrap team-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* cover */}
        <div
          className="team-cover"
          style={{ backgroundImage: team.banner ? `url(${team.banner})` : undefined }}
        >
          <div className="cover-scrim" />
          <div className="cover-inner">
            <div className="crest-lg" style={{ background: team.color }}>
              {initials(team.name)}
            </div>
            <div className="cover-meta">
              <div className="cover-name">{team.name}</div>
              <div className="cover-sub">
                {titleCase(team.sport)} • {team.city} • Est. {team.founded}
              </div>
              <div className="cover-badges">
                <span className="badge">Venue: {team.venue}</span>
                <span className="badge">Coach: {team.coach}</span>
                <span className="badge">Followers: {team.followers}</span>
                <span className="badge">Titles: {team.titles}</span>
              </div>
            </div>
            <button className="close cover-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {/* body */}
        <div className="modal-bd">
          <div className="section">
            <div className="sec-title">About</div>
            <p className="bio">{team.bio}</p>
          </div>

          <div className="section stats-section">
            <div className="sec-title">Stats</div>
            <div className="stats">
              <div className="stat">
                <span>Record</span>{" "}
                <b>
                  {team.wins}-{team.losses ?? 0}
                  {team.draws ? `-${team.draws}` : ""}
                </b>
              </div>
              <div className="stat">
                <span>Win Rate</span> <b>{winRate(team)}%</b>
              </div>
              <div className="stat form">
                <span style={{ marginRight: 6 }}>Recent Form</span>
                {team.form?.map((f, i) => (
                  <span key={i} className={`dot ${f}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="section">
            <div className="sec-title">Players</div>
            <div className="players">
              {team.players.map((p) => (
                <div key={p.id} className="player-card">
                  <Avatar src={p.avatar} alt={p.name} bg={team.color} size={44} />
                  <div>
                    <div className="player-name">{p.name}</div>
                    <div className="player-pos">{p.pos}</div>
                  </div>
                  <button className="btn primary player-open" onClick={() => setPlayer(p)}>
                    Profile
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 12,
              flexWrap: "wrap",
            }}
          >
            <Link className="btn white" to={`/sports101?sport=${encodeURIComponent(team.sport)}`}>
              Read Rules (Sports 101)
            </Link>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <button className="btn ghost" onClick={onClose}>
                Close
              </button>
              <button className={`btn ${isFollowed ? "success" : "primary"}`} onClick={onToggleFollow}>
                {isFollowed ? "✓ Followed" : "Follow"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* stacked player modal */}
      {player && <PlayerProfileModal player={player} team={team} onClose={() => setPlayer(null)} />}
    </div>,
    document.body
  );
}

/* ───────── player profile modal (no follow here) ───────── */
function PlayerProfileModal({ player, team, onClose, zIndex = 10001 }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const gp = player.caps ?? player.matches ?? player.games ?? 0;

  return createPortal(
    <div className="modal-wrap player-modal" style={{ zIndex }} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd">
          <div className="modal-ttl">{player.name}</div>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-bd">
          <div className="profile">
            <Avatar src={player.avatar} alt={player.name} bg={team.color} size={88} />
            <div className="kv">
              <span className="k">Team</span>
              <span className="v">{team.name}</span>
              <span className="k">Sport</span>
              <span className="v">{titleCase(team.sport)}</span>
              <span className="k">Role</span>
              <span className="v">{player.pos}</span>
              <span className="k">Games</span>
              <span className="v">{gp}</span>

              {"goals" in player && (
                <>
                  <span className="k">Goals</span>
                  <span className="v">{player.goals}</span>
                </>
              )}
              {"assists" in player && (
                <>
                  <span className="k">Assists</span>
                  <span className="v">{player.assists}</span>
                </>
              )}
              {"cs" in player && (
                <>
                  <span className="k">Clean Sheets</span>
                  <span className="v">{player.cs}</span>
                </>
              )}
              {"runs" in player && (
                <>
                  <span className="k">Runs</span>
                  <span className="v">{player.runs}</span>
                </>
              )}
              {"wkts" in player && (
                <>
                  <span className="k">Wickets</span>
                  <span className="v">{player.wkts}</span>
                </>
              )}
              {"econ" in player && (
                <>
                  <span className="k">Economy</span>
                  <span className="v">{player.econ}</span>
                </>
              )}
              {"sr" in player && (
                <>
                  <span className="k">Strike Rate</span>
                  <span className="v">{player.sr}</span>
                </>
              )}
              {"ppg" in player && (
                <>
                  <span className="k">PPG</span>
                  <span className="v">{player.ppg}</span>
                </>
              )}
              {"rpg" in player && (
                <>
                  <span className="k">RPG</span>
                  <span className="v">{player.rpg}</span>
                </>
              )}
              {"apg" in player && (
                <>
                  <span className="k">APG</span>
                  <span className="v">{player.apg}</span>
                </>
              )}
              {"won" in player && (
                <>
                  <span className="k">Won</span>
                  <span className="v">{player.won}</span>
                </>
              )}
              {"ct" in player && (
                <>
                  <span className="k">Catches</span>
                  <span className="v">{player.ct}</span>
                </>
              )}
              {"number" in player && (
                <>
                  <span className="k">Number</span>
                  <span className="v">{player.number}</span>
                </>
              )}
            </div>
          </div>

          <div className="badges" style={{ marginTop: 10 }}>
            <span className="badge">City: {team.city}</span>
            <span className="badge">Coach: {team.coach}</span>
            <span className="badge">Venue: {team.venue}</span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "space-between",
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            <Link className="btn white" to={`/sports101?sport=${encodeURIComponent(team.sport)}`}>
              Read Rules (Sports 101)
            </Link>
            <button className="btn ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
