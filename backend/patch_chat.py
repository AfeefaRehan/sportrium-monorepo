import json
import os
import re
import time
import hashlib
import requests
from difflib import get_close_matches
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote_plus

# =========================================================
# Config & Globals
# =========================================================
API_TIMEOUT = float(os.getenv("API_TIMEOUT_SEC", "3.5"))
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT_SEC", "6"))
CIRCUIT_TRIP_ERRORS = int(os.getenv("LLM_CIRCUIT_TRIP", "3"))
CIRCUIT_COOLDOWN = int(os.getenv("LLM_CIRCUIT_COOLDOWN_SEC", "300"))

PUBLIC_API_BASE = os.getenv("PUBLIC_API_BASE", "").strip() or f"http://127.0.0.1:{os.getenv('PORT','5000')}"
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o-mini")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
SYSTEM_PROMPT_FILE = os.getenv("ASSISTANT_SYSTEM_PROMPT_FILE", "backend/prompt_playbook_ur.txt")

# --- fixture keywords + general-question keywords (to stop city prompts on non-match Qs)
MATCH_WORDS = r"(match|matches|fixture|fixtures|game|games|schedule)"
NON_MATCH_Q = (
    r"(kya kaam|kaise|kyun|kya hota|what is|what's|how (do|does|to)|help|explain|"
    r"history|tareekh|drill|drills|practice|training|exercise|workout|diet|nutrition|"
    r"purpose|use|how to use|ticket|price|entry|remind|follow)"
)

# ---- distance lexical triggers
DISTANCE_WORDS = re.compile(
    r"\b(distance|fasla|door|rasta|raasta|route|direction|directions|"
    r"kitna\s*distance|kitni\s*door|kitna\s*time|travel\s*time|km|kilomet(er|re)s?)\b",
    re.I
)

def _looks_distance(text: str) -> bool:
    return bool(DISTANCE_WORDS.search((text or "").lower()))

# ---- "any date / upcoming" detector
ANY_DATE_RE = re.compile(
    r"(koi (bhi|specific)? date (nahi|nai)\s*hai|apni marzi se|any date|upcoming|coming (week|days)|"
    r"jald|aane wale|jo next ho|koi bhi din)", re.I
)
def _wants_any_date(text: str) -> bool:
    return bool(ANY_DATE_RE.search((text or "")))

# ---- date-ish detector (so "18 september" alone triggers matches flow)
DATEISH_RE = re.compile(
    r"(\b\d{1,2}\s+[a-z]{3,9}\b|\b[a-z]{3,9}\s+\d{1,2}\b|\b(today|tomorrow|aaj|aj|kal|kl|this week|weekend|hafta)\b)",
    re.I
)
def _looks_dateish(text: str) -> bool:
    return bool(DATEISH_RE.search((text or "").lower()))

# --- greetings (distinct)
SALAM_RE = re.compile(r"\b(ass?ala?m( ?o|[- ]o)? ?ala?iku?m|salam|slam)\b", re.I)
HI_RE     = re.compile(r"\b(hi|hello|hey)\b", re.I)

def _chitchat_reply(text: str, lang: str) -> Optional[str]:
    s = (text or "").strip().lower()
    if SALAM_RE.search(s):
        return ("Wa alaikum as-salam! Aap kaise hain? Matches, teams ya events pooch sakte hain. 🙂"
                if lang == "ur"
                else "Wa-alaikum-salam! How are you? You can ask about matches, teams, or events. 🙂")
    if HI_RE.search(s):
        return ("Hello! Kaise hain aap? Matches, teams ya events pooch sakte hain. 🙂"
                if lang == "ur"
                else "Hello! How are you doing? You can ask about matches, teams, or events. 🙂")
    return None

# ---- "more/else" for drills
MORE_RE = re.compile(r"\b(more|else|another|aur|or bhi|kuch aur|anything else)\b", re.I)
def _is_more_request(text: str) -> bool:
    return bool(MORE_RE.search((text or "").lower()))

# ===== TensorFlow intent router (best-effort) =====
try:
    from .nlp.router import IntentRouter  # package import
except Exception:
    try:
        from backend.nlp.router import IntentRouter  # script import
    except Exception:
        IntentRouter = None  # type: ignore

_ROUTER = None
if IntentRouter:
    try:
        _ROUTER = IntentRouter()
    except Exception:
        _ROUTER = None

INTENT_THRESH = 0.55  # below this → clarify (but only for fixture-like queries)

# ===== Lightweight guardrails / canned knowledge =====
HEALTH_Q = (
    r"(exercise|workout|diet|nutrition|injury|rehab|recovery|supplement|medicine|"
    r"doctor|physio|trainer|strong body|muscle|fat|weight|kamar dard|ghutna|knee|back pain)"
)

HISTORY_SHORT = {
    "football":   "Modern football 1800s Europe me organize hua; aaj duniya ka sab se popular khel hai.",
    "basketball": "1891 me US me James Naismith ne banaya; indoor winter game se global sport bana.",
    "cricket":    "England se 16–18th century; phir Commonwealth me phaila; formats: Test/ODI/T20.",
    "badminton":  "19th-century UK/India roots; tez racket sport; Asia ne bohat dominate kiya.",
    "tennis":     "19th-century UK/France; Grand Slams sab se mashhoor events.",
}

# --- Multi-pack drills to avoid repetition
TRAINING_DRILLS = {
    "football": [
        [
            "Light jog + mobility (5 min)",
            "First-touch: toe taps / box touches (2×40s)",
            "Passing gates (2-touch, 5 min)",
            "Wall-passes 50/foot",
            "5v2 rondo (6–8 min)"
        ],
        [
            "Dribbling ladders / cones (4×30s)",
            "1v1 shielding + turns (6 min)",
            "Finishing inside the box (20 shots)",
            "Short corners setup (5 min)",
            "Cooldown + stretches (5 min)"
        ],
    ],
    "basketball": [
        [
            "Ball-handling (cross/behind/in-n-out) 3×30s",
            "Layup series L/R (3×6 each)",
            "Form shooting (25 makes)",
            "Defensive slides (3×20m)",
            "3-on-3 half-court"
        ],
        [
            "Close-outs drill (3×6)",
            "Pick-and-roll 2-on-2",
            "Free throws (20 makes)",
            "Rebounding box-out (3×6)",
            "Scrimmage 10 min"
        ],
    ],
    "cricket": [
        [
            "Straight-bat throw-downs (30 balls)",
            "Front-foot drives on cones",
            "Bowling line/length markers (24 balls)",
            "High-catch technique (10)",
            "Ground fielding shuttle (3×6)"
        ],
        [
            "Back-foot punches (20)",
            "Power-hitting arcs (15)",
            "Yorker target (12)",
            "Slip catching (12)",
            "Wicket-to-wicket throws (3×6)"
        ],
    ],
    "badminton": [
        [
            "Split-step & shadow footwork (3×60s)",
            "Net kill control (3×10)",
            "Clear–drop alternating (3×10)",
            "Serve accuracy (3×10)",
            "11-pt rally games"
        ],
        [
            "Multi-shuttle drives (3×12)",
            "Backhand clears (3×8)",
            "Smash form light (2×10)",
            "Deception net shots (3×8)",
            "Half-court singles"
        ],
    ],
    "tennis": [
        [
            "Mini-court rallies (5 min)",
            "Forehand contact in front (3×10)",
            "Backhand rhythm (3×10)",
            "Serve toss height drill (3×8)",
            "Baseline to service-line game"
        ],
        [
            "Approach + volley pattern (3×8)",
            "Cross-court consistency (20 balls/side)",
            "Second-serve spin (3×6)",
            "Return blocks (3×8)",
            "Tie-break to 7"
        ],
    ],
}

def _is_health_question(text: str) -> bool:
    return bool(re.search(HEALTH_Q, (text or "").lower()))

def _is_history_question(text: str) -> bool:
    s = (text or "").lower()
    return ("history" in s or "tareekh" in s)

def _is_training_question(text: str) -> bool:
    s = (text or "").lower()
    return ("drill" in s or "training" in s or "practice" in s or "tips" in s)

def _looks_nonmatch(text: str) -> bool:
    s = (text or "").lower()
    return (re.search(NON_MATCH_Q, s) is not None) and (re.search(MATCH_WORDS, s) is None)

# =========================================================
# Entities: config-driven with hot reload + fuzzy
# =========================================================
class Entities:
    _path = os.path.join(os.path.dirname(__file__), "data", "entities.json")
    _cache: Dict = {}
    _mtime: float = 0.0

    @classmethod
    def load(cls) -> Dict:
        try:
            mtime = os.path.getmtime(cls._path)
        except Exception:
            return cls._cache or {"cities": {}, "sports": {}}
        if not cls._cache or mtime != cls._mtime:
            try:
                with open(cls._path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                cls._cache = data
                cls._mtime = mtime
            except Exception:
                pass
        return cls._cache or {"cities": {}, "sports": {}}

    @classmethod
    def resolve_city(cls, text: str) -> Optional[str]:
        s = text.lower()
        ents = cls.load().get("cities", {})
        for canonical, syns in ents.items():
            for w in syns:
                if re.search(rf"\b{re.escape(w.lower())}\b", s):
                    return canonical
        canon_list = list(ents.keys())
        m = get_close_matches(next((w for w in re.findall(r"[a-z]+", s)), ""), canon_list, n=1, cutoff=0.90)
        return m[0] if m else None

    @classmethod
    def resolve_sport(cls, text: str) -> Optional[str]:
        s = text.lower()
        ents = cls.load().get("sports", {})
        for canonical, syns in ents.items():
            for w in syns:
                if re.search(rf"\b{re.escape(w.lower())}\b", s):
                    return canonical
        canon_list = list(ents.keys())
        m = get_close_matches(next((w for w in re.findall(r"[a-z]+", s)), ""), canon_list, n=1, cutoff=0.90)
        return m[0] if m else None

    @classmethod
    def resolve_sports(cls, text: str) -> List[str]:
        """Return all sports mentioned in the text (handles 'basketball aur cricket' etc.)."""
        s = (text or "").lower()
        s = re.sub(r"[,\u0600-\u06FF]+", " ", s)
        s = re.sub(r"\b(aur|and|&|or|ya)\b", " ", s)
        ents = cls.load().get("sports", {})
        found: List[str] = []
        for canonical, syns in ents.items():
            for w in syns:
                if re.search(rf"\b{re.escape(w.lower())}\b", s):
                    found.append(canonical); break
        seen = set()
        return [x for x in found if not (x in seen or seen.add(x))]

# =========================================================
# Mini memory (per user follow-ups) — in-process TTL
# =========================================================
class Memory:
    _store: Dict[str, Dict] = {}
    _ttl = 60 * 30  # 30 minutes

    @classmethod
    def get(cls, uid: Optional[str]) -> Dict:
        if not uid:
            return {}
        rec = cls._store.get(uid) or {}
        if rec and time.time() - rec.get("_ts", 0) > cls._ttl:
            cls._store.pop(uid, None)
            return {}
        return rec

    @classmethod
    def set(cls, uid: Optional[str], **slots):
        if not uid:
            return
        rec = cls._store.get(uid) or {}
        rec.update(slots)
        rec["_ts"] = time.time()
        cls._store[uid] = rec

# =========================================================
# Helpers
# =========================================================
def _last_user_text(messages: List[Dict]) -> str:
    for m in reversed(messages or []):
        if (m.get("role") or "").lower() == "user":
            return (m.get("content") or "").strip()
    return ""

def _clean_messages(messages: List[Dict], max_items: int = 14, max_chars: int = 2000) -> List[Dict]:
    out: List[Dict] = []
    if not isinstance(messages, list):
        return out
    for m in messages[-max_items:]:
        role = (m.get("role") or "user").lower()
        content = (m.get("content") or "").strip()
        if not content:
            continue
        if len(content) > max_chars:
            content = content[:max_chars] + "…"
        out.append({"role": role, "content": content})
    return out

def _mirror_language(user_text: str) -> str:
    if re.search(r"[\u0600-\u06FF]", user_text):
        return "ur"
    if re.search(r"\b(aaj|aj|kal|kl|hafta|itwaar|jumma|shanba|match|khel|city|sport)\b", user_text.lower()):
        return "ur"
    return "en"

# =========================================================
# Natural date parsing (Urdu/Roman-Urdu + English)
# =========================================================
WEEKDAY_IDX = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
    "jumma": 4, "juma": 4, "shanba": 5, "itwaar": 6, "aitvar": 6
}
MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12
}

def _next_weekday(idx_target: int, today: date) -> date:
    delta = (idx_target - today.weekday()) % 7
    return today + timedelta(days=delta or 7)

def _nearest_future_day_month(day: int, mon: int, today: date) -> Optional[date]:
    try:
        dt = date(today.year, mon, day)
    except Exception:
        return None
    if dt < today:
        try:
            dt = date(today.year + 1, mon, day)
        except Exception:
            return None
    return dt

def _parse_explicit_date(text: str, today: Optional[date] = None) -> Optional[date]:
    today = today or date.today()
    s = re.sub(r"[,:\s]+", " ", text.strip().lower())

    # dd month yyyy
    m = re.search(r"\b(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})\b", s)
    if m and m.group(2) in MONTHS:
        d, mon, y = int(m.group(1)), MONTHS[m.group(2)], int(m.group(3))
        try: return date(y, mon, d)
        except: pass

    # month dd yyyy
    m = re.search(r"\b([a-z]{3,9})\s+(\d{1,2})\s+(\d{4})\b", s)
    if m and m.group(1) in MONTHS:
        mon, d, y = MONTHS[m.group(1)], int(m.group(2)), int(m.group(3))
        try: return date(y, mon, d)
        except: pass

    # dd/month/yy(yy) or month/dd/yy(yy)
    m = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b", s)
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if c < 100: c += 2000
        for dd, mm in [(a, b), (b, a)]:
            try:
                return date(c, mm, dd)
            except:
                pass

    # NEW: dd month  (no year) → next occurrence
    m = re.search(r"\b(\d{1,2})\s+([a-z]{3,9})\b", s)
    if m and m.group(2) in MONTHS:
        d, mon = int(m.group(1)), MONTHS[m.group(2)]
        return _nearest_future_day_month(d, mon, today)

    # NEW: month dd  (no year) → next occurrence
    m = re.search(r"\b([a-z]{3,9})\s+(\d{1,2})\b", s)
    if m and m.group(1) in MONTHS:
        mon, d = MONTHS[m.group(1)], int(m.group(2))
        return _nearest_future_day_month(d, mon, today)

    return None

def _parse_when_from_text(text: str, today: Optional[date] = None) -> Optional[Tuple[date, date, str]]:
    """Smart parse; also honors 'any date / upcoming' by widening automatically."""
    today = today or date.today()
    s = text.lower()

    # "any date / upcoming" → 21-day window
    if _wants_any_date(s):
        return today, today + timedelta(days=21), "upcoming"

    if re.search(r"\b(aaj|aj|today)\b", s):     return today, today, "aaj"
    if re.search(r"\b(kal|kl|tomorrow)\b", s):  return today + timedelta(days=1), today + timedelta(days=1), "kal"
    if re.search(r"\b(this week|is hafta|is week)\b", s):
        start = today - timedelta(days=today.weekday()); end = start + timedelta(days=6); return start, end, "is haftay"
    if re.search(r"\b(weekend|hafta akhir)\b", s):
        fri = today + timedelta((4 - today.weekday()) % 7); return fri, fri + timedelta(days=2), "weekend"
    for wd, idx in WEEKDAY_IDX.items():
        if re.search(rf"\b{wd}\b", s):
            d = _next_weekday(idx, today); return d, d, wd
    dt = _parse_explicit_date(s, today=today)
    if dt: return dt, dt, dt.strftime("%d %b %Y")
    return None

# =========================================================
# API & formatting
# =========================================================
def _query_api_games(city: str, sport: Optional[str], d_from: date, d_to: date, limit: int = 5) -> List[Dict]:
    url = f"{PUBLIC_API_BASE}/api/events"
    params = {
        "city": city,
        "status": "upcoming",
        "limit": str(limit),
        "date_from": d_from.isoformat(),
        "date_to": d_to.isoformat(),
    }
    if sport:
        params["sports"] = sport
    try:
        r = requests.get(url, params=params, timeout=API_TIMEOUT)
        if r.status_code != 200:
            return []
        data = r.json()
        items = data.get("items") or data.get("games") or data.get("data") or data
        out = []
        for it in items or []:
            out.append({
                "title": it.get("title") or it.get("name") or "Match",
                "sport": it.get("sport") or sport or "",
                "city": it.get("city") or city,
                "venue": it.get("venue") or it.get("location") or "",
                "when": it.get("when") or it.get("start_time") or it.get("start") or "",
            })
        return out
    except Exception:
        return []

def _dummy_games(city: str, sport: Optional[str]) -> List[Dict]:
    pool = [
        {"title": "Falcons vs Kings", "sport": "football", "city": "Karachi",   "venue": "City Arena",      "when": "7:30 PM"},
        {"title": "Lions vs Rangers", "sport": "basketball","city": "Lahore",    "venue": "Model Town Ground","when": "5:00 PM"},
        {"title": "Royals vs City",   "sport": "cricket",   "city": "Lahore",    "venue": "Sports Arena",    "when": "6:00 PM"},
        {"title": "Smashers Open",    "sport": "badminton", "city": "Islamabad", "venue": "Indoor Hall A",   "when": "4:00 PM"},
        {"title": "Tennis Meetup",    "sport": "tennis",    "city": "Islamabad", "venue": "Club Courts",     "when": "6:30 PM"},
    ]
    return [it for it in pool if it["city"].lower() == city.lower() and (sport is None or it["sport"] == sport)]

def _summarize_games(games: List[Dict], lang: str, label: str, city: str, sport: Optional[str]) -> str:
    if not games:
        if lang == "ur":
            sn = {"football":"football","cricket":"cricket","basketball":"basketball","badminton":"badminton","tennis":"tennis"}.get(sport or "", "")
            sp = f" {sn}" if sn else ""
            return f"{city} me {label}{sp} koi listing nazar nahi aayi. 'Nearby city' ya 'upcoming/this week' try karen ya Schedule page par check karen."
        return f"No matches found in {city} for {sport or 'the selected sports'} {label}. Try a nearby city or a wider window (upcoming/this week)."
    bullets = "\n".join([f"• {g['title']} • {g['city']} • {g['venue']} • {g['when']}" for g in games[:5]])
    if lang == "ur":
        return f"{city} me {label} ye options mile:\n{bullets}\nDetails ‘Schedule’ page par dekh sakte hain."
    return f"In {city}, {label} I found:\n{bullets}\nCheck the Schedule page for details."

def _summarize_multi(grouped: Dict[str, List[Dict]], lang: str, label: str, city: str) -> str:
    """Per-sport buckets when user asks for multiple sports at once."""
    parts = []
    for sp, games in grouped.items():
        if not games:
            continue
        bullets = "\n".join([f"• {g['title']} • {g['venue']} • {g['when']}" for g in games[:5]])
        parts.append(f"**{sp.title()}**:\n{bullets}")
    if not parts:
        return _summarize_games([], lang, label, city, None)
    tail = "Details ‘Schedule’ page par dekh sakte hain." if lang == "ur" else "See the Schedule page for details."
    return f"{city} me {label}:\n\n" + "\n\n".join(parts) + f"\n{tail}"

def _auto_expand_if_empty(city: str, sport: Optional[str], d_from: date, d_to: date, lang: str) -> Tuple[List[Dict], str, Tuple[date, date]]:
    """Try given window; if empty, widen intelligently."""
    # 1) try given window
    games = _query_api_games(city, sport, d_from, d_to)
    if games:
        lbl = "upcoming" if (d_to - d_from).days > 0 else "aaj"
        return games, lbl, (d_from, d_to)

    # 2) if user asked 'any date' or large window → widen further
    span = (d_to - d_from).days
    if span >= 1:
        g2 = _query_api_games(city, sport, d_from, d_from + timedelta(days=60))
        if g2:
            return g2, "upcoming", (d_from, d_from + timedelta(days=60))

    # 3) fallback: next day
    g3 = _query_api_games(city, sport, d_from + timedelta(days=1), d_to + timedelta(days=1))
    if g3:
        lbl = "kal" if lang == "ur" else "tomorrow"
        return g3, lbl, (d_from + timedelta(days=1), d_to + timedelta(days=1))

    # 4) this week
    start = d_from - timedelta(days=d_from.weekday()); end = start + timedelta(days=6)
    g4 = _query_api_games(city, sport, start, end)
    if g4:
        lbl = "is haftay" if lang == "ur" else "this week"
        return g4, lbl, (start, end)

    # 5) dummy suggestions
    return _dummy_games(city, sport), "suggested", (d_from, d_to)

# -------- maps helpers --------
def _build_gmaps_link(origin: str, destination: str) -> str:
    o = quote_plus(origin.strip())
    d = quote_plus(destination.strip())
    return f"https://www.google.com/maps/dir/?api=1&origin={o}&destination={d}&travelmode=driving"

def _extract_landmark(text: str) -> str:
    s = (text or "").strip()
    s = re.sub(r"\b(near|ke paas|pass|around|close to)\b", "", s, flags=re.I)
    return s.strip()

# ---- from..to parser for distance
SE_RE  = r"(se|say|sy)"
TAK_RE = r"(tak|tk|to)"

def _strip_fillers(s: str) -> str:
    s = re.sub(r"\b(mein|main|rehta|rehti|hon|hoon|mujhay|mujhe|kitna|kitni|"
               r"distance|fasla|door|jana|jaana|parta|lagta|lagay|near)\b", "", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def _parse_from_to(text: str) -> Tuple[Optional[str], Optional[str]]:
    m = re.search(r"from\s+(.+?)\s+to\s+(.+)", text, re.I)
    if m:
        return _strip_fillers(m.group(1)), _strip_fillers(m.group(2))
    m = re.search(rf"(.+?)\s+{SE_RE}\s+(.+?)\s+{TAK_RE}\b", text, re.I)
    if m:
        return _strip_fillers(m.group(1)), _strip_fillers(m.group(2))
    m = re.search(rf"(.+?)\s+(.+?)\s+{TAK_RE}\b", text, re.I)
    if m:
        left = _strip_fillers(m.group(1)); mid = _strip_fillers(m.group(2))
        if re.search(r"\b(ground|stadium|arena|club|complex|court|uet|university|model town|dha)\b", mid, re.I):
            return left, mid
    return None, None

# =========================================================
# LLM providers + circuit breaker
# =========================================================
class Breaker:
    errors = 0
    tripped_at = 0.0

    @classmethod
    def tripped(cls) -> bool:
        if cls.tripped_at and (time.time() - cls.tripped_at) < CIRCUIT_COOLDOWN:
            return True
        if cls.tripped_at and (time.time() - cls.tripped_at) >= CIRCUIT_COOLDOWN:
            cls.errors = 0; cls.tripped_at = 0.0
        return False

    @classmethod
    def fail(cls):
        cls.errors += 1
        if cls.errors >= CIRCUIT_TRIP_ERRORS:
            cls.tripped_at = time.time()

    @classmethod
    def ok(cls):
        cls.errors = 0; cls.tripped_at = 0.0

def _read_system_prompt() -> str:
    try:
        with open(SYSTEM_PROMPT_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return (
            "You are Sportrium Assistant. Reply in short Roman Urdu (1–3 lines). "
            "Primary tasks: find local matches (city/sport/date), tickets, reminders, how-to. "
            "If logged out: reply only 'Chat use karne ke liye please login karein.' "
            "Never repeat your previous reply; answer the current question. "
            "If data fetch fails say it's a temporary issue and suggest trying another city/date."
        )

def _make_single_turn_messages(user_text: str, state_summary: str) -> List[Dict]:
    system = _read_system_prompt()
    user = (
        f"User message: {user_text}\n"
        f"Known state: {state_summary}\n"
        "Respond briefly in Roman Urdu. If slots missing, ask for them. "
        "If backend returns no data or times out, say it's a temporary issue and offer nearby city/date. "
        "Do not reuse your previous wording."
    )
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]

def _maybe_gemini_reply(messages: List[Dict], system: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    api_key = os.getenv("GOOGLE_API_KEY", "").strip() or os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or Breaker.tripped():
        return None, None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    contents = []
    sys_text = system or _read_system_prompt()
    system_instruction = {"parts": [{"text": sys_text}]}
    for m in messages:
        role = m["role"]; parts = [{"text": m["content"]}]
        contents.append({"role": "user" if role == "user" else "model", "parts": parts})
    payload = {
        "systemInstruction": system_instruction,
        "contents": contents,
        "generationConfig": {"temperature": 0.4, "topP": 0.9, "presencePenalty": 0.6, "frequencyPenalty": 0.6, "maxOutputTokens": 320}
    }
    try:
        r = requests.post(url, json=payload, timeout=LLM_TIMEOUT)
        r.raise_for_status()
        data = r.json()
        text = ""
        cand = (data.get("candidates") or [{}])[0]
        parts = (cand.get("content") or {}).get("parts") or []
        for p in parts:
            t = p.get("text");  text += (t or "")
        text = (text or "").strip()
        if text: Breaker.ok()
        return (text, None) if text else (None, "empty_text")
    except Exception as e:
        Breaker.fail()
        return None, f"Gemini error: {e}"

def _maybe_openai_reply(messages: List[Dict]) -> Tuple[Optional[str], Optional[str]]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or Breaker.tripped():
        return None, None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.4, top_p=0.9,
            presence_penalty=0.6, frequency_penalty=0.6,
            max_tokens=350, timeout=LLM_TIMEOUT
        )
        text = (resp.choices[0].message.content or "").strip()
        if text: Breaker.ok()
        return (text, None) if text else (None, "empty_text")
    except Exception as e:
        Breaker.fail()
        return None, f"OpenAI error: {e}"

# =========================================================
# Router
# =========================================================
def _collect_context(messages: List[Dict], user_id: Optional[str]) -> Tuple[Optional[str], Optional[str], Tuple[date, date, str], str]:
    today = date.today()
    mem = Memory.get(user_id)
    city = mem.get("city")
    sport = mem.get("sport")
    when = mem.get("when")
    lang = "en"

    for m in reversed(messages):
        if (m.get("role") or "").lower() != "user":
            continue
        text = (m.get("content") or "")
        if not text:
            continue
        lang = _mirror_language(text)
        if city is None:
            c = Entities.resolve_city(text)
            if c: city = c
        if sport is None:
            s = Entities.resolve_sport(text)
            if s: sport = s
        if when is None:
            parsed = _parse_when_from_text(text, today=today)
            if parsed: when = parsed
        # short-circuit if we already have enough
        if city and sport is not None and when:
            break

    # If still no 'when', prefer 'upcoming' wide window instead of "aaj" only
    if when is None:
        when = (today, today + timedelta(days=14), "upcoming")

    Memory.set(user_id, city=city, sport=sport, when=when)
    return city, sport, when, lang

def _choose_and_generate(messages: List[Dict], user_id: Optional[str]) -> Tuple[str, str]:
    user_text = _last_user_text(messages)
    city, sport, (d_from, d_to, label), lang = _collect_context(messages, user_id)

    # ---------- greetings (early) ----------
    g = _chitchat_reply(user_text, lang)
    if g:
        return g, "greeting"

    # ---------- Quick distance path (lexical; before anything else) ----------
    if _looks_distance(user_text):
        mem = Memory.get(user_id)
        dist_state = mem.get("dist") or {}

        # parse both endpoints if present
        o, d = _parse_from_to(user_text)
        if o and not dist_state.get("origin"):
            dist_state["origin"] = o
        if d and not dist_state.get("destination"):
            dist_state["destination"] = d

        # infer destination from last games
        if not dist_state.get("destination"):
            last_games = mem.get("last_games") or []
            if last_games:
                first = last_games[0]
                dist_state["destination"] = (first.get("venue") or "Sports venue") + (f", {first.get('city')}" if first.get("city") else "")

        if dist_state.get("origin") and dist_state.get("destination"):
            origin = dist_state["origin"]; dest = dist_state["destination"]
            link = _build_gmaps_link(origin if city is None else f"{origin}, {city}", dest)
            Memory.set(user_id, dist=None)
            msg = (f"Yeh route link hai:\n{link}\n(Travel time Google Maps par depend karta hai.)"
                   if lang == "ur" else
                   f"Here’s the route:\n{link}\n(Travel time depends on Google Maps.)")
            return msg, "distance-link"

        Memory.set(user_id, dist=dist_state)
        need = "origin" if not dist_state.get("origin") else "destination"
        if need == "origin":
            ask = "Apna area/landmark batayen (e.g., Garishoh) — link bhejta hoon." if lang=="ur"                   else "Tell me your area/landmark (e.g., Garishoh) — I’ll send the link."
        else:
            ask = "Kis venue/match tak distance chahiye? (e.g., Model Town Ground)" if lang=="ur"                   else "Distance to which venue/match? (e.g., Model Town Ground)"
        return ask, "distance-await"

    # ---------- HARD GUARDRAILS / STATIC ANSWERS ----------
    if _is_health_question(user_text):
        if lang == "ur":
            base = ("Main medical/health advice nahi deta/deti — aisi cheezon ke liye qualified doctor ya coach se mashwara karein.")
            if sport and sport in TRAINING_DRILLS:
                tips = "\nSafe practice idea ({s}): ".format(s=sport) + ", ".join(TRAINING_DRILLS[sport][0][:3])
                return base + tips, "guardrail"
            return base + "\nGeneral safe practice: chhoti skill blocks + game-like practice. Kis sport ke liye tips chahiyen?", "guardrail"
        base = "I can’t provide medical/health advice. Please consult a qualified doctor or coach."
        if sport and sport in TRAINING_DRILLS:
            return f"{base}\nSafe practice idea ({sport}): " + ", ".join(TRAINING_DRILLS[sport][0][:3]), "guardrail"
        return f"{base}\nGeneral safe practice: short skill blocks + game-like drills. Which sport?", "guardrail"

    # --- Natural follow-up: "for basketball?" etc. ---
    mem = Memory.get(user_id)
    last_intent = mem.get("last_intent")
    sport_in_text = Entities.resolve_sport(user_text or "")
    if sport_in_text and ("for " in (user_text or "").lower() or "ke liye" in (user_text or "").lower() or (user_text or "").strip().endswith("?")):
        if last_intent in ("training", "history"):
            sport = sport_in_text
            Memory.set(user_id, sport=sport)

    # ---- NEW: if user sent ONLY a date (e.g., "18 September") and we already have city/sport → treat as find_matches
    date_hint = _parse_when_from_text(user_text) or ( (date.today(), date.today()+timedelta(days=21), "upcoming") if _wants_any_date(user_text or "") else None )
    if (date_hint or _looks_dateish(user_text)) and (city or sport or last_intent in ("local-matches","local-matches-suggest")):
        if date_hint:
            Memory.set(user_id, when=date_hint)
            d_from, d_to, label = date_hint
        intent, conf = ("find_matches", 1.0)
    else:
        # ---------- ML Router ----------
        intent, conf = ("fallback", 0.0)
        if _ROUTER:
            try:
                intent, conf = _ROUTER.classify(user_text)
            except Exception:
                intent, conf = ("fallback", 0.0)

    state_summary = f"city={city or '∅'} | sport={sport or '∅'} | date_label={label}"

    # Low confidence & not obviously a fixture query: LLM or generic help
    if conf < INTENT_THRESH and not re.search(MATCH_WORDS, (user_text or "").lower()):
        if _looks_nonmatch(user_text):
            single_turn = _make_single_turn_messages(user_text, state_summary)
            if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
                text, err = _maybe_gemini_reply(single_turn, system=_read_system_prompt())
                if text: return text, "gemini"
            if os.getenv("OPENAI_API_KEY"):
                text, err = _maybe_openai_reply(single_turn)
                if text: return text, "openai"
            return f"Shukriya! (dev-mode) Aap ne kaha: {user_text[:300]}", "mock"

    # ---------- Intent: find matches (multi-sport aware & date-flexible) ----------
    if intent == "find_matches" or re.search(MATCH_WORDS, (user_text or "").lower()):
        if not city:
            return ("City bata dein (e.g., Karachi/Lahore/Islamabad), main results turant dikha dun."
                    if lang == "ur" else
                    "Please tell me the city (e.g., Karachi/Lahore/Islamabad) and I’ll show the fixtures."), "local-matches"

        # sports explicitly mentioned in this message
        asked_sports = Entities.resolve_sports(user_text or "")
        sports_list: List[Optional[str]] = asked_sports or ([sport] if sport else [None])

        # ensure 'upcoming' wide window when user said "any date"
        if _wants_any_date(user_text or "") and (d_to - d_from).days < 7:
            d_to = d_from + timedelta(days=21)
            label = "upcoming"

        # Single/unspecified sport → normal flow
        if len([s for s in sports_list if s]) <= 1:
            sp = sports_list[0] if sports_list else None
            games, lbl, (df, dt) = _auto_expand_if_empty(city, sp, d_from, d_to, lang)
            Memory.set(user_id, when=(df, dt, lbl))
            reply = _summarize_games(games, lang, lbl, city, sp)
            Memory.set(user_id, last_games=games)
            key_sport = sp or ""
        else:
            # Multi-sport → per-sport fetch & bucketize (cap to 3 sports)
            grouped: Dict[str, List[Dict]] = {}
            lbl, df, dt = label, d_from, d_to
            for sp in sports_list[:3]:
                g, lbl, (df, dt) = _auto_expand_if_empty(city, sp, df, dt, lang)
                grouped[sp] = g
            Memory.set(user_id, when=(df, dt, lbl))
            flat = [item for sub in grouped.values() for item in sub]
            Memory.set(user_id, last_games=flat)
            reply = _summarize_multi(grouped, lang, lbl, city)
            key_sport = ",".join([s for s in sports_list[:3] if s])

        # de-dupe identical filters
        mem = Memory.get(user_id)
        search_key = (city.lower(), key_sport, df.isoformat(), dt.isoformat())
        if mem.get("last_key") == search_key and mem.get("last_reply") == reply:
            alt = ("Yehi filters pe check ho chuka hai. Kya main kisi aur city/date (e.g., Islamabad / weekend) try karu, ya sport change karun?"
                   if lang == "ur" else
                   "We already checked these filters. Want me to try another city/date (e.g., Islamabad / weekend) or a different sport?")
            return alt, "local-matches-suggest"
        Memory.set(user_id, last_key=search_key, last_reply=reply, last_intent="local-matches")
        return reply, "local-matches"

    # ---------- Intent: distance with simple state machine (fallback) ----------
    dist_state = mem.get("dist") or {}
    if intent == "distance" or dist_state:
        landmark = _extract_landmark(user_text)
        if landmark and not dist_state.get("origin"):
            dist_state["origin"] = landmark
        destination = dist_state.get("destination")
        if not destination:
            last_games = mem.get("last_games") or []
            if last_games:
                first = last_games[0]
                destination = (first.get("venue") or "Sports venue") + (f", {first.get("city")}" if first.get("city") else "")
                dist_state["destination"] = destination
        if dist_state.get("origin") and dist_state.get("destination"):
            origin = dist_state["origin"]
            dest = dist_state["destination"]
            link = _build_gmaps_link(origin if city is None else f"{origin}, {city}", dest)
            Memory.set(user_id, dist=None)
            msg = (f"Yeh approximate route link hai:\n{link}\n(Travel time Google Maps par depend karta hai.)" if lang == "ur"
                   else f"Here’s an approximate route:\n{link}\n(Travel time depends on Google Maps.)")
            return msg, "distance-link"
        Memory.set(user_id, dist=dist_state)
        need = "origin" if not dist_state.get("origin") else "destination"
        if need == "origin":
            ask = "Apna area/landmark batayen (e.g., Garishoh) — link bhejta hoon." if lang == "ur"                   else "Tell me your area/landmark (e.g., Garishoh) — I’ll send the link."
        else:
            ask = "Kis venue/match tak distance chahiye? (match card ka naam/venue)" if lang == "ur"                   else "Distance to which venue/match? (send the match/venue name)"
        return ask, "distance-await"

    if intent == "ticket_price":
        msg = ("Kis match ka ticket price dekhna chahenge? Event card par 'Ticket info' ya 'TBA' likha hota hai."
               if lang == "ur" else
               "Which match’s ticket price? The event card shows 'Ticket info' or 'TBA'.")
        return msg, "ticket-price"

    if intent == "purpose":
        msg = ("Sportrium ka goal **local sports ko asaan banana** hai: matches dekhna, teams follow/banani, reminders & tickets — sab ek jaga."
               if lang == "ur" else
               "Sportrium helps you discover local matches, follow/create teams, and manage reminders & tickets in one place.")
        return msg, "purpose"

    if intent == "how_to_use":
        msg = ("Easy: 1) Schedule par city/sport/date select karein, 2) Match card kholen, 3) 'Remind me' ya 'Buy tickets', 4) 'Create a Team' se host karein."
               if lang == "ur" else
               "Easy: 1) Go to Schedule → choose city/sport/date, 2) open a match card, 3) use 'Remind me' or 'Buy tickets', 4) 'Create a Team' to host.")
        return msg, "how-to"

    if intent == "reminder":
        msg = ("Reminder lagane ke liye login chahiye. Login karun?"
               if lang == "ur" else
               "You need to be logged in to set a reminder. Want to log in?")
        return msg, "reminder"

    # ---------- Generic / chitchat fallback ----------
    single_turn = _make_single_turn_messages(user_text, state_summary)
    if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
        text, err = _maybe_gemini_reply(single_turn, system=_read_system_prompt())
        if text: return text, "gemini"
        if err:  return f"Sorry, abhi reply nahi bana saka. Thori der baad koshish karein 🙏 ({err})", "gemini"
    if os.getenv("OPENAI_API_KEY"):
        text, err = _maybe_openai_reply(single_turn)
        if text: return text, "openai"
        if err:  return f"Sorry, abhi reply nahi bana saka. Thori der baad koshish karein 🙏 ({err})", "openai"
    return f"Shukriya! (dev-mode) Aap ne kaha: {user_text[:300]}", "mock"

# =========================================================
# Flask patcher
# =========================================================
def _rule_exists(app, path: str, method: str) -> bool:
    m = method.upper()
    for rule in app.url_map.iter_rules():
        if rule.rule == path and m in rule.methods:
            return True
    return False

def _anon_user_id_from_request(req) -> str:
    ua = req.headers.get("User-Agent", "")
    ip = req.headers.get("X-Forwarded-For") or (req.remote_addr or "0")
    key = f"{ip}|{ua}"
    return "anon_" + hashlib.md5(key.encode("utf-8")).hexdigest()

def patch_app(app):
    from flask import jsonify, request

    if not _rule_exists(app, "/api/health", "GET"):
        def _health():
            provider = (
                "gemini" if (os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")) else
                "openai" if os.getenv("OPENAI_API_KEY") else
                "mock"
            )
            return jsonify({
                "ok": True,
                "service": "sportrium-public-api",
                "env": {
                    "API_PREFIX": os.getenv("API_PREFIX", "/api"),
                    "provider": provider,
                    "MODEL_NAME": MODEL_NAME,
                    "GEMINI_MODEL": GEMINI_MODEL,
                    "has_OPENAI_KEY": bool(os.getenv("OPENAI_API_KEY")),
                    "has_GOOGLE_KEY": bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")),
                    "LLM_TIMEOUT_SEC": LLM_TIMEOUT,
                    "LLM_CIRCUIT_TRIPPED": Breaker.tripped(),
                    "PUBLIC_API_BASE": PUBLIC_API_BASE
                },
            })
        app.add_url_rule("/api/health", endpoint="public_health", view_func=_health, methods=["GET"])

    if not _rule_exists(app, "/api/chat", "POST"):
        def _chat():
            data = request.get_json(silent=True) or {}
            messages = data.get("messages")
            if not messages and isinstance(data.get("message"), str):
                messages = [{"role": "user", "content": data["message"]}]
            if not isinstance(messages, list) or not messages:
                return jsonify({"ok": False,
                                "error": "`messages` must be a non-empty list of {role, content} "
                                         "or pass a simple `message` string."}), 400
            # fallback id so logged-out users still get short session memory
            uid_fallback = (data.get("sessionId")
                            or request.headers.get("X-Session-Id")
                            or _anon_user_id_from_request(request))
            user_id = data.get("userId") or data.get("user_id") or uid_fallback

            cleaned = _clean_messages(messages)
            if not cleaned:
                return jsonify({"ok": False, "error": "Empty content after normalization."}), 400

            reply, provider = _choose_and_generate(cleaned, user_id)
            return jsonify({"ok": True, "provider": provider, "reply": reply})

        app.add_url_rule("/api/chat", endpoint="public_chat", view_func=_chat, methods=["POST"])
