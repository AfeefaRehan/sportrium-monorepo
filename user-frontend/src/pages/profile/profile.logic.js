// src/pages/profile/profile.logic.js
export const slugify = (s = "") =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const cap = (s = "") => String(s).replace(/^(.)/, (_, c) => c.toUpperCase());

// Accepts an array OR a single team object
export const normalizeFromFull = (arrOrOne) => {
  const list = Array.isArray(arrOrOne) ? arrOrOne : arrOrOne ? [arrOrOne] : [];
  return list.map((t) => ({
    id: t.id ?? t.slug ?? slugify(t.name),
    slug: t.slug,
    name: t.name,
    shortName: t.shortName,
    sport: String(t.sport || "").toLowerCase(),
    city: t.city || "",
    color: t.color || "",
    players: (t.roster || t.players || []).map((r) => ({
      id: r.id ?? r.slug ?? slugify(r.name || "player"),
      name: r.name,
      role: r.role,
      jersey: r.jersey,
      avatar: r.avatar || "",
    })),
    badge: t.logoDataUrl || t.badge || "",
    banner: t.banner || "",
    teamType: t.teamType || "Mixed",
    privateTeam: !!t.privateTeam,
    tournament: !!t.tournament,
    tournamentId: t.tournamentId || "",
    division: t.division || "",
    stats: t.stats || { played: 0, wins: 0, losses: 0, draws: 0, titles: 0 },
    createdAt: t.createdAt || new Date().toISOString(),
  }));
};

// CENTRALIZE PATHS — change here if your real routes differ
export const resolveTeamPath = (team) => {
  const seg = team?.slug ?? team?.id ?? slugify(team?.name ?? "team");
  return `/teams/${seg}`;
};

export const resolveEventPath = (ev) => {
  const seg = ev?.slug ?? ev?.id ?? slugify(ev?.title ?? "event");
  return `/events/${seg}`;
};
