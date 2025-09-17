import json, os, re, time, requests
from difflib import get_close_matches
from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple
from urllib.parse import quote_plus

API_TIMEOUT = float(os.getenv("API_TIMEOUT_SEC", "3.5"))
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT_SEC", "6"))
CIRCUIT_TRIP_ERRORS = int(os.getenv("LLM_CIRCUIT_TRIP", "3"))
CIRCUIT_COOLDOWN = int(os.getenv("LLM_CIRCUIT_COOLDOWN_SEC", "300"))

PUBLIC_API_BASE = os.getenv("PUBLIC_API_BASE", "").strip() or f"http://127.0.0.1:{os.getenv('PORT','5000')}"
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-4o-mini")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
SYSTEM_PROMPT_FILE = os.getenv("ASSISTANT_SYSTEM_PROMPT_FILE", "backend/prompt_playbook_ur.txt")

MATCH_WORDS = r"(match|matches|fixture|fixtures|game|games|schedule)"
NON_MATCH_Q = (
    r"(kya kaam|kaise|kyun|kya hota|what is|what's|how (do|does|to)|help|explain|"
    r"history|tareekh|drill|drills|practice|training|exercise|workout|diet|nutrition|"
    r"purpose|use|how to use|ticket|price|entry|remind|follow|what are you doing|what'?s up|wyd|"
    r"kya (kar|kr) (rahe|rahi) ho)"
)

# Greetings + smalltalk
SALAM_RE = re.compile(r"\b(ass?ala?m( ?o|[- ]o)? ?ala?iku?m|salam|slam)\b", re.I)
HI_RE     = re.compile(r"\b(hi|hello|hey)\b", re.I)
SMALLTALK_RE = re.compile(r"(what are you doing|what'?s up|wyd|kya (kar|kr) (rahe|rahi) ho)", re.I)

def _greeting_or_smalltalk(text: str, lang: str) -> Optional[str]:
    s = (text or "").strip().lower()
    if SALAM_RE.search(s):
        return "Wa alaikum as-salam! Kaise hain aap? 🙂 Kisi cheez mein madad chahiye — matches, tickets, distance ya drills?"
    if HI_RE.search(s):
        return "Hello! How are you doing? 🙂 What do you need help with — matches, tickets, distance or drills?"
    if SMALLTALK_RE.search(s):
        return ("Bas yahin hoon madad ke liye. Aap bataiye — fixtures dekhne hain, ticket info, distance ya training drills?"
                if lang == "ur" else
                "I’m here to help. Tell me — do you want fixtures, ticket info, distance, or training drills?")
    return None

# ===== Router import =====
try:
    from .nlp.router import IntentRouter
except Exception:
    try:
        from backend.nlp.router import IntentRouter
    except Exception:
        IntentRouter = None  # type: ignore

_ROUTER = None
if IntentRouter:
    try: _ROUTER = IntentRouter()
    except Exception: _ROUTER = None

INTENT_THRESH = 0.55

# ===== Guardrails / canned knowledge =====
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

# Multiple drill sets per sport (no repetition)
TRAINING_DRILLS = {
    "football": [
        ["Light jog + mobility (5 min)", "Toe taps/box touches (2×40s)", "Passing gates (5 min)", "Wall-passes 50/foot", "5v2 rondo (6–8 min)"],
        ["Cone dribbles (4×30s)", "1v1 shielding & turns", "Finishing in box (20 shots)", "Short corners (5 min)", "Cooldown (5 min)"],
    ],
    "basketball": [
        ["Ball-handling series 3×30s", "Layups L/R 3×6", "Form shooting 25 makes", "Defensive slides 3×20m", "3-on-3 half-court"],
        ["Close-outs 3×6", "PnR 2-on-2 reps", "Free throws 20 makes", "Rebounding box-out 3×6", "Scrimmage 10 min"],
    ],
    "cricket": [
        ["Straight-bat throw-downs (30)", "Front-foot drives on cones", "Bowling line/length (24)", "High-catches (10)", "Ground fielding shuttles"],
        ["Back-foot punches (20)", "Power-hitting arcs (15)", "Yorker target (12)", "Slip catching (12)", "WK to WK throws"],
    ],
    "badminton": [
        ["Shadow footwork 3×60s", "Net kill control 3×10", "Clear–drop 3×10", "Serve accuracy 3×10", "11-pt rallies"],
        ["Multi-shuttle drives 3×12", "Backhand clears 3×8", "Smash form light 2×10", "Deception net shots 3×8", "Half-court singles"],
    ],
    "tennis": [
        ["Mini-court rallies 5 min", "FH contact in front 3×10", "BH rhythm 3×10", "Serve toss height 3×8", "Baseline→service-line game"],
        ["Approach + volley 3×8", "Cross-court consistency 20/side", "Second-serve spin 3×6", "Return blocks 3×8", "Tie-break to 7"],
    ],
}

def _is_health_question(t: str) -> bool:
    return bool(re.search(HEALTH_Q, (t or "").lower()))

def _is_history_question(t: str) -> bool:
    s = (t or "").lower();  return ("history" in s or "tareekh" in s)

def _is_training_question(t: str) -> bool:
    s = (t or "").lower();  return ("drill" in s or "training" in s or "practice" in s or "tips" in s)

def _looks_nonmatch(t: str) -> bool:
    s = (t or "").lower()
    return (re.search(NON_MATCH_Q, s) is not None) and (re.search(MATCH_WORDS, s) is None)

# =========================================================
# Entities (with regex fallback)
# =========================================================
_SIMPLE_SPORTS = {
    "football":   [r"\bfootball\b", r"\bsoccer\b", r"\bfutbol\b"],
    "basketball": [r"\bbasket ?ball\b"],
    "cricket":    [r"\bcricket\b"],
    "badminton":  [r"\bbadminton\b"],
    "tennis":     [r"\btennis\b"],
}

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
                cls._cache = data; cls._mtime = mtime
            except Exception:
                pass
        return cls._cache or {"cities": {}, "sports": {}}

    @classmethod
    def resolve_city(cls, text: str) -> Optional[str]:
        s = text.lower(); ents = cls.load().get("cities", {})
        for canonical, syns in ents.items():
            for w in syns:
                if re.search(rf"\b{re.escape(w.lower())}\b", s):
                    return canonical
        canon_list = list(ents.keys())
        m = get_close_matches(next((w for w in re.findall(r"[a-z]+", s)), ""), canon_list, n=1, cutoff=0.90)
        return m[0] if m else None

    @classmethod
    def resolve_sport(cls, text: str) -> Optional[str]:
        s = text.lower(); ents = cls.load().get("sports", {})
        for canonical, syns in ents.items():
            for w in syns:
                if re.search(rf"\b{re.escape(w.lower())}\b", s):
                    return canonical
        # fallback regex
        for canon, pats in _SIMPLE_SPORTS.items():
            for p in pats:
                if re.search(p, s):
                    return canon
        canon_list = list(ents.keys())
        m = get_close_matches(next((w for w in re.findall(r"[a-z]+", s)), ""), canon_list, n=1, cutoff=0.90)
        return m[0] if m else None

# =========================================================
# Memory (TTL)
# =========================================================
class Memory:
    _store: Dict[str, Dict] = {}
    _ttl = 60 * 30

    @classmethod
    def get(cls, uid: Optional[str]) -> Dict:
        if not uid: return {}
        rec = cls._store.get(uid) or {}
        if rec and time.time() - rec.get("_ts", 0) > cls._ttl:
            cls._store.pop(uid, None); return {}
        return rec

    @classmethod
    def set(cls, uid: Optional[str], **slots):
        if not uid: return
        rec = cls._store.get(uid) or {}
        rec.update(slots); rec["_ts"] = time.time()
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
    if not isinstance(messages, list): return out
    for m in messages[-max_items:]:
        role = (m.get("role") or "user").lower()
        content = (m.get("content") or "").strip()
        if not content: continue
        if len(content) > max_chars: content = content[:max_chars] + "…"
        out.append({"role": role, "content": content})
    return out

def _mirror_language(user_text: str) -> str:
    if re.search(r"[\u0600-\u06FF]", user_text): return "ur"
    if re.search(r"\b(aaj|aj|kal|kl|hafta|itwaar|jumma|shanba|match|khel|city|sport)\b", user_text.lower()): return "ur"
    return "en"

# =========================================================
# Date parse
# =========================================================
WEEKDAY_IDX = {"monday":0,"tuesday":1,"wednesday":2,"thursday":3,"friday":4,"saturday":5,"sunday":6,
               "jumma":4,"juma":4,"shanba":5,"itwaar":6,"aitvar":6}
MONTHS = {"jan":1,"january":1,"feb":2,"february":2,"mar":3,"march":3,"apr":4,"april":4,"may":5,"jun":6,"june":6,
          "jul":7,"july":7,"aug":8,"august":8,"sep":9,"sept":9,"september":9,"oct":10,"october":10,"nov":11,
          "november":11,"dec":12,"december":12}

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
        a,b,c = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if c < 100: c += 2000
        for dd,mm in [(a,b),(b,a)]:
            try: return date(c, mm, dd)
            except: pass
    return None

def _parse_when_from_text(text: str, today: Optional[date] = None) -> Optional[Tuple[date, date, str]]:
    today = today or date.today(); s = text.lower()
    if re.search(r"\b(aaj|aj|today)\b", s):     return today, today, "aaj"
    if re.search(r"\b(kal|kl|tomorrow)\b", s):  return today+timedelta(days=1), today+timedelta(days=1), "kal"
    if re.search(r"\b(this week|is hafta|is week)\b", s):
        start = today - timedelta(days=today.weekday()); end = start + timedelta(days=6); return start, end, "is haftay"
    if re.search(r"\b(weekend|hafta akhir)\b", s):
        fri = today + timedelta((4 - today.weekday()) % 7); return fri, fri+timedelta(days=2), "weekend"
    for wd, idx in WEEKDAY_IDX.items():
        if re.search(rf"\b{wd}\b", s):
            d = _next_weekday(idx, today); return d, d, wd
    dt = _parse_explicit_date(s)
    if dt: return dt, dt, dt.strftime("%d %b %Y")
    return None

# =========================================================
# Events API & maps
# =========================================================
def _query_api_games(city: str, sport: Optional[str], d_from: date, d_to: date, limit: int = 5) -> List[Dict]:
    url = f"{PUBLIC_API_BASE}/api/events"
    params = {"city": city, "status": "upcoming", "limit": str(limit), "date_from": d_from.isoformat(), "date_to": d_to.isoformat()}
    if sport: params["sports"] = sport
    try:
        r = requests.get(url, params=params, timeout=API_TIMEOUT)
        if r.status_code != 200: return []
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
        {"title": "Falcons vs Kings", "sport": "football",  "city": "Karachi",   "venue": "City Arena",       "when": "7:30 PM"},
        {"title": "Lions vs Rangers", "sport": "basketball","city": "Lahore",    "venue": "Model Town Ground","when": "5:00 PM"},
        {"title": "Royals vs City",   "sport": "cricket",   "city": "Lahore",    "venue": "Sports Arena",     "when": "6:00 PM"},
        {"title": "Smashers Open",    "sport": "badminton", "city": "Islamabad", "venue": "Indoor Hall A",    "when": "4:00 PM"},
        {"title": "Tennis Meetup",    "sport": "tennis",    "city": "Islamabad", "venue": "Club Courts",      "when": "6:30 PM"},
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
    if games: return games, "aaj", (d_from, d_to)
    g2 = _query_api_games(city, sport, d_from + timedelta(days=1), d_to + timedelta(days=1))
    if g2: return g2, ("kal" if lang == "ur" else "tomorrow"), (d_from + timedelta(days=1), d_to + timedelta(days=1))
    start = d_from - timedelta(days=d_from.weekday()); end = start + timedelta(days=6)
    g3 = _query_api_games(city, sport, start, end)
    if g3: return g3, ("is haftay" if lang == "ur" else "this week"), (start, end)
    return _dummy_games(city, sport), "suggested", (d_from, d_to)

def _build_gmaps_link(origin: str, destination: str) -> str:
    o = quote_plus(origin.strip()); d = quote_plus(destination.strip())
    return f"https://www.google.com/maps/dir/?api=1&origin={o}&destination={d}&travelmode=driving"

def _extract_landmark(text: str) -> str:
    s = (text or "").strip()
    return re.sub(r"\b(near|ke paas|pass|around|close to)\b", "", s, flags=re.I).strip()

# =========================================================
# LLM breaker + wrappers (kept for future, but not used for smalltalk now)
# =========================================================
class Breaker:
    errors = 0; tripped_at = 0.0
    @classmethod
    def tripped(cls) -> bool:
        if cls.tripped_at and (time.time() - cls.tripped_at) < CIRCUIT_COOLDOWN: return True
        if cls.tripped_at and (time.time() - cls.tripped_at) >= CIRCUIT_COOLDOWN: cls.errors = 0; cls.tripped_at = 0.0
        return False
    @classmethod
    def fail(cls): cls.errors += 1;  cls.tripped_at = time.time() if cls.errors >= CIRCUIT_TRIP_ERRORS else cls.tripped_at
    @classmethod
    def ok(cls): cls.errors = 0; cls.tripped_at = 0.0

def _read_system_prompt() -> str:
    try:
        with open(SYSTEM_PROMPT_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return ("You are Sportrium Assistant. Reply in short Roman Urdu (1–3 lines). Primary tasks: fixtures, tickets, reminders, how-to. "
                "If data fetch fails say it's a temporary issue and suggest trying another city/date.")

def _make_single_turn_messages(user_text: str, state_summary: str) -> List[Dict]:
    system = _read_system_prompt()
    user = (f"User message: {user_text}\nKnown state: {state_summary}\n"
            "Respond briefly in Roman Urdu. If slots missing, ask for them. Avoid repeating phrasing.")
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]

def _maybe_gemini_reply(messages: List[Dict], system: Optional[str] = None):
    api_key = os.getenv("GOOGLE_API_KEY", "").strip() or os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or Breaker.tripped(): return None, None
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    contents = []; sys_text = system or _read_system_prompt(); system_instruction = {"parts": [{"text": sys_text}]}
    for m in messages: contents.append({"role": "user" if m["role"]=="user" else "model", "parts": [{"text": m["content"]}]})
    payload = {"systemInstruction": system_instruction, "contents": contents, "generationConfig": {"temperature": 0.4, "topP": 0.9, "maxOutputTokens": 320}}
    try:
        r = requests.post(url, json=payload, timeout=LLM_TIMEOUT); r.raise_for_status(); data = r.json()
        text = "".join(p.get("text","") for p in ((data.get("candidates") or [{}])[0].get("content") or {}).get("parts",[])).strip()
        if text: Breaker.ok()
        return (text, None) if text else (None, "empty_text")
    except Exception as e:
        Breaker.fail(); return None, f"Gemini error: {e}"

def _maybe_openai_reply(messages: List[Dict]):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or Breaker.tripped(): return None, None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(model=MODEL_NAME, messages=messages, temperature=0.4, top_p=0.9, max_tokens=350, timeout=LLM_TIMEOUT)
        text = (resp.choices[0].message.content or "").strip()
        if text: Breaker.ok()
        return (text, None) if text else (None, "empty_text")
    except Exception as e:
        Breaker.fail(); return None, f"OpenAI error: {e}"

# =========================================================
# Router
# =========================================================
def _collect_context(messages: List[Dict], user_id: Optional[str]):
    today = date.today(); mem = Memory.get(user_id)
    city = mem.get("city"); sport = mem.get("sport"); when = mem.get("when"); lang = "en"
    for m in reversed(messages):
        if (m.get("role") or "").lower() != "user": continue
        text = (m.get("content") or "");  if not text: continue
        lang = _mirror_language(text)
        if city is None:
            c = Entities.resolve_city(text);  city = c or city
        if sport is None:
            s = Entities.resolve_sport(text); sport = s or sport
        if when is None:
            p = _parse_when_from_text(text, today=today); when = p or when
        if city and sport is not None and when: break
    if when is None: when = (today, today, "aaj")
    Memory.set(user_id, city=city, sport=sport, when=when)
    return city, sport, when, lang

def _choose_and_generate(messages: List[Dict], user_id: Optional[str]) -> Tuple[str, str]:
    user_text = _last_user_text(messages)
    city, sport, (d_from, d_to, label), lang = _collect_context(messages, user_id)

    # 0) greetings / smalltalk first
    gt = _greeting_or_smalltalk(user_text, lang)
    if gt: return gt, "smalltalk"

    # 1) Guardrails
    if _is_health_question(user_text):
        base = ("Main medical/health advice nahi deta/deti — please doctor/coach se mashwara karein."
                if lang=="ur" else "I can’t provide medical/health advice. Please consult a doctor/coach.")
        if sport and sport in TRAINING_DRILLS:
            tips = " ".join(TRAINING_DRILLS[sport][0][:3])
            return f"{base}\nSafe practice idea ({sport}): {tips}", "guardrail"
        return f"{base}\nGeneral practice: short skill blocks + game-like drills. Kaunsi sport?", "guardrail"

    # 2) Natural follow-up for history/training when user switches sport
    mem = Memory.get(user_id); last_intent = mem.get("last_intent")
    sport_in_text = Entities.resolve_sport(user_text or "")
    if sport_in_text and last_intent in ("training","history"):
        sport = sport_in_text; Memory.set(user_id, sport=sport)

    # 3) History quick-path
    if _is_history_question(user_text) or last_intent == "history":
        sp = sport_in_text or sport
        if sp and sp in HISTORY_SHORT:
            Memory.set(user_id, last_intent="history")
            return HISTORY_SHORT[sp], "history"
        Memory.set(user_id, last_intent="history")
        return ("Kis sport ki history? (football/basketball/cricket/badminton/tennis)"
                if lang=="ur" else "Which sport’s history? (football/basketball/cricket/badminton/tennis)"), "history-ask"

    # 4) Training with paging (no repeat)
    drill_pages = mem.get("drill_pages", {})
    more_req = bool(re.search(r"\b(more|else|another|aur|or bhi|kuch aur|anything else)\b", (user_text or "").lower()))
    if _is_training_question(user_text) or last_intent == "training" or sport_in_text:
        target_sport = sport_in_text or sport
        if not target_sport or target_sport not in TRAINING_DRILLS:
            Memory.set(user_id, last_intent="training")
            return ("Kis sport ke drills? (football/basketball/cricket/badminton/tennis)"
                    if lang=="ur" else "Which sport drills? (football/basketball/cricket/badminton/tennis)"), "training-ask"
        page = drill_pages.get(target_sport, 0)
        if more_req and last_intent == "training": page += 1
        packs = TRAINING_DRILLS[target_sport]; page = page % len(packs)
        bullets = "\n".join(f"• {x}" for x in packs[page])
        note = " (I don’t provide medical/health advice.)" if lang!="ur" else " (Health/medical advice nahi deta/deti.)"
        reply = f"{target_sport.title()} drills (set {page+1}):\n{bullets}\n{note}"
        drill_pages[target_sport] = page
        Memory.set(user_id, last_intent="training", drill_pages=drill_pages, sport=target_sport, last_reply=reply)
        tail = "Kisi aur sport par tips chahiyen?" if lang=="ur" else "Want tips for another sport?"
        return f"{reply}\n{tail}", "training"

    # 5) ML Router
    intent, conf = ("fallback", 0.0)
    if _ROUTER:
        try: intent, conf = _ROUTER.classify(user_text)
        except Exception: intent, conf = ("fallback", 0.0)

    state_summary = f"city={city or '∅'} | sport={sport or '∅'} | date_label={label}"

    # 6) Low-confidence non-match → **our** small clarifier (NOT matches)
    if conf < INTENT_THRESH and not re.search(MATCH_WORDS, (user_text or "").lower()):
        st = _greeting_or_smalltalk(user_text, lang)
        if st: return st, "smalltalk"
        ask = ("Aap ko kis cheez ki help chahiye — fixtures, tickets, distance ya drills/history?"
               if lang=="ur" else "What can I help you with — fixtures, tickets, distance, or drills/history?")
        return ask, "clarify"

    # 7) Find matches
    if intent == "find_matches" or re.search(MATCH_WORDS, (user_text or "").lower()):
        if not city:
            return ("City bata dein (e.g., Karachi/Lahore/Islamabad), main results turant dikha dun."
                    if lang=="ur" else "Tell me the city (e.g., Karachi/Lahore/Islamabad) and I’ll show fixtures."), "local-matches"
        games, lbl, (df, dt) = _auto_expand_if_empty(city, sport, d_from, d_to, lang)
        Memory.set(user_id, when=(df, dt, lbl))
        reply = _summarize_games(games, lang, lbl, city, sport)
        Memory.set(user_id, last_games=games)
        mem = Memory.get(user_id); search_key = (city.lower(), sport or "", df.isoformat(), dt.isoformat())
        if mem.get("last_key") == search_key and mem.get("last_reply") == reply:
            alt = ("Yehi filters pe check ho chuka hai. Kya main Islamabad/weekend try karun ya sport change karun?"
                   if lang=="ur" else "We already checked these filters. Try another city/date or a different sport?")
            return alt, "local-matches-suggest"
        Memory.set(user_id, last_key=search_key, last_reply=reply)
        return reply, "local-matches"

    # 8) Distance simple state machine
    mem = Memory.get(user_id); dist_state = mem.get("dist") or {}
    if intent == "distance" or dist_state:
        landmark = _extract_landmark(user_text)
        if landmark and not dist_state.get("origin"): dist_state["origin"] = landmark
        destination = dist_state.get("destination")
        if not destination:
            last_games = mem.get("last_games") or []
            if last_games:
                first = last_games[0]
                destination = (first.get("venue") or "Sports venue") + (f", {first.get('city')}" if first.get("city") else "")
                dist_state["destination"] = destination
        if dist_state.get("origin") and dist_state.get("destination"):
            origin = dist_state["origin"]; dest = dist_state["destination"]
            link = _build_gmaps_link(origin if city is None else f"{origin}, {city}", dest)
            Memory.set(user_id, dist=None)
            msg = (f"Yeh approximate route link hai:\n{link}\n(Travel time Google Maps par depend karta hai.)"
                   if lang=="ur" else f"Here’s an approximate route:\n{link}\n(Travel time depends on Google Maps.)")
            return msg, "distance-link"
        Memory.set(user_id, dist=dist_state)
        need = "origin" if not dist_state.get("origin") else "destination"
        if need == "origin":
            ask = "Apna area/landmark batayen (e.g., Garishoh) — link bhejta hoon." if lang=="ur" \
                  else "Tell me your area/landmark (e.g., Garishoh) — I’ll send a link."
        else:
            ask = "Kis venue/match tak distance chahiye? (match card ka naam/venue)" if lang=="ur" \
                  else "Distance to which venue/match? (send the match/venue name)"
        return ask, "distance-await"

    # 9) Other fixed intents
    if intent == "ticket_price":
        return ("Kis match ka ticket price dekhna chahenge? Event card par 'Ticket info' ya 'TBA' hota hai."
                if lang=="ur" else "Which match’s ticket price? The event card shows ‘Ticket info’ or ‘TBA’."), "ticket-price"
    if intent == "purpose":
        return ("Sportrium local sports ko asaan banata hai: matches, follow/create teams, reminders & tickets — sab ek jaga."
                if lang=="ur" else "Sportrium helps you find local matches, follow/create teams, and manage reminders & tickets."), "purpose"
    if intent == "how_to_use":
        return ("Steps: Schedule → city/sport/date select, match card open, 'Remind me' / 'Buy tickets', aur 'Create a Team' se host."
                if lang=="ur" else "Steps: Schedule → choose city/sport/date, open a match, use ‘Remind me’/‘Buy tickets’, and ‘Create a Team’ to host."), "how-to"
    if intent == "reminder":
        return ("Reminder lagane ke liye login chahiye. Login karun?"
                if lang=="ur" else "You need to be logged in to set a reminder. Want to log in?"), "reminder"

    # 10) Generic fallback
    single_turn = _make_single_turn_messages(user_text, state_summary)
    if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
        text, err = _maybe_gemini_reply(single_turn, system=_read_system_prompt())
        if text: return text, "gemini"
        if err:  return f"Sorry, abhi reply nahi bana saka. Thori der baad try karein 🙏 ({err})", "gemini"
    if os.getenv("OPENAI_API_KEY"):
        text, err = _maybe_openai_reply(single_turn)
        if text: return text, "openai"
        if err:  return f"Sorry, abhi reply nahi bana saka. Thori der baad try karein 🙏 ({err})", "openai"
    return f"Shukriya! (dev-mode) Aap ne kaha: {user_text[:300]}", "mock"

# =========================================================
# Flask integration
# =========================================================
def _rule_exists(app, path: str, method: str) -> bool:
    m = method.upper()
    for rule in app.url_map.iter_rules():
        if rule.rule == path and m in rule.methods: return True
    return False

def patch_app(app):
    from flask import jsonify, request
    if not _rule_exists(app, "/api/health", "GET"):
        def _health():
            provider = ("gemini" if (os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))
                        else "openai" if os.getenv("OPENAI_API_KEY") else "mock")
            return jsonify({"ok": True, "service": "sportrium-public-api",
                            "env": {"API_PREFIX": os.getenv("API_PREFIX", "/api"),
                                    "provider": provider, "MODEL_NAME": MODEL_NAME,
                                    "GEMINI_MODEL": GEMINI_MODEL,
                                    "has_OPENAI_KEY": bool(os.getenv("OPENAI_API_KEY")),
                                    "has_GOOGLE_KEY": bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")),
                                    "LLM_TIMEOUT_SEC": LLM_TIMEOUT,
                                    "LLM_CIRCUIT_TRIPPED": Breaker.tripped(),
                                    "PUBLIC_API_BASE": PUBLIC_API_BASE}})
        app.add_url_rule("/api/health", endpoint="public_health", view_func=_health, methods=["GET"])

    if not _rule_exists(app, "/api/chat", "POST"):
        def _chat():
            data = request.get_json(silent=True) or {}
            messages = data.get("messages")
            if not messages and isinstance(data.get("message"), str):
                messages = [{"role": "user", "content": data["message"]}]
            if not isinstance(messages, list) or not messages:
                return jsonify({"ok": False, "error": "`messages` must be a non-empty list of {role, content} or pass a `message` string."}), 400
            user_id = data.get("userId") or data.get("user_id") or None
            cleaned = _clean_messages(messages)
            if not cleaned: return jsonify({"ok": False, "error": "Empty content after normalization."}), 400
            reply, provider = _choose_and_generate(cleaned, user_id)
            return jsonify({"ok": True, "provider": provider, "reply": reply})
        app.add_url_rule("/api/chat", endpoint="public_chat", view_func=_chat, methods=["POST"])
