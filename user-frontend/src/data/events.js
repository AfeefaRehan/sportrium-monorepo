// src/data/events.js
// Public events shown on /host and /events/:slug

export const EVENTS = [
  {
    id: "ev-street-premier",
    slug: "street-premier-gulshan-tape-ball",
    sport: "cricket",
    title: "Street Premier – Gulshan Tape Ball",
    city: "Karachi",
    venue: "Saadi Ground",
    lat: 24.9217, lng: 67.1145,
    date: "2025-11-18",
    time: "19:00",
    slots: 12,
    filled: 9,
    entryFee: 500,
    banner: "/banners/cricket-1.jpg",
    host: {
      name: "Gulshan Sports Club",
      type: "Club",
      avatar: "/hosts/gulshan.png", // optional; falls back to initials
      verified: true,
      phone: "+92 300 1234567",
      email: "contact@gulshansports.pk",
    },
    description:
      "Fast-paced night tape-ball knockout. Colored kit, white ball, powerplays. Umpires provided.",
    format: "Knockout · Tape-ball · 8 overs per side",
    eligibility: [
      "Open to all (16+)",
      "Team roster up to 10 players",
      "Colored kit preferred",
    ],
    rules: [
      "Powerplay first 2 overs; 2 bowlers max 2 overs",
      "Wide/No-ball = 1 run + extra ball",
      "Tied matches → super over",
    ],
    disqualify: [
      "Fake player identity",
      "Abusive behavior towards officials",
      "Ball tampering / unsafe conduct",
    ],
    policies: [
      "Teams must report 30 mins before first game",
      "ID card required for captain",
      "No outside ball / rough behavior",
      "Rainout: reschedule within 7 days or refund",
    ],
    regDeadline: "2025-11-15",
    games: [
      { round: "R16", when: "2025-11-18 19:00" },
      { round: "QF",  when: "2025-11-18 21:00" },
      { round: "SF",  when: "2025-11-19 19:00" },
      { round: "Final", when: "2025-11-19 21:00" },
    ],
  },
  {
    id: "ev-lhr-7s",
    slug: "community-7-a-side-night-league",
    sport: "football",
    title: "Community 7-a-side Night League",
    city: "Lahore",
    venue: "Mughalpura Turf",
    lat: 31.5887, lng: 74.3888,
    date: "2025-09-25",
    time: "20:30",
    slots: 16,
    filled: 12,
    entryFee: 350,
    banner: "/banners/football-1.jpg",
    host: {
      name: "Lahore Night League",
      type: "League Organizers",
      avatar: "/hosts/lahore-night.png",
      verified: true,
      phone: "+92 321 9876543",
      email: "support@lnl.pk",
    },
    description:
      "League format 7v7 under lights. Rolling subs, 20-minute halves, certified refs.",
    format: "League · 7v7 · 20' halves",
    eligibility: [
      "Open/Men/Women categories",
      "Roster up to 14, rolling subs",
    ],
    rules: [
      "No slide tackles",
      "Kick-ins replace throw-ins",
      "Yellow = 2-min sin bin",
    ],
    disqualify: [
      "Violence / fighting",
      "Playing under alcohol influence",
    ],
    policies: [
      "Shin guards mandatory",
      "Red card = 1-match suspension",
      "Walkover after 10 mins late",
    ],
    regDeadline: "2025-09-20",
    games: [
      { round: "Matchday 1", when: "2025-09-25 20:30" },
      { round: "Matchday 2", when: "2025-10-02 20:30" },
      { round: "Playoffs", when: "2025-11-06 20:30" },
    ],
  },
  {
    id: "ev-iba-3x3",
    slug: "iba-hoop-fest-3x3",
    sport: "basketball",
    title: "IBA Hoop-Fest 3×3",
    city: "Karachi",
    venue: "Aram Bagh Court",
    lat: 24.8578, lng: 67.0094,
    date: "2025-10-06",
    time: "18:00",
    slots: 24,
    filled: 20,
    entryFee: 300,
    banner: "/banners/basketball-1.jpg",
    host: {
      name: "IBA Sports Society",
      type: "University Society",
      avatar: "/hosts/iba.png",
      verified: true,
      phone: "+92 300 2223344",
      email: "sports@iba.edu.pk",
    },
    description:
      "FIBA 3×3 rules, half-court, live DJ. Bring light/dark jerseys, ball size 6/7.",
    format: "FIBA 3×3 · Half-court",
    eligibility: [
      "Open to university & community teams",
      "3–4 players per roster",
    ],
    rules: [
      "12 points target or 10 minutes",
      "Check ball at top",
      "2s/1s scoring",
    ],
    disqualify: ["Unsportsmanlike technical twice", "Bench interference"],
    policies: [
      "No jewelry on court",
      "Teams must keep scoresheet updated",
    ],
    regDeadline: "2025-10-03",
    games: [
      { round: "Pools", when: "2025-10-06 18:00" },
      { round: "Knockouts", when: "2025-10-06 20:00" },
    ],
  },
  {
    id: "ev-sports-carnival",
    slug: "university-sports-carnival-2025",
    sport: "multi",
    title: "University Sports Carnival 2025",
    city: "Islamabad",
    venue: "Jinnah Sports Complex",
    lat: 33.7070, lng: 73.0489,
    date: "2025-12-12",
    time: "10:00",
    slots: 60,
    filled: 41,
    entryFee: 0,
    banner: "/banners/multi-1.jpg",
    host: {
      name: "Uni Sports Council",
      type: "Council",
      avatar: "/hosts/usc.png",
      verified: false,
      phone: "+92 345 4455667",
      email: "usc@university.pk",
    },
    description:
      "Open community carnival: cricket (tape), football 5s, basketball 3×3, badminton doubles.",
    format: "Multi-sport · Day-long",
    eligibility: ["One sport per team", "Family-friendly event"],
    rules: ["Sport-specific rules apply per bracket"],
    disqualify: ["Harassment or unsafe behavior"],
    policies: ["Code of conduct applies to all areas"],
    regDeadline: "2025-12-05",
    games: [
      { sport: "cricket", round: "Tape Ball – Pools", when: "2025-12-12 10:00" },
      { sport: "football", round: "5-a-side – R16", when: "2025-12-12 12:00" },
      { sport: "basketball", round: "3×3 – QF", when: "2025-12-12 14:00" },
      { sport: "badminton", round: "Doubles – Finals", when: "2025-12-12 16:00" },
    ],
  },
];

export const SPORT_LABEL = (s) =>
  s === "multi" ? "Multi-sport" : s[0].toUpperCase() + s.slice(1);
export const SPORT_ICON = (s) =>
  s === "cricket" ? "🏏" :
  s === "football" ? "⚽" :
  s === "basketball" ? "🏀" :
  s === "badminton" ? "🏸" :
  s === "tennis" ? "🎾" : "🏅";
