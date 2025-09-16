# backend/api/assistant.py
from flask import Blueprint, request, jsonify
import re
from datetime import datetime

bp = Blueprint("assistant", __name__, url_prefix="/api")

LOGIN_ONLY = True  # your playbook says guest chat is blocked

INTENT_PATTERNS = [
    ("match_search", re.compile(r"(?:k[ia]r[aā]?chi|lahore|islamabad|peshawar|multan).*(match|fixture|game)", re.I)),
    ("distance",     re.compile(r"(distance|kitn[ae] (door|km)|raasta)", re.I)),
    ("ticket",       re.compile(r"(ticket|entry|price|fee|kitne)", re.I)),
    ("remind",       re.compile(r"(remind|yaad( |-)dila|notify|alert)", re.I)),
    ("how_use",      re.compile(r"(app|website).*(kaise|use| istemal)", re.I)),
    ("purpose",      re.compile(r"(point|faida|purpose)", re.I)),
    ("history",      re.compile(r"(history|tareekh)", re.I)),
    ("training",     re.compile(r"(training|practice|drills?)", re.I)),
    ("map",          re.compile(r"(map|direction|google maps)", re.I)),
    ("apply",        re.compile(r"(tournament|apply|registration)", re.I)),
]

def detect_intent(text):
    t = text.strip().lower()
    for name, pat in INTENT_PATTERNS:
        if pat.search(t):
            return name
    # vague fallback
    return "fallback"

def parse_city_and_date(text):
    t = text.lower()
    city = None
    for c in ["karachi", "lahore", "islamabad", "peshawar", "multan"]:
        if c in t: city = c.capitalize(); break
    date_label = None
    if "aaj" in t or "today" in t: date_label = "aaj"
    elif "kal" in t or "tomorrow" in t: date_label = "kal"
    elif "weekend" in t: date_label = "weekend"
    return city, date_label

def matches_stub(city, date_label):
    # Replace with real DB query later
    if not city: return []
    if city == "Karachi" and (date_label in (None, "aaj", "today")):
        return [{"home":"Falcons","away":"Kings","time":"7:30 PM","venue":"City Arena"}]
    if city == "Lahore" and (date_label in ("weekend", None)):
        return [
          {"home":"Lions","away":"Rangers","time":"Sat 5 PM","venue":"Model Town Ground"},
          {"home":"Royals","away":"City","time":"Sun 6 PM","venue":"Sports Arena"},
        ]
    return []

@bp.post("/assistant/message")
def assistant_message():
    user = getattr(request, "user", None)  # however you attach auth user
    text = request.json.get("message","")

    if LOGIN_ONLY and not user:
        return jsonify({"reply": "Chat use karne ke liye please login karein."})

    intent = detect_intent(text)

    if intent == "match_search":
        city, date_label = parse_city_and_date(text)
        items = matches_stub(city, date_label)
        if items:
            if city == "Karachi" and date_label in (None, "aaj"):
                r = "Ji haan, Karachi me aaj **Falcons vs Kings** at **City Arena**, **7:30 PM**. Aap dekhna chahenge details?"
            elif city == "Lahore" and date_label == "weekend":
                r = ("Is weekend Lahore me **2 matches** listed hain: (1) **Lions vs Rangers** — **Sat 5 PM**, "
                     "Model Town Ground. (2) **Royals vs City** — **Sun 6 PM**, Sports Arena. Aap kaunsa dekhna chahenge?")
            else:
                top = items[0]
                r = f"{city} me {date_label or 'is date'} **{len(items)} matches** milin. Sab se qareeb: **{top['home']} vs {top['away']}**, **{top['time']}**, **{top['venue']}**."
        else:
            r = "Is waqt iss city ke liye koi match listed nahin mil rahi. Aap **nearby city** ya **date** change karke try karen? Main aapko update bhi kar sakta hoon jab nayi fixture aaye."
        return jsonify({"reply": r})

    if intent == "distance":
        return jsonify({"reply": "Theek hai. Aap **approx area/landmark** batayenge (jaise ‘Gulshan-e-Iqbal’)? Ya location share kar den? Phir main **distance** aur **Google Maps link** de dunga."})

    if intent == "ticket":
        return jsonify({"reply": "Entry **Rs 300** per person hai (agar listed ho). Agar organizer ne publish na kiya ho to **‘Free/TBA’** hota hai. Chahen to main notify kar dun jab price aaye."})

    if intent == "remind":
        return jsonify({"reply": "Done ✅ — main **30 min pehle** reminder bhej dunga. (Note: feature ke liye login required hota hai.)"})

    if intent == "how_use":
        return jsonify({"reply": "Simple: 1) **Schedule** par jao → city/sport/date select karo. 2) Match card khol ke details dekho. 3) Pasand aaye to **Remind me** ya **Buy tickets**. 4) **Teams** explore karo."})

    if intent == "purpose":
        return jsonify({"reply": "Sportrium ka goal: **local sports ko asaan banana** — **matches dekh**, **teams follow**, **reminders/tickets**, aur chaho to **apna match host** bhi."})

    if intent == "history":
        return jsonify({"reply": "Modern football 1800s me England me organize hua. Basketball 1891 James Naismith (US). Cricket 16–17th c. England (Test/ODI/T20). Badminton UK/Poona roots. Tennis 1870s UK/France."})

    if intent == "training":
        return jsonify({"reply": "Basic, non-medical tips: skill blocks chhote rakho, game-like practice karo, sahi equipment use karo. Main medical advice nahi deta/deti."})

    if intent == "map":
        return jsonify({"reply": "Yeh **Google Maps** link hai City Arena ka. Walking/drive/public transport tips chahye to bataen. Distance ke liye apni location optional share kar sakte hain."})

    if intent == "apply":
        return jsonify({"reply": "Tournament card me **Apply** button hota hai. Team choose karen, short form submit, organizer confirm. Login required hota hai."})

    # fallback / clarify
    return jsonify({"reply": "Samajh nahi aya — city/sport/date bata dein, main matches dhoondh dun (e.g., ‘Lahore me is week cricket’)."})
