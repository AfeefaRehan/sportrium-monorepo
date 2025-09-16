# backend/wsgi.py
import os
from flask_cors import CORS

# your app factory stays the same
from api import create_app

def _allowed_origins():
    """
    Build a robust list of allowed CORS origins from env.
    Works with:
      - CORS_ALLOW_ORIGINS (comma-separated)
      - FRONTEND_ORIGIN, ADMIN_FRONTEND_ORIGIN, FRONTEND_APP_URL
      - sensible localhost defaults if nothing set
    """
    origins = set()

    csv = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if csv:
        origins.update(o.strip() for o in csv.split(",") if o.strip())

    for var in ("FRONTEND_ORIGIN", "ADMIN_FRONTEND_ORIGIN", "FRONTEND_APP_URL"):
        v = os.getenv(var, "").strip()
        if v:
            origins.add(v)

    if not origins:
        origins.update({
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:5174", "http://127.0.0.1:5174",
        })
    return list(origins)

app = create_app()

# CORS only for /api/*, allow creds + common methods/headers
CORS(
    app,
    resources={r"/api/*": {"origins": _allowed_origins()}},
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=86400,
)

# ── Add /api/health and /api/chat without touching your existing blueprints ──
try:
    from patch_chat import patch_app  # new helper file below
    patch_app(app)
except Exception as e:
    print(f"[wsgi] patch_chat not applied: {e}")

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    debug_env = os.getenv("FLASK_ENV", "").lower() == "development"
    debug_flag = os.getenv("DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host="0.0.0.0", port=port, debug=(debug_env or debug_flag))
