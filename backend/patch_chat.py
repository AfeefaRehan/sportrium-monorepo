# backend/patch_chat.py
import json
import os
import re
import time
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

# --- greetings (make them distinct)
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
    return None  # let the rest of the router decide

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

TRAINING_TIPS = {
    "football":   "Light warm-up → short passes, wall-passes, cone ball-control; chhota 5v5 game-like play.",
    "basketball": "Ball-handling dono haath, layups, free-throws, defensive stance; 3-on-3 short games.",
    "cricket":    "Straight-bat throw-downs, line/length markers, high-catches, ground-fielding; short nets.",
    "badminton":  "Split-step & shadow footwork, net-control, clears/smash form (light), 11-pt rallies.",
    "tennis":     "Grip basics, bounce-hit timing, mini-court rallies, serve toss practice; short rally games.",
}

def _is_health_question(text: str) -> bool:
    return bool(re.search(HEALTH_Q, (text or "").lower()))

def _is_history_question(text: str) -> bool:
    s = (text or "").lower()
    return ("history" in s or "tareekh" in s)

def _is_training_question(text: str) -> bool:
    s = (text or "").lower()
    return ("drill" in s or "training" in s or "practice" in s)

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

def _parse_explicit_date(text: str) -> Optional[date]:
    s = re.sub(r"[,\s]+", " ", text.strip().lower())
    m = re.search(r"\b(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})\b", s)
    if m and m.group(2) in MONTHS:
        d, mon, y = int(m.group(1)), MONTHS[m.group(2)], int(m.group(3))
        try: return date(y, mon, d)
        except: pass
    m = re.search(r"\b([a-z]{3,9})\s+(\d{1,2})\s+(\d{4})\b", s)
    if m and m.group(1) in MONTHS:
        mon, d, y = MONTHS[m.group(1)], int(m.group(2)), int(m.group(3))
        try: return date(y, mon, d)
        except: pass
    m = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b", s)
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if c < 100: c += 2000
        for dd, mm in [(a, b), (b, a)]:
            try: return date(c, mm, dd)
            except: pass
    return None

def _parse_when_from_text(text: str, today: Optional[date] = None) -> Optional[Tuple[date, date, str]]:
    today = today or date.today()
    s = text.lower()

    if re.search(r"\b(aaj|aj|today)\b", s):     return today, today, "aaj"
    if re.search(r"\b(kal|kl|tomorrow)\b", s):  return today + timedelta(days=1), today + timedelta(days=1), "kal"
    if re.search(r"\b(this week|is hafta|is week)\b", s):
        start = today - timedelta(days=today.weekday()); end = start + timedelta(days=6); return start, end, "is haftay"
    if re.search(r"\b(weekend|hafta akhir)\b", s):
        fri = today + timedelta((4 - today.weekday()) % 7); return fri, fri + timedelta(days=2), "weekend"

    for wd, idx in WEEKDAY_IDX.items():
        if re.search(rf"\b{wd}\b", s):
            d = _next_weekday(idx, today); return d, d, wd

    dt = _parse_explicit_date(s)
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
            return f"{label} {city} me{sp} koi listing nazar nahi aayi. Nearby city/another date try karna chahenge?"
        return f"No matches found in {city} for {sport or 'the selected sports'} {label}."
    bullets = "\n".join([f"• {g['title']} • {g['city']} • {g['venue']} • {g['when']}" for g in games[:5]])
    if lang == "ur":
        return f"{city} me {label} ye options mile:\n{bullets}\nDetails ‘Schedule’ page par dekh sakte hain."
    return f"In {city}, {label} I found:\n{bullets}\nCheck the Schedule page for details."

def _auto_expand_if_empty(city: str, sport: Optional[str], d_from: date, d_to: date, lang: str) -> Tuple[List[Dict], str, Tuple[date, date]]:
    games = _query_api_games(city, sport, d_from, d_to)
    if games:
        return games, "aaj", (d_from, d_to)
    g2 = _query_api_games(city, sport, d_from + timedelta(days=1), d_to + timedelta(days=1))
    if g2:
        lbl = "kal" if lang == "ur" else "tomorrow"
        return g2, lbl, (d_from + timedelta(days=1), d_to + timedelta(days=1))
    start = d_from - timedelta(days=d_from.weekday()); end = start + timedelta(days=6)
    g3 = _query_api_games(city, sport, start, end)
    if g3:
        lbl = "is haftay" if lang == "ur" else "this week"
        return g3, lbl, (start, end)
    return _dummy_games(city, sport), "suggested", (d_from, d_to)

# -------- maps helpers --------
def _build_gmaps_link(origin: str, destination: str) -> str:
    o = quote_plus(origin.strip())
    d = quote_plus(destination.strip())
    return f"https://www.google.com/maps/dir/?api=1&origin={o}&destination={d}&travelmode=driving"

def _extract_landmark(text: str) -> str:
    # very light clean-up: drop filler words like "near/ke paas"
    s = (text or "").strip()
    s = re.sub(r"\b(near|ke paas|pass|around|close to)\b", "", s, flags=re.I)
    return s.strip()

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
        role = m["role"]
        parts = [{"text": m["content"]}]
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
        if city and sport is not None and when:
            break

    if when is None:
        when = (today, today, "aaj")

    Memory.set(user_id, city=city, sport=sport, when=when)
    return city, sport, when, lang

def _choose_and_generate(messages: List[Dict], user_id: Optional[str]) -> Tuple[str, str]:
    user_text = _last_user_text(messages)
    city, sport, (d_from, d_to, label), lang = _collect_context(messages, user_id)

    # ---------- greetings (early) ----------
    g = _chitchat_reply(user_text, lang)
    if g:
        return g, "greeting"

    # ---------- HARD GUARDRAILS / STATIC ANSWERS ----------
    if _is_health_question(user_text):
        if lang == "ur":
            base = ("Main medical/health advice nahi deta/deti — aisi cheezon ke liye "
                    "qualified doctor ya coach se mashwara karein.")
            if sport and sport in TRAINING_TIPS:
                tips = f"\nSafe practice idea ({sport}): {TRAINING_TIPS[sport]}"
                return base + tips, "guardrail"
            return base + "\nGeneral safe practice: chhoti skill blocks + game-like practice. Kis sport ke liye tips chahiyen?", "guardrail"

        base = "I can’t provide medical/health advice. Please consult a qualified doctor or coach."
        if sport and sport in TRAINING_TIPS:
            return f"{base}\nSafe practice idea ({sport}): {TRAINING_TIPS[sport]}", "guardrail"
        return f"{base}\nGeneral safe practice: short skill blocks + game-like drills. Which sport?", "guardrail"

    if _is_history_question(user_text):
        sp = sport
        if not sp:
            for k in HISTORY_SHORT:
                if k in (user_text or "").lower():
                    sp = k; break
        if sp and sp in HISTORY_SHORT:
            return HISTORY_SHORT[sp], "history"
        ask = "Kis sport ki history chahiyen? (football/basketball/cricket/badminton/tennis)" if lang=="ur" \
              else "Which sport’s history? (football/basketball/cricket/badminton/tennis)"
        return ask, "history-ask"

    if _is_training_question(user_text):
        if sport and sport in TRAINING_TIPS:
            line = TRAINING_TIPS[sport]
            msg = f"{sport.title()} drills: {line}\n(Health/medical advice nahi deta/deti.)" if lang=="ur" \
                  else f"{sport.title()} drills: {line}\n(I don’t provide medical/health advice.)"
            return msg, "training"
        ask = "Kis sport ke drills? (football/basketball/cricket/badminton/tennis)" if lang=="ur" \
              else "Which sport drills? (football/basketball/cricket/badminton/tennis)"
        return ask, "training-ask"

    # ---------- ML Router ----------
    intent, conf = ("fallback", 0.0)
    if _ROUTER:
        try:
            intent, conf = _ROUTER.classify(user_text)
        except Exception:
            intent, conf = ("fallback", 0.0)

    state_summary = f"city={city or '∅'} | sport={sport or '∅'} | date_label={label}"

    # Low confidence & not obviously a fixture query: route to LLM / generic help, NOT city ask
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

    # ---------- Intent: find matches ----------
    if intent == "find_matches" or re.search(MATCH_WORDS, (user_text or "").lower()):
        if not city:
            return ("City bata dein (e.g., Karachi/Lahore/Islamabad), main results turant dikha dun."
                    if lang == "ur" else
                    "Please tell me the city (e.g., Karachi/Lahore/Islamabad) and I’ll show the fixtures."), "local-matches"

        games, lbl, (df, dt) = _auto_expand_if_empty(city, sport, d_from, d_to, lang)
        Memory.set(user_id, when=(df, dt, lbl))
        reply = _summarize_games(games, lang, lbl, city, sport)

        # remember games for distance follow-up
        Memory.set(user_id, last_games=games)

        # de-dupe identical filters
        mem = Memory.get(user_id)
        search_key = (city.lower(), sport or "", df.isoformat(), dt.isoformat())
        if mem.get("last_key") == search_key and mem.get("last_reply") == reply:
            alt = ("Yehi filters pe check ho chuka hai. Kya main kisi aur city/date (e.g., Islamabad / weekend) try karu, ya sport change karun?"
                   if lang == "ur" else
                   "We already checked these filters. Want me to try another city/date (e.g., Islamabad / weekend) or a different sport?")
            return alt, "local-matches-suggest"
        Memory.set(user_id, last_key=search_key, last_reply=reply)
        return reply, "local-matches"

    # ---------- Intent: distance with simple state machine ----------
    mem = Memory.get(user_id)
    dist_state = mem.get("dist") or {}

    if intent == "distance" or dist_state:
        # 1) capture origin if user just sent a landmark word
        landmark = _extract_landmark(user_text)
        if landmark and not dist_state.get("origin"):
            dist_state["origin"] = landmark

        # 2) destination: try last suggested match's first venue, else wait for user
        destination = dist_state.get("destination")
        if not destination:
            last_games = mem.get("last_games") or []
            if last_games:
                first = last_games[0]
                # venue + city is usually enough for Maps
                destination = (first.get("venue") or "Sports venue") + (f", {first.get('city')}" if first.get("city") else "")
                dist_state["destination"] = destination

        # 3) if we have origin + destination → produce link and clear state
        if dist_state.get("origin") and dist_state.get("destination"):
            origin = dist_state["origin"]
            dest = dist_state["destination"]
            link = _build_gmaps_link(origin if city is None else f"{origin}, {city}", dest)
            Memory.set(user_id, dist=None)  # clear state
            msg = (f"Yeh approximate route link hai:\n{link}\n"
                   f"(Travel time Google Maps par depend karta hai.)" if lang == "ur"
                   else f"Here’s an approximate route:\n{link}\n(Travel time depends on Google Maps.)")
            return msg, "distance-link"

        # 4) otherwise ask for the missing piece and persist state
        Memory.set(user_id, dist=dist_state)
        need = "origin" if not dist_state.get("origin") else "destination"
        if need == "origin":
            ask = "Apna area/landmark batayen (e.g., Garishoh) — link bhejta hoon." if lang == "ur" \
                  else "Tell me your area/landmark (e.g., Garishoh) — I’ll send the link."
        else:
            ask = "Kis venue/match tak distance chahiye? (match card ka naam/venue)" if lang == "ur" \
                  else "Distance to which venue/match? (send the match/venue name)"
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

    if intent == "history":
        if sport and sport in HISTORY_SHORT: return HISTORY_SHORT[sport], "history"
        ask = "Kis sport ki history chahiyen? (football/basketball/cricket/badminton/tennis)" if lang=="ur" \
              else "Which sport’s history? (football/basketball/cricket/badminton/tennis)"
        return ask, "history-ask"

    if intent == "training":
        if sport and sport in TRAINING_TIPS:
            line = TRAINING_TIPS[sport]
            msg = f"{sport.title()} drills: {line}\n(Health/medical advice nahi deta/deti.)" if lang=="ur" \
                  else f"{sport.title()} drills: {line}\n(I don’t provide medical/health advice.)"
            return msg, "training"
        ask = "Kis sport ke drills? (football/basketball/cricket/badminton/tennis)" if lang=="ur" \
              else "Which sport drills? (football/basketball/cricket/badminton/tennis)"
        return ask, "training-ask"

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
            user_id = data.get("userId") or data.get("user_id") or None
            cleaned = _clean_messages(messages)
            if not cleaned:
                return jsonify({"ok": False, "error": "Empty content after normalization."}), 400

            reply, provider = _choose_and_generate(cleaned, user_id)
            return jsonify({"ok": True, "provider": provider, "reply": reply})

        app.add_url_rule("/api/chat", endpoint="public_chat", view_func=_chat, methods=["POST"])
