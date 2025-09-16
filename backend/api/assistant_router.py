# backend/api/assistant_router.py
from flask import Blueprint, request, jsonify, current_app
import os, json, re
import requests
from datetime import datetime, timedelta

bp = Blueprint("assistant_router", __name__, url_prefix="/api")

# ---------- load rules (playbook) ----------
RULES_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assistant_rules.json")
with open(RULES_PATH, "r", encoding="utf-8") as f:
    RULES = json.load(f)

LOGIN_GATE = True  # per playbook

CITY_LIST = ["karachi", "lahore", "islamabad", "peshawar", "multan"]
SPORT_LIST = ["football", "basketball", "cricket", "badminton", "tennis"]

def extract_city(t: str):
    t = (t or "").lower()
    for c in CITY_LIST:
        if c in t:
            return c.capitalize()
    return None

def extract_sport(t: str):
    t = (t or "").lower()
    for s in SPORT_LIST:
        if s in t:
            return s
    return None

def extract_date_label(t: str):
    t = (t or "").lower()
    if "aaj" in t or "today" in t: return "today"
    if "kal" in t or "tomorrow" in t: return "tomorrow"
    if "weekend" in t or "is week" in t: return "weekend"
    return None

# ---------- intent detection ----------
INTENT_RES = []
for name, spec in RULES["intents"].items():
    for p in spec.get("patterns", []):
        INTENT_RES.append((name, re.compile(p, re.I)))

def detect_intent(text: str) -> str:
    t = (text or "").strip()
    if not t:
        return "fallback"
    for name, rgx in INTENT_RES:
        if rgx.search(t):
            return name
    # light heuristic for match queries
    if any(c in t.lower() for c in CITY_LIST) and ("match" in t.lower() or "fixture" in t.lower() or "game" in t.lower()):
        return "match_search"
    return "fallback"

# ---------- dynamic fetchers (use your live API) ----------
def http_base():
    # Your API already runs on 5000; if behind proxy, change here.
    return os.getenv("ASSISTANT_INTERNAL_API", "http://127.0.0.1:5000/api")

def fetch_games(city=None, sport=None, date_label=None, limit=3):
    """
    Calls your existing /api/games endpoint to get live DB-backed data.
    Expected query: ?city=&sports=&status=upcoming&limit=
    Adjust param names if your games API differs.
    """
    params = {"status": "upcoming", "limit": limit}
    if city: params["city"] = city
    if sport: params["sports"] = sport  # if your API expects 'sport' change it
    # Optional: map date_label to date range on your API
    # e.g., today/tomorrow/weekend — if your API accepts from/to, set them.

    try:
        url = f"{http_base().rstrip('/')}/games"
        r = requests.get(url, params=params, timeout=8)  # short timeout
        if r.ok:
            return r.json()  # must be a list or an object with items
    except Exception as e:
        current_app.logger.warning(f"/assistant fetch_games failed: {e}")
    return None

def format_event_line(ev: dict):
    """
    Convert your game/event JSON into 1 short line:
    Title • City • Venue • When
    Adapt field names to your /api/games shape.
    """
    title = ev.get("title") or f"{ev.get('home','?')} vs {ev.get('away','?')}"
    city = ev.get("city") or ev.get("location") or ""
    venue = ev.get("venue") or ev.get("ground") or ""
    when = ev.get("time") or ev.get("start_time") or ev.get("starts_at") or ""
    return RULES["results_line"].replace("{title}", str(title)).replace("{city}", str(city)).replace("{venue}", str(venue)).replace("{when}", str(when))

# ---------- main route ----------
@bp.post("/assistant/message")
def assistant_message():
    # If you attach auth, use request.user
    user = getattr(request, "user", None)
    payload = request.get_json(silent=True) or {}
    text = (payload.get("message") or "").strip()

    if LOGIN_GATE and not user:
        return jsonify({"reply": RULES["login_gate_reply"]})

    intent = detect_intent(text)

    # --- DYNAMIC: match search ---
    if intent == "match_search":
        city = extract_city(text)
        sport = extract_sport(text)
        date_label = extract_date_label(text)

        data = fetch_games(city=city, sport=sport, date_label=date_label, limit=3)
        items = []
        if isinstance(data, dict) and "items" in data:  # if your API returns { items: [...] }
            items = data["items"]
        elif isinstance(data, list):
            items = data

        if items:
            lines = [format_event_line(ev) for ev in items[:3]]
            head = RULES["intents"]["match_search"]["reply"]
            tail = RULES["intents"]["match_search"]["followup"]
            reply = head + "\n• " + "\n• ".join(lines) + f"\n\n{tail}"
            return jsonify({"reply": reply})

        # no data → fallback line
        return jsonify({"reply": RULES["no_data_city"]})

    # --- Static-ish intents from playbook ---
    spec = RULES["intents"].get(intent) or RULES["intents"]["fallback"]
    reply = spec.get("reply") or RULES["intents"]["fallback"]["reply"]
    follow = spec.get("followup")
    final = reply if not follow else f"{reply}\n\n{follow}"
    return jsonify({"reply": final})
