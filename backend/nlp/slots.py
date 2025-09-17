# backend/nlp/slots.py
from __future__ import annotations
import json, os, re
from difflib import get_close_matches
from datetime import date, timedelta
from typing import Dict, Optional, Tuple

# Path to entities.json (cities/sports) relative to repo
_ENT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "entities.json"))

def _load_entities() -> Dict:
    try:
        with open(_ENT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"cities": {}, "sports": {}}

_ENT = _load_entities()

def resolve_city(text: str) -> Optional[str]:
    s = (text or "").lower()
    ents = _ENT.get("cities", {})
    # exact/synonym match
    for canonical, syns in ents.items():
        for w in syns:
            if re.search(rf"\b{re.escape(w.lower())}\b", s):
                return canonical
    # fuzzy fallback
    canon_list = list(ents.keys())
    token = next((w for w in re.findall(r"[a-z]+", s)), "")
    m = get_close_matches(token, canon_list, n=1, cutoff=0.90)
    return m[0] if m else None

def resolve_sport(text: str) -> Optional[str]:
    s = (text or "").lower()
    ents = _ENT.get("sports", {})
    for canonical, syns in ents.items():
        for w in syns:
            if re.search(rf"\b{re.escape(w.lower())}\b", s):
                return canonical
    canon_list = list(ents.keys())
    token = next((w for w in re.findall(r"[a-z]+", s)), "")
    m = get_close_matches(token, canon_list, n=1, cutoff=0.90)
    return m[0] if m else None

# ----- natural date parsing -----
WEEKDAY_IDX = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
    "jumma": 4, "juma": 4, "shanba": 5, "itwaar": 6, "aitvar": 6,
}
MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

def _next_weekday(idx_target: int, today: date) -> date:
    delta = (idx_target - today.weekday()) % 7
    return today + timedelta(days=delta or 7)

def _parse_explicit_date(text: str) -> Optional[date]:
    s = re.sub(r"[,\s]+", " ", (text or "").strip().lower())
    # e.g., 5 Aug 2025
    m = re.search(r"\b(\d{1,2})\s+([a-z]{3,9})\s+(\d{4})\b", s)
    if m and m.group(2) in MONTHS:
        d, mon, y = int(m.group(1)), MONTHS[m.group(2)], int(m.group(3))
        try: return date(y, mon, d)
        except: pass
    # e.g., Aug 5 2025
    m = re.search(r"\b([a-z]{3,9})\s+(\d{1,2})\s+(\d{4})\b", s)
    if m and m.group(1) in MONTHS:
        mon, d, y = MONTHS[m.group(1)], int(m.group(2)), int(m.group(3))
        try: return date(y, mon, d)
        except: pass
    # e.g., 05/08/2025 or 05-08-25
    m = re.search(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b", s)
    if m:
        a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if c < 100: c += 2000
        for dd, mm in [(a, b), (b, a)]:
            try: return date(c, mm, dd)
            except: pass
    return None

def parse_when(text: str, today: Optional[date] = None) -> Optional[Tuple[date, date, str]]:
    today = today or date.today()
    s = (text or "").lower()

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

def extract_slots(text: str, defaults: Optional[Dict] = None):
    """
    Returns (city, sport, (date_from, date_to, label)).
    If some slots not found, returns defaults (if provided).
    """
    defaults = defaults or {}
    city  = resolve_city(text)  or defaults.get("city")
    sport = resolve_sport(text) or defaults.get("sport")
    when  = parse_when(text)    or defaults.get("when")
    if when is None:
        today = date.today()
        when = (today, today, "aaj")
    return city, sport, when
