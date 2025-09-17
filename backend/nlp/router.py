# backend/nlp/router.py
"""
Tiny TensorFlow intent router (multilingual). No DB required.

- Uses TF Hub Universal Sentence Encoder Multilingual to embed text.
- Classifies into one of our intents via cosine similarity vs exemplar phrases.
- If TF/Hub model can't be loaded, falls back to regex rules.

Intents:
  find_matches, ticket_price, purpose, how_to_use, distance,
  reminder, history, training, chitchat, fallback
"""

from __future__ import annotations
import re
from typing import Dict, List, Tuple

# ---------- Optional TF Hub load ----------
_EMBED = None
_LABELS: List[str] = []
_VEC: Dict[str, List[List[float]]] = {}

# Exemplars per intent (Roman-Urdu + Urdu + English)
_EXEMPLARS: Dict[str, List[str]] = {
    "find_matches": [
        "Karachi mein aaj koi match hai?", "Lahore weekend par football matches?",
        "Islamabad cricket Sunday?", "show schedule", "fixtures near me",
        "aj match", "kal match", "is haftay matches", "upcoming games"
    ],
    "ticket_price": [
        "ticket price kya hai?", "entry fee kitni hai?", "how much is the ticket?",
        "ticket kitne ka", "price of entry"
    ],
    "purpose": [
        "ye website kis kaam ki hai?", "what is the point of this site?",
        "what does this website do?", "is website ka purpose kya hai"
    ],
    "how_to_use": [
        "app ka istemal kaise karun?", "how to use this app?",
        "use kaise karna", "how does sportrium work"
    ],
    "distance": [
        "distance kitna hai?", "kitni door hai?", "directions bhej do",
        "map send karo", "how far is the stadium", "google maps link"
    ],
    "reminder": [
        "reminder lagana", "kick-off se pehle remind karna", "notify me",
        "team follow karna hai", "follow this team", "alert bhejna"
    ],
    "history": [
        "football ki history", "basketball history", "cricket history",
        "badminton history", "tennis history"
    ],
    "training": [
        "training tips chahiye", "practice kaise karun", "skills improve kaise",
        "drills for football", "batting improve", "badminton footwork"
    ],
    "chitchat": [
        "hi", "hello", "salam", "thanks", "shukriya", "how are you",
    ],
    "fallback": [
        "?", "help", "samajh nahi aya"
    ]
}

# --------- Regex fallback router (no TF) ----------
_MATCH_WORDS = re.compile(r"(match|matches|fixture|fixtures|game|games|schedule)", re.I)
_PRICE_WORDS = re.compile(r"(ticket|entry).*(price|fee)|price.*(ticket|entry)", re.I)
_PURPOSE = re.compile(r"(purpose|point|kis kaam|what.*website|ye website.*kya)", re.I)
_HOWTO  = re.compile(r"(how to|kaise.*use|app.*kaise)", re.I)
_DISTANCE = re.compile(r"(distance|kitni door|directions|map)", re.I)
_REMIND = re.compile(r"(remind|reminder|follow|alert|notify)", re.I)
_HISTORY = re.compile(r"(history)", re.I)
_TRAINING = re.compile(r"(training|practice|drills|tips)", re.I)
_CHITCHAT = re.compile(r"^(hi|hello|salam|assalam|hey|thanks|shukriya)\b", re.I)


def _regex_intent(text: str) -> Tuple[str, float]:
    s = text.strip().lower()
    if _MATCH_WORDS.search(s): return "find_matches", 0.9
    if _PRICE_WORDS.search(s): return "ticket_price", 0.8
    if _DISTANCE.search(s):    return "distance", 0.8
    if _REMIND.search(s):      return "reminder", 0.7
    if _HOWTO.search(s):       return "how_to_use", 0.7
    if _PURPOSE.search(s):     return "purpose", 0.7
    if _HISTORY.search(s):     return "history", 0.65
    if _TRAINING.search(s):    return "training", 0.65
    if _CHITCHAT.search(s):    return "chitchat", 0.6
    return "fallback", 0.35


def _cos_sim(a: List[float], b: List[float]) -> float:
    import math
    dot = sum(x*y for x, y in zip(a, b))
    na = math.sqrt(sum(x*x for x in a)) or 1e-9
    nb = math.sqrt(sum(y*y for y in b)) or 1e-9
    return dot/(na*nb)


def _load_tf():
    """Best-effort TF/Hub load. If anything fails, leave _EMBED=None."""
    global _EMBED, _LABELS, _VEC
    try:
        import tensorflow as tf          # noqa: F401
        import tensorflow_hub as hub     # noqa: F401

        # Multilingual USE model (works reasonably with Roman-Urdu)
        _EMBED = hub.load("https://tfhub.dev/google/universal-sentence-encoder-multilingual/3")

        _LABELS = list(_EXEMPLARS.keys())
        # Precompute exemplar embeddings
        _VEC = {}
        for lbl, phrases in _EXEMPLARS.items():
            vecs = _EMBED(phrases).numpy().tolist()
            _VEC[lbl] = vecs
    except Exception:
        _EMBED = None


class IntentRouter:
    def __init__(self) -> None:
        if _EMBED is None:
            _load_tf()

    def classify(self, text: str) -> Tuple[str, float]:
        """
        Returns (intent_label, confidence 0..1).
        Falls back to regex if TF is unavailable.
        """
        if not text or _EMBED is None:
            return _regex_intent(text or "")

        try:
            qv = _EMBED([text]).numpy()[0].tolist()
            best_lbl, best = "fallback", 0.0
            for lbl, vecs in _VEC.items():
                # max similarity over exemplars
                score = max(_cos_sim(qv, v) for v in vecs)
                if score > best:
                    best = score; best_lbl = lbl
            # map similarity (≈-1..1) to 0..1 confidence loosely
            conf = max(0.0, min(1.0, (best + 1.0) / 2.0))
            return best_lbl, conf
        except Exception:
            return _regex_intent(text or "")
