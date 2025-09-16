# backend/patch_chat.py
import os
from typing import List, Dict

def _fallback_reply(messages: List[Dict], user_id=None) -> str:
    last_user = ""
    for m in reversed(messages or []):
        if m.get("role") == "user":
            last_user = m.get("content", "")
            break
    prefix = f"Thanks, user {user_id}!" if user_id else "Thanks!"
    return (
        f"{prefix} (dev-mode) You said: {last_user[:300]}"
        if last_user else
        f"{prefix} (dev-mode) Ask me about matches, teams, or events."
    )

def _maybe_openai_reply(messages: List[Dict], user_id=None) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return _fallback_reply(messages, user_id)
    try:
        from openai import OpenAI  # type: ignore
        client = OpenAI(api_key=api_key)
        model = os.getenv("MODEL_NAME", "gpt-4o-mini")
        msgs = [{"role": m.get("role", "user"), "content": m.get("content", "")} for m in messages]
        resp = client.chat.completions.create(
            model=model, messages=msgs, temperature=0.3, max_tokens=300
        )
        text = (resp.choices[0].message.content or "").strip()
        return text or _fallback_reply(messages, user_id)
    except Exception as e:
        return _fallback_reply(messages, user_id) + f" [note: OpenAI error: {e}]"

def _rule_exists(app, path: str, method: str) -> bool:
    method = method.upper()
    for rule in app.url_map.iter_rules():
        if rule.rule == path and method in rule.methods:
            return True
    return False

def patch_app(app):
    """
    Attach /api/health and /api/chat to the existing Flask app,
    but skip any route that already exists.
    """
    from flask import jsonify, request

    # --- /api/health (GET) ---
    if not _rule_exists(app, "/api/health", "GET"):
        def _health():
            return jsonify({
                "ok": True,
                "service": "sportrium-public-api",
                "env": {
                    "API_PREFIX": os.getenv("API_PREFIX", "/api"),
                    "MODEL_NAME": os.getenv("MODEL_NAME", ""),
                    "has_OPENAI_KEY": bool(os.getenv("OPENAI_API_KEY")),
                },
            })
        # unique endpoint name to avoid collisions
        app.add_url_rule("/api/health", endpoint="public_health", view_func=_health, methods=["GET"])

    # --- /api/chat (POST) ---
    if not _rule_exists(app, "/api/chat", "POST"):
        def _chat():
            data = request.get_json(silent=True) or {}
            messages = data.get("messages")
            user_id = data.get("userId")
            if not isinstance(messages, list) or not messages:
                return jsonify({"error": "`messages` must be a non-empty list of {role, content}."}), 400
            reply = _maybe_openai_reply(messages, user_id=user_id)
            return jsonify({"reply": reply})
        app.add_url_rule("/api/chat", endpoint="public_chat", view_func=_chat, methods=["POST"])
