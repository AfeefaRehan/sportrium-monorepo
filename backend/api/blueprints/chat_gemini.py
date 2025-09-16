# backend/api/blueprints/chat_gemini.py
from flask import Blueprint, request, jsonify
import os

# Optional: OpenAI support (agar aap baad me paid key lagayen)
try:
    from openai import OpenAI
    _has_openai = True
except Exception:
    _has_openai = False

# Gemini (free dev)
import google.generativeai as genai

chat_bp = Blueprint("chat_bp", __name__, url_prefix=os.getenv("API_PREFIX", "/api"))

def _reply_openai(message: str, history: list | None):
    if not _has_openai:
        raise RuntimeError("openai package not installed")
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY missing")
    client = OpenAI(api_key=key)
    # Minimal history support
    msgs = [{"role": "user", "content": message}]
    if history:
        # keep only role/content pairs
        msgs = [
            {"role": m.get("role","user"), "content": m.get("content","")}
            for m in history if isinstance(m, dict)
        ] + msgs
    r = client.chat.completions.create(
        model=os.getenv("MODEL_NAME","gpt-4o-mini"),
        messages=msgs,
        temperature=0.2,
    )
    return r.choices[0].message.content.strip()

def _reply_gemini(message: str, history: list | None):
    key = os.getenv("GOOGLE_API_KEY")
    if not key:
        raise RuntimeError("GOOGLE_API_KEY missing")
    genai.configure(api_key=key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    model = genai.GenerativeModel(model_name)

    # Convert history to Gemini format (optional)
    chat = model.start_chat(history=[
        {"role": (m.get("role") or "user"), "parts": [m.get("content","")]}
        for m in (history or []) if isinstance(m, dict)
    ])
    r = chat.send_message(message)
    return (r.text or "").strip()

def _dev_echo(message: str):
    return f"Thanks! (dev-mode) You said: {message}"

@chat_bp.post("/chat")
def chat_route():
    """
    JSON body:
      { "message": "hi", "history": [ {role, content}, ... ] }
    """
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history")
    if not message:
        return jsonify({"error": "message is required"}), 400

    # Provider preference: OpenAI if key set, else Gemini if key set, else dev-echo
    try:
        if os.getenv("OPENAI_API_KEY"):
            text = _reply_openai(message, history)
            provider = "openai"
        elif os.getenv("GOOGLE_API_KEY"):
            text = _reply_gemini(message, history)
            provider = "gemini"
        else:
            text = _dev_echo(message)
            provider = "dev"
        return jsonify({"ok": True, "provider": provider, "reply": text})
    except Exception as e:
        # Don’t leak provider errors to FE; return friendly error
        return jsonify({
            "ok": False,
            "provider": ("openai" if os.getenv("OPENAI_API_KEY") else
                         "gemini" if os.getenv("GOOGLE_API_KEY") else
                         "dev"),
            "error": "chat_failed"
        }), 500
