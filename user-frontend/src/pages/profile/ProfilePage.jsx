// src/pages/profile/ProfilePage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

import {
  slugify,
  cap,
  normalizeFromFull,
  resolveTeamPath,
  resolveEventPath,
} from "./profile.logic.js";

import {
  getProfile,
  saveProfile,
  getFollowingTeamIds,
  setFollowingTeamIds,
  getMyTeams,
  setMyTeams,
  getHostedEvents,
} from "@/utils/profileStore.js";

import * as TeamsModule from "@/data/teams.js";
import * as EventsModule from "@/data/events.js";

const TEAMS = TeamsModule.TEAMS || TeamsModule.default || [];
const EVENTS = EventsModule.EVENTS || EventsModule.default || [];
const SPORTS_CANON = ["football", "cricket", "basketball", "badminton", "tennis"];

import "@/styles/profile.css";

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();

  const avatarFileRef = useRef(null);

  const [tab, setTab] = useState(() => new URLSearchParams(search).get("tab") || "overview");
  const [edit, setEdit] = useState(false);
  const [toast, setToast] = useState("");
  const [toastCenter, setToastCenter] = useState(false);

  // Profile
  const [profile, setProfile] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    city: "",
    bio: "",
    sports: [],
    avatar: "",
  });

  /* ---------- bootstrap store + local fallbacks ---------- */
  const seedFollowing = () => {
    const store = getFollowingTeamIds?.();
    if (Array.isArray(store) && store.length) return store;
    try {
      const local = JSON.parse(localStorage.getItem("following_team_ids") || "[]");
      if (local.length) return local;
    } catch {}
    const few = (TEAMS || []).slice(0, 4).map((t) => t.id ?? t.slug ?? slugify(t.name));
    setFollowingTeamIds?.(few);
    return few;
  };

  const seedTeams = () => {
    try {
      const full = JSON.parse(localStorage.getItem("teams_full") || "[]");
      if (Array.isArray(full) && full.length) return normalizeFromFull(full);
    } catch {}
    const store = getMyTeams?.();
    if (Array.isArray(store) && store.length) return store;
    const derived = normalizeFromFull((TEAMS || []).slice(0, 3));
    setMyTeams?.(derived);
    return derived;
  };

  const seedHosted = () => {
    const cached = getHostedEvents?.() || [];
    if (Array.isArray(cached) && cached.length) return cached;
    const sample = (EVENTS || []).slice(0, 4).map((e) => ({ ...e }));
    try {
      localStorage.setItem("hosted_events", JSON.stringify(sample));
    } catch {}
    return sample;
  };

  // State derived from seeds
  const [followingIds, setFollowing] = useState(seedFollowing());
  const [teams, setTeams] = useState(seedTeams());
  const [hosted, setHosted] = useState(seedHosted());

  /* ---------- effects ---------- */
  // load profile (from API or cache)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await Promise.resolve(getProfile?.());
        if (!alive) return;
        if (p && typeof p === "object") {
          setProfile((prev) => ({
            ...prev,
            displayName: p.displayName ?? prev.displayName,
            email: p.email ?? prev.email,
            city: p.city ?? "",
            bio: p.bio ?? "",
            sports: Array.isArray(p.sports) ? p.sports : [],
            avatar: p.avatar ?? "",
          }));
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, [user?.uid, user?.email]);

  // refresh when coming back / storage change
  useEffect(() => {
    const refresh = () => {
      setFollowing(seedFollowing());
      setTeams(seedTeams());
      setHosted(seedHosted());
    };
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Derived
  const followingTeams = useMemo(() => {
    const setIds = new Set((followingIds || []).map(String));
    return (TEAMS || [])
      .filter((t) => setIds.has(String(t.id ?? t.slug)))
      .map(normalizeFromFull)
      .map((a) => a[0]);
  }, [followingIds]);

  const myTeamsDetailed = useMemo(() => teams || [], [teams]);

  const hostedWithCounts = useMemo(() => {
    const byTeam = new Map((myTeamsDetailed || []).map((t) => [String(t.id), t]));
    return (hosted || []).map((e) => ({
      ...e,
      teamCount: Array.isArray(e.participants) ? e.participants.length : 0,
      teamNames: Array.isArray(e.participants)
        ? e.participants.map((pid) => byTeam.get(String(pid))?.name || "Team").slice(0, 4)
        : [],
    }));
  }, [hosted, myTeamsDetailed]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "profile_counts",
        JSON.stringify({
          following: followingIds.length,
          myTeams: myTeamsDetailed.length,
          hosted: hostedWithCounts.length,
          matches: (EVENTS || []).length,
        })
      );
    } catch {}
  }, [followingIds.length, myTeamsDetailed, hostedWithCounts]);

  const completeness = useMemo(() => {
    const checks = [
      !!profile.displayName,
      !!profile.email,
      !!profile.city,
      (profile.sports?.length || 0) > 0,
      !!profile.bio,
      !!profile.avatar,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [profile]);

  // utils
  const showToast = (m, { center = false } = {}) => {
    setToastCenter(center);
    setToast(m);
    setTimeout(() => setToast(""), 1500);
  };
  const refreshNow = () => {
    setFollowing(seedFollowing());
    setTeams(seedTeams());
    setHosted(seedHosted());
    showToast("Updated");
  };

  function onChange(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }
  function toggleSport(s) {
    const on = profile.sports?.includes(s);
    const next = {
      ...profile,
      sports: on ? profile.sports.filter((x) => x !== s) : [...(profile.sports || []), s],
    };
    setProfile(next);
    saveProfile?.(next);
  }
  async function onSave() {
    await Promise.resolve(saveProfile?.(profile));
    setEdit(false);
    showToast("Profile saved", { center: true });
  }
  async function onCancel() {
    const p = await Promise.resolve(getProfile?.());
    if (p) setProfile((prev) => ({ ...prev, ...p }));
    setEdit(false);
    showToast("Changes discarded");
  }
  function onPickAvatar(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = { ...profile, avatar: reader.result };
      setProfile(next);
      saveProfile?.(next);
      showToast("Avatar updated");
    };
    reader.readAsDataURL(f);
  }

  // follow / unfollow
  function toggleFollow(teamId) {
    const id = String(teamId);
    const on = (followingIds || []).map(String).includes(id);
    const next = on ? followingIds.filter((x) => String(x) !== id) : [...followingIds, teamId];
    setFollowing(next);
    setFollowingTeamIds?.(next);
  }

  // teams editing
  const [expandedId, setExpandedId] = useState(null);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [teamDraft, setTeamDraft] = useState(null);
  const persistTeams = (next) => {
    setTeams(next);
    try {
      localStorage.setItem("teams_full", JSON.stringify(next));
    } catch {}
    setMyTeams?.(next);
  };

  const openEditTeam = (team) => {
    setEditingTeamId(team.id);
    setTeamDraft({
      id: team.id,
      name: team.name,
      city: team.city,
      color: team.color || "#2563eb",
      teamType: team.teamType || "Mixed",
      privateTeam: !!team.privateTeam,
      tournament: !!team.tournament,
      tournamentId: team.tournamentId || "",
      division: team.division || "",
      players: (team.players || []).map((p) => ({
        id: p.id,
        name: p.name || "",
        role: p.role || "Player",
        jersey: p.jersey || "",
        avatar: p.avatar || "",
      })),
    });
  };

  const saveTeamDraft = () => {
    if (!teamDraft) return;
    const next = (teams || []).map((t) => {
      if (t.id !== teamDraft.id) return t;
      return {
        ...t,
        name: teamDraft.name.trim() || t.name,
        city: teamDraft.city,
        color: teamDraft.color,
        teamType: teamDraft.teamType,
        privateTeam: !!teamDraft.privateTeam,
        tournament: !!teamDraft.tournament,
        tournamentId: teamDraft.tournamentId || "",
        division: teamDraft.division || "",
        players: teamDraft.players.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          jersey: p.jersey,
          avatar: p.avatar || "",
        })),
      };
    });
    persistTeams(next);
    setEditingTeamId(null);
    setTeamDraft(null);
    showToast("Team updated");
  };
  const updateTeamDraft = (field, value) => setTeamDraft((prev) => ({ ...prev, [field]: value }));
  const updateMemberDraft = (mid, field, value) =>
    setTeamDraft((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === mid ? { ...p, [field]: value } : p)),
    }));
  const removeMemberDraft = (mid) =>
    setTeamDraft((prev) => ({ ...prev, players: prev.players.filter((p) => p.id !== mid) }));

  // file inputs
  const onTeamLogoFile = (e, teamId) => onTeamLogoChange(teamId, e.target.files?.[0]);
  const onMemberPhotoFile = (e, teamId, playerId) =>
    onMemberPhotoChange(teamId, playerId, e.target.files?.[0]);

  const onTeamLogoChange = (teamId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = (teams || []).map((t) => {
        if (String(t.id) !== String(teamId)) return t;
        return { ...t, badge: reader.result };
      });
      persistTeams(next);
    };
    reader.readAsDataURL(file);
  };
  const onMemberPhotoChange = (teamId, playerId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const next = (teams || []).map((t) => {
        if (String(t.id) !== String(teamId)) return t;
        return {
          ...t,
          players: (t.players || []).map((p) => (p.id === playerId ? { ...p, avatar: reader.result } : p)),
        };
      });
      persistTeams(next);
    };
    reader.readAsDataURL(file);
  };

  // filters
  const [q, setQ] = useState("");
  const [fSport, setFSport] = useState("all");
  const [fCity, setFCity] = useState("all");

  const followingFiltered = useMemo(() => {
    return (followingTeams || []).filter((team) => {
      const matchQ = q.trim() ? String(team.name || "").toLowerCase().includes(q.trim().toLowerCase()) : true;
      const matchS = fSport === "all" ? true : String(team.sport || "").toLowerCase() === fSport;
      const matchC = fCity === "all" ? true : String(team.city || "").toLowerCase() === String(fCity).toLowerCase();
      return matchQ && matchS && matchC;
    });
  }, [followingTeams, q, fSport, fCity]);

  const setUrlTab = (t) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", t);
    navigate({ search: sp.toString() }, { replace: true });
    setTab(t);
  };

  const openTeam = (team) => navigate(resolveTeamPath(team));
  const openEvent = (ev) => navigate(resolveEventPath(ev));

  return (
    <div className="profile-page">
      {/* ===== HERO ===== */}
      <section className="profile-hero">
        <div className="hero-cover" />
        <div className="hero-center">
          {/* Avatar with external camera FAB */}
          <div className="avatar-wrap">
            <label className="avatar-xxl" title="Change photo">
              {profile.avatar ? (
                <img src={profile.avatar} alt="avatar" />
              ) : (
                <span className="initial">{profile.displayName?.[0] || "U"}</span>
              )}
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/*"
                onChange={onPickAvatar}
                style={{ display: "none" }}
              />
            </label>
            <button
              type="button"
              className="avatar-camera"
              aria-label="Change photo"
              onClick={() => avatarFileRef.current?.click()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          </div>

          <h1 className="hero-name">{profile.displayName || "Your Name"}</h1>
          <p className="hero-sub">{profile.city || "City"} • {profile.email || "you@example.com"}</p>
          <div className="hero-actions">
            <div className="socials">
              <span className="s-dot" title="Instagram" />
              <span className="s-dot" title="Twitter" />
              <span className="s-dot" title="Facebook" />
            </div>
            <div className="btn-row">
              <button
                className="btn ghost"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("Profile link copied");
                }}
              >
                Share
              </button>
              {!edit ? (
                <button className="btn primary" onClick={() => setEdit(true)}>
                  Edit
                </button>
              ) : (
                <>
                  <button className="btn" onClick={onSave}>
                    Save
                  </button>
                  <button className="btn danger" onClick={onCancel}>
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="hero-stats">
          <Stat title="Following" value={followingIds.length} />
          <Stat title="My Teams" value={(myTeamsDetailed || []).length} />
          <Stat title="Hosted" value={(hostedWithCounts || []).length} />
          <Stat title="Matches" value={(EVENTS || []).length} />
        </div>

        {/* completeness */}
        <div className="hero-progress">
          <div className="hp-head">
            <span className="small">Profile completeness</span>
            <b>{completeness}%</b>
          </div>
          <div className="hp-bar">
            <span style={{ width: `${completeness}%` }} />
          </div>
        </div>

        {/* tabs */}
        <div className="segmented seg-underline" role="tablist">
          {[
            ["overview", "Overview"],
            ["following", "Following"],
            ["myteams", "My Teams"],
            ["hosted", "Hosted"],
          ].map(([k, label]) => (
            <button
              key={k}
              className={`seg-btn ${tab === k ? "is-active" : ""}`}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setUrlTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      {tab === "overview" && (
        <section className="profile-grid rev-two">
          <div className="card intro">
            <h3>Bio / Introduction</h3>
            {!edit ? (
              <p className="muted">
                {profile.bio ||
                  "Tell people a bit about yourself, your playing position, achievements or goals."}
              </p>
            ) : (
              <textarea
                className="input"
                rows={5}
                value={profile.bio}
                onChange={(e) => onChange("bio", e.target.value)}
                placeholder="Write your introduction…"
              />
            )}
            <div className="divider" />
            <h3>Preferences</h3>
            <div className="chips">
              {SPORTS_CANON.map((s) => (
                <button
                  key={s}
                  className={`chip ${profile.sports?.includes(s) ? "on" : ""}`}
                  onClick={() => toggleSport(s)}
                >
                  {cap(s)}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Account Info</h3>
            <div className="kv">
              <span>Name</span>
              {!edit ? (
                <b>{profile.displayName || "—"}</b>
              ) : (
                <input
                  className="input"
                  value={profile.displayName}
                  onChange={(e) => onChange("displayName", e.target.value)}
                />
              )}
            </div>
            <div className="kv">
              <span>Email</span>
              {!edit ? (
                <b>{profile.email || "—"}</b>
              ) : (
                <input
                  className="input"
                  value={profile.email}
                  onChange={(e) => onChange("email", e.target.value)}
                />
              )}
            </div>
            <div className="kv">
              <span>City</span>
              {!edit ? (
                <b>{profile.city || "—"}</b>
              ) : (
                <input
                  className="input"
                  value={profile.city}
                  onChange={(e) => onChange("city", e.target.value)}
                />
              )}
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={refreshNow}>
                Refresh
              </button>
              <button className="btn" onClick={() => navigate("/host/new")}>
                Host
              </button>
              <button className="btn" onClick={() => navigate("/create-team")}>
                Create team
              </button>
              <button className="btn" onClick={() => navigate("/explore-teams")}>
                Find matches
              </button>
            </div>
          </div>

          <div className="card span-2">
            <div className="list-head">
              <h3>Recent Activity</h3>
            </div>
            <ul className="mini-list">
              {(EVENTS || []).slice(0, 6).map((e) => (
                <li
                  key={e.id || e.slug}
                  className="mini-row clickable"
                  onClick={() => openEvent(e)}
                >
                  <div className="dot" />
                  <div className="title">{e.title}</div>
                  <span className="muted">
                    {new Date(e.starts_at || e.startsAt || Date.now()).toLocaleString()}
                  </span>
                  <button className="btn ghost small">View</button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === "following" && (
        <section className="profile-panel">
          <div className="panel-head">
            <h3>Following</h3>
            <div className="panel-actions">
              <span className="muted">{followingIds.length} total</span>
              <button className="btn small ghost" onClick={refreshNow}>
                Refresh
              </button>
            </div>
          </div>

          <div className="filters">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input"
              placeholder="Search team name…"
            />
            <select
              value={fSport}
              onChange={(e) => setFSport(e.target.value)}
              className="input"
            >
              <option value="all">All sports</option>
              {SPORTS_CANON.map((s) => (
                <option key={s} value={s}>
                  {cap(s)}
                </option>
              ))}
            </select>
            <select
              value={fCity}
              onChange={(e) => setFCity(e.target.value)}
              className="input"
            >
              <option value="all">All cities</option>
              {Array.from(new Set(followingTeams.map((t) => t.city)))
                .filter(Boolean)
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </div>

          {followingFiltered.length ? (
            <div className="team-grid">
              {followingFiltered.map((team) => {
                const active = (followingIds || []).map(String).includes(String(team.id));
                const sportClass = `sport-${(team.sport || "").toLowerCase().replace(/\s+/g, "-")}`;
                return (
                  <div key={team.id} className={`team-card ${sportClass}`}>
                    <div className="team-meta" onClick={() => openTeam(team)}>
                      <div className="team-badge" style={{ background: team.color || "" }}>
                        {team.badge ? (
                          <img src={team.badge} alt="" />
                        ) : (
                          team.shortName?.[0] || team.name?.[0] || "T"
                        )}
                      </div>
                      <div className="team-text">
                        <div className="team-name">{team.name}</div>
                        <div className="team-league">{cap(team.sport)} • {team.city}</div>
                      </div>
                    </div>
                    <div className="row-right">
                      <button
                        className={`btn pill ${active ? "danger" : "primary"}`}
                        onClick={() => toggleFollow(team.id)}
                      >
                        {active ? "Unfollow" : "Follow"}
                      </button>
                      <button className="btn ghost" onClick={() => openTeam(team)}>
                        View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">No teams match your filters.</div>
          )}
        </section>
      )}

      {tab === "myteams" && (
        <section className="profile-panel">
          <div className="panel-head">
            <h3>My Teams</h3>
            <div className="panel-actions">
              <button className="btn small" onClick={() => navigate("/create-team")}>
                Create team
              </button>
            </div>
          </div>
          <div className="team-list">
            {(myTeamsDetailed || []).map((team) => {
              const expanded = expandedId === team.id;
              return (
                <div key={team.id} className="team-row">
                  <div className="row-left" onClick={() => setExpandedId(expanded ? null : team.id)}>
                    <div className="team-badge lg" style={{ background: team.color || "" }}>
                      {team.badge ? (
                        <img src={team.badge} alt="" />
                      ) : (
                        team.shortName?.[0] || team.name?.[0] || "T"
                      )}
                    </div>
                    <div>
                      <div className="team-name">{team.name}</div>
                      <div className="muted">
                        {cap(team.sport)} • {team.city} • {team.players?.length || 0} members
                      </div>
                    </div>
                  </div>
                  <div className="row-mid">
                    <div className="avatars">
                      {(team.players || []).slice(0, 5).map((p) => (
                        <span key={p.id} className="avatar-sm">
                          {p.avatar ? <img src={p.avatar} alt="" /> : p.name?.[0] || "P"}
                        </span>
                      ))}
                      {(team.players || []).length > 5 && (
                        <span className="more">+{(team.players || []).length - 5}</span>
                      )}
                    </div>
                  </div>
                  <div className="row-right">
                    <label className="btn pill">
                      <input type="file" accept="image/*" hidden onChange={(e) => onTeamLogoFile(e, team.id)} />
                      Upload logo
                    </label>
                    <button className="btn" onClick={() => openEditTeam(team)}>
                      Edit
                    </button>
                    <button className="btn ghost" onClick={() => openTeam(team)}>
                      Open
                    </button>
                  </div>

                  {expanded && (
                    <div className="team-expand">
                      <div className="exp-col">
                        <h4>Team Stats</h4>
                        <ul className="kv-list">
                          <li>
                            <span>Played</span>
                            <b>{team.stats?.played ?? 0}</b>
                          </li>
                          <li>
                            <span>Wins</span>
                            <b>{team.stats?.wins ?? 0}</b>
                          </li>
                          <li>
                            <span>Losses</span>
                            <b>{team.stats?.losses ?? 0}</b>
                          </li>
                          <li>
                            <span>Draws</span>
                            <b>{team.stats?.draws ?? 0}</b>
                          </li>
                          <li>
                            <span>Titles</span>
                            <b>{team.stats?.titles ?? 0}</b>
                          </li>
                        </ul>
                      </div>
                      <div className="exp-col">
                        <h4>Registrations</h4>
                        <ul className="mini-list">
                          {(EVENTS || []).slice(0, 3).map((ev) => (
                            <li
                              key={ev.id || ev.slug}
                              className="mini-row clickable"
                              onClick={() => openEvent(ev)}
                            >
                              <div className="title">{ev.title}</div>
                              <span className="muted">
                                {new Date(ev.starts_at || ev.startsAt || Date.now()).toLocaleDateString()}
                              </span>
                              <button className="btn ghost small">View</button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="exp-col">
                        <h4>Members</h4>
                        <ul className="member-list">
                          {(team.players || []).map((p) => (
                            <li key={p.id}>
                              <span className="avatar-sm">
                                {p.avatar ? <img src={p.avatar} alt="" /> : p.name?.[0] || "P"}
                              </span>
                              <span>
                                <b>{p.name}</b>
                                <div className="muted">
                                  {p.role} • #{p.jersey || "—"}
                                </div>
                              </span>
                              <label className="btn pill">
                                <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => onMemberPhotoFile(e, team.id, p.id)}
                                />
                                Photo
                              </label>
                              <span className="pill ghost">{p.role}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* EDIT DRAWER */}
          {editingTeamId && teamDraft && (
            <div className="drawer">
              <div className="drawer-card">
                <div className="drawer-head sticky">
                  <h3>Edit team</h3>
                  <button
                    className="btn danger"
                    onClick={() => {
                      setEditingTeamId(null);
                      setTeamDraft(null);
                    }}
                  >
                    Close
                  </button>
                </div>
                <div className="grid-2">
                  <div>
                    <label className="field">
                      <span className="lbl">Team name</span>
                      <textarea
                        className="input ta"
                        rows={2}
                        value={teamDraft?.name || ""}
                        onChange={(e) => updateTeamDraft("name", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span className="lbl">City</span>
                      <textarea
                        className="input ta"
                        rows={1}
                        value={teamDraft?.city || ""}
                        onChange={(e) => updateTeamDraft("city", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span className="lbl">Brand color</span>
                      <div className="row">
                        <input
                          type="color"
                          aria-label="Team color"
                          value={teamDraft?.color || "#2563eb"}
                          onChange={(e) => updateTeamDraft("color", e.target.value)}
                        />
                        <code style={{ marginLeft: 8 }}>{teamDraft?.color || "#2563eb"}</code>
                      </div>
                    </label>
                  </div>
                  <div>
                    <label className="field">
                      <span className="lbl">Team type</span>
                      <select
                        className="input"
                        value={teamDraft?.teamType || "Mixed"}
                        onChange={(e) => updateTeamDraft("teamType", e.target.value)}
                      >
                        {["Mixed", "Men", "Women", "Boys", "Girls"].map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field row ck">
                      <input
                        type="checkbox"
                        checked={!!teamDraft?.privateTeam}
                        onChange={(e) => updateTeamDraft("privateTeam", e.target.checked)}
                      />
                      <span className="lbl">Private team</span>
                    </label>
                    <label className="field row ck">
                      <input
                        type="checkbox"
                        checked={!!teamDraft?.tournament}
                        onChange={(e) => updateTeamDraft("tournament", e.target.checked)}
                      />
                      <span className="lbl">Tournament team</span>
                    </label>
                    {teamDraft?.tournament && (
                      <div className="grid-2">
                        <label className="field">
                          <span className="lbl">Tournament ID</span>
                          <input
                            className="input"
                            value={teamDraft?.tournamentId || ""}
                            onChange={(e) => updateTeamDraft("tournamentId", e.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span className="lbl">Division</span>
                          <input
                            className="input"
                            value={teamDraft?.division || ""}
                            onChange={(e) => updateTeamDraft("division", e.target.value)}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="divider" />
                <h4>Members</h4>
                <ul className="member-list compact">
                  {(teamDraft.players || []).map((p) => (
                    <li key={p.id}>
                      <span className="avatar-sm">
                        {p.avatar ? <img src={p.avatar} alt="" /> : p.name?.[0] || "P"}
                      </span>
                      <input
                        className="input"
                        value={p.name}
                        onChange={(e) => updateMemberDraft(p.id, "name", e.target.value)}
                      />
                      <select
                        className="input"
                        value={p.role}
                        onChange={(e) => updateMemberDraft(p.id, "role", e.target.value)}
                      >
                        {["Player", "Captain", "Vice-Captain", "Coach", "Manager"].map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input short"
                        value={p.jersey || ""}
                        onChange={(e) => updateMemberDraft(p.id, "jersey", e.target.value)}
                        placeholder="#"
                      />
                      <label className="btn pill">
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => onMemberPhotoFile(e, teamDraft.id, p.id)}
                        />
                        Photo
                      </label>
                      <button className="btn danger pill" onClick={() => removeMemberDraft(p.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="drawer-footer">
                  <button className="btn" onClick={saveTeamDraft}>
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "hosted" && (
        <section className="profile-panel">
          <div className="panel-head">
            <h3>Hosted Events</h3>
            <div className="panel-actions">
              <button className="btn small ghost" onClick={() => setHosted(seedHosted())}>
                Reload
              </button>
            </div>
          </div>
          <div className="event-list">
            {(hostedWithCounts || []).map((ev) => {
              const sportClass = `sport-${String(ev.sport || "").toLowerCase().replace(/\s+/g, "-")}`;
              const evPath = resolveEventPath(ev);
              return (
                <div key={ev.id || ev.slug} className={`event-row ${sportClass}`}>
                  <div className="event-core" onClick={() => openEvent(ev)}>
                    <span className="badge sport">{cap(ev.sport || "Sport")}</span>
                    <div className="event-text">
                      <div className="title">{ev.title}</div>
                      <div className="muted">
                        {ev.city || ev.venue?.city || "City"} •{" "}
                        {new Date(ev.starts_at || ev.startsAt || Date.now()).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="row-right">
                    <div className="avatars">
                      {(ev.participants || []).slice(0, 6).map((pid) => {
                        const tm = myTeamsDetailed.find((t) => String(t.id) === String(pid));
                        return (
                          <span key={pid} className="avatar-sm">
                            {tm?.badge ? <img src={tm.badge} alt="" /> : tm?.name?.[0] || "T"}
                          </span>
                        );
                      })}
                    </div>
                    <button className="btn" onClick={() => openEvent(ev)}>
                      View
                    </button>
                    <button
                      className="btn ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${evPath}`);
                        showToast("Link copied");
                      }}
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className={`toast ${toastCenter ? "center" : "br"} ${toast ? "show" : ""}`}>
        <span className="tick">✓</span> {toast}
      </div>
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="stat">
      <div className="val">{value}</div>
      <div className="label">{title}</div>
    </div>
  );
}
