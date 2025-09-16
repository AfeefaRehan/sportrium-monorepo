import os
import re
import requests
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple

# ----------------- vocab ----------------- #
SPORTS_MAP = {
    "football": ["football", "soccer", "futbol"],
    "cricket": ["cricket"],
    "basketball": ["basketball", "bball"],
    "badminton": ["badminton"],
    "tennis": ["tennis"],
}
CITIES = [
    "karachi", "lahore", "islamabad", "rawalpindi", "peshawar",
    "quetta", "multan", "faisalabad", "hyderabad",
]
MATCH_WORDS = r"(match|matches|fixture|fixtures|game|games|schedule)"

WEEKDAY_IDX = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
    # roman-Urdu loose helpers
    "jumma": 4, "juma": 4, "shanba": 5, "itwaar": 6, "aitvar": 6,
}

MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

# ----------------- helpers ----------------- #
def _last_user_text(messages: List[Dict]) -> str:
    for m in reversed(messages or []):
        if (m.get("role") or "").lower() == "user":
            return (m.get("content") or "").strip()
    return ""

def _fallback_reply(messages: List[Dict], user_id: Optional[str] = None) -> str:
    text = _last_user_text(messages)
    prefix = f"Shukriya, user {user_id}!" if user_id else "Shukriya!"
    if not text:
        return f"{prefix} (dev-mode) Matches, teams ya events pooch sakte hain."
    return f"{prefix} (dev-mode) Aap ne kaha: {text[:300]}"

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
    # Urdu script? → ur
    if re.search(r"[\u0600-\u06FF]", user_text):
        return "ur"
    # Roman-Urdu heuristics
    if re.search(r"\b(aaj|aj|kal|kl|is|hafta|itwaar|jumma|match|khel|city|sport)\b", user_text.lower()):
        return "ur"
    return "en"

# ----------------- date parsing ----------------- #
def _next_weekday(idx_target: int, today: date) -> date:
    delta = (idx_target - today.weekday()) % 7
    return today + timedelta(days=delta or 7)

def _parse_explicit_date(text: str) -> Optional[date]:
    s = re.sub(r"[,\s]+", " ", text.strip().lower())
    m = re.search(r"\b(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})\b", s)  # 17 sep 2025
    if m and m.group(2) in MONTHS:
        d, mon, y = int(m.group(1)), MONTHS[m.group(2)], int(m.group(3))
        try:
            return date(y, mon, d)
        except Exception:
            pass
    m = re.search(r"\b([a-z]{3,9})\s+(\d{1,2})\s+(\d{4})\b", s)  # sep 17 2025
    if m and m.group(1) in MONTHS:
        mon, d, y = MONTHS[m.group(1)], int(m.group(2)), int(m.group(3))
        try:
            return date(y, mon, d)
        except Exception:
            pass
    m = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b", s)  # 17-09-2025 / 09-17-2025
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if c < 100:
            c += 2000
        for dd, mm in [(a, b), (b, a)]:
            try:
                return date(c, mm, dd)
            except Exception:
                pass
    return None

def _parse_when_from_text(text: str, today: Optional[date] = None) -> Optional[Tuple[date, date, str]]:
    today = today or date.today()
    s = text.lower()

    if re.search(r"\b(aaj|aj|today)\b", s):
        return today, today, "aaj"
    if re.search(r"\b(kal|kl|tomorrow)\b", s):
        d = today + timedelta(days=1)
        return d, d, "kal"
    if re.search(r"\b(this week|is hafta|is week)\b", s):
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start, end, "is haftay"
    if re.search(r"\b(weekend|hafta akhir)\b", s):
        fri = today + timedelta((4 - today.weekday()) % 7)
        sun = fri + timedelta(days=2)
        return fri, sun, "weekend"

    for wd, idx in WEEKDAY_IDX.items():
        if re.search(rf"\b{wd}\b", s):
            d = _next_weekday(idx, today)
            return d, d, wd

    dt = _parse_explicit_date(s)
    if dt:
        return dt, dt, dt.strftime("%d %b %Y")

    return None

# ----------------- entity extraction from a whole conversation ----------------- #
def _extract_city_from_text(text: str) -> Optional[str]:
    s = text.lower()
    for c in CITIES:
        if re.search(rf"\b{re.escape(c)}\b", s):
            return c.title()
    return None

def _extract_sport_from_text(text: str) -> Optional[str]:
    s = text.lower()
    for sport, keys in SPORTS_MAP.items():
        for k in keys:
            if re.search(rf"\b{re.escape(k)}\b", s):
                return sport
    return None

def _collect_context(messages: List[Dict]) -> Tuple[Optional[str], Optional[str], Tuple[date, date, str], bool, str]:
    """
    Walk user messages newest→oldest; keep the most recent city/sport/when.
    Also detect if user asked about matches anywhere in the thread.
    Returns: (city, sport, (d_from, d_to, label), asked_matches, lang)
    """
    today = date.today()
    city: Optional[str] = None
    sport: Optional[str] = None
    when: Optional[Tuple[date, date, str]] = None
    asked = False
    lang = "en"

    for m in reversed(messages):
        if (m.get("role") or "").lower() != "user":
            continue
        text = (m.get("content") or "")
        if not text:
            continue

        # language mirror based on the latest user line
        lang = _mirror_language(text)

        # any "match/fixtures" mention in any user line counts
        if re.search(MATCH_WORDS, text.lower()):
            asked = True

        # fill slots if still missing
        if city is None:
            city = _extract_city_from_text(text)
        if sport is None:
            sport = _extract_sport_from_text(text)
        if when is None:
            parsed = _parse_when_from_text(text, today=today)
            if parsed:
                when = parsed

        # early stop if everything captured
        if city and when and (sport is not None):
            break

    # defaults if not provided
    if when is None:
        when = (today, today, "aaj")

    return city, sport, when, asked, lang

# ----------------- game querying ----------------- #
def _query_api_games(city: str, sport: Optional[str], d_from: date, d_to: date, limit: int = 5) -> List[Dict]:
    base = os.getenv("PUBLIC_API_BASE", "").strip() or f"http://127.0.0.1:{os.getenv('PORT','5000')}"
    url = f"{base}/api/games"
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
        r = requests.get(url, params=params, timeout=3.5)
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

def _dummy_games(city: str, sport: Optional[str], d_from: date, d_to: date) -> List[Dict]:
    pool = [
        {"title": "Falcons vs Kings", "sport": "football",  "city": "Karachi",   "venue": "City Arena",        "when": "7:30 PM"},
        {"title": "Lions vs Rangers", "sport": "basketball","city": "Lahore",    "venue": "Model Town Ground", "when": "5:00 PM"},
        {"title": "Royals vs City",   "sport": "cricket",   "city": "Lahore",    "venue": "Sports Arena",      "when": "6:00 PM"},
        {"title": "Smashers Open",    "sport": "badminton", "city": "Islamabad", "venue": "Indoor Hall A",     "when": "4:00 PM"},
        {"title": "Tennis Meetup",    "sport": "tennis",    "city": "Islamabad", "venue": "Club Courts",       "when": "6:30 PM"},
    ]
    out = []
    for it in pool:
        if it["city"].lower() == city.lower() and (sport is None or it["sport"] == sport):
            out.append(it)
    return out

def _summarize_games(games: List[Dict], lang: str, label: str, city: str, sport: Optional[str]) -> str:
    if not games:
        if lang == "ur":
            sname = {"football":"football","cricket":"cricket","basketball":"basketball","badminton":"badminton","tennis":"tennis"}.get(sport or "", "")
            sp = f" {sname}" if sname else ""
            return f"{label} {city} me{sp} koi listing nazar nahi aayi. Nearby city/another date try karna chahenge?"
        return f"No matches found in {city} for {sport or 'the selected sports'} {label}."
    lines = []
    for g in games[:5]:
        lines.append(f"• {g['title']} • {g['city']} • {g['venue']} • {g['when']}")
    if lang == "ur":
        head = f"{city} me {label} ye options mile:"
        tail = "Details ‘Schedule’ page par dekh sakte hain."
    else:
        head = f"In {city}, {label} I found:"
        tail = "Check the Schedule page for details."
    return head + "\n" + "\n".join(lines) + ("\n" + tail)

# ----------------- LLM providers (fallback for general chat) ----------------- #
def _maybe_gemini_reply(messages: List[Dict]) -> Tuple[Optional[str], Optional[str]]:
    api_key = os.getenv("GOOGLE_API_KEY", "").strip() or os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None, None
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    timeout_sec = int(os.getenv("LLM_TIMEOUT_SEC", "6"))
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    contents = [{"role": "user" if m["role"] == "user" else "model",
                 "parts": [{"text": m["content"]}]} for m in messages]
    payload = {"contents": contents, "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300}}
    try:
        r = requests.post(url, json=payload, timeout=timeout_sec)
        r.raise_for_status()
        data = r.json()
        text = ""
        cand = (data.get("candidates") or [{}])[0]
        parts = (cand.get("content") or {}).get("parts") or []
        for p in parts:
            t = p.get("text")
            if t:
                text += t
        text = (text or "").strip()
        return (text, None) if text else (None, "empty_text")
    except Exception as e:
        return None, f"Gemini error: {e}"

def _maybe_openai_reply(messages: List[Dict]) -> Tuple[Optional[str], Optional[str]]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None, None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        model = os.getenv("MODEL_NAME", "gpt-4o-mini")
        msgs = [{"role": m["role"], "content": m["content"]} for m in messages]
        resp = client.chat.completions.create(model=model, messages=msgs, temperature=0.3, max_tokens=350)
        text = (resp.choices[0].message.content or "").strip()
        return (text, None) if text else (None, "empty_text")
    except Exception as e:
        return None, f"OpenAI error: {e}"

# ----------------- router ----------------- #
def _choose_and_generate(messages: List[Dict], user_id: Optional[str]) -> Tuple[str, str]:
    # 1) Try local match intent across the WHOLE conversation
    city, sport, (d_from, d_to, label), asked, lang = _collect_context(messages)

    # Trigger local search if either:
    #  - user asked about matches anywhere, OR
    #  - city/sport/when appears in the latest line (follow-up like "lahore", "kal")
    last = _last_user_text(messages).lower()
    looks_followup = bool(_parse_when_from_text(last) or _extract_city_from_text(last) or _extract_sport_from_text(last))
    if asked or looks_followup or city:
        if not city:
            return (
                "City bata dein (e.g., Karachi/Lahore/Islamabad), main results turant dikha dun."
                if lang == "ur" else
                "Please tell me the city (e.g., Karachi/Lahore/Islamabad) and I’ll show the fixtures."
            ), "local-matches"

        games = _query_api_games(city, sport, d_from, d_to, limit=5)
        if not games:
            games = _dummy_games(city, sport, d_from, d_to)
        return _summarize_games(games, lang, label, city, sport), "local-matches"

    # 2) Otherwise → LLM for general chat
    if os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
        text, err = _maybe_gemini_reply(messages)
        if text:
            return text, "gemini"
        if err:
            return f"{_fallback_reply(messages, user_id)} [note: {err}]", "gemini"
    if os.getenv("OPENAI_API_KEY"):
        text, err = _maybe_openai_reply(messages)
        if text:
            return text, "openai"
        if err:
            return f"{_fallback_reply(messages, user_id)} [note: {err}]", "openai"
    return _fallback_reply(messages, user_id), "mock"

# ----------------- route patcher ----------------- #
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
                    "MODEL_NAME": os.getenv("MODEL_NAME", ""),
                    "GEMINI_MODEL": os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),
                    "has_OPENAI_KEY": bool(os.getenv("OPENAI_API_KEY")),
                    "has_GOOGLE_KEY": bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")),
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
