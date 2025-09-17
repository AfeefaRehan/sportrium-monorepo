# backend/config.py
import os

def _bool(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return str(v).strip().lower() in {"1", "true", "t", "yes", "y"}

def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except Exception:
        return default

class Config:
    # --- Flask / DB ---
    SECRET_KEY = os.getenv("SECRET_KEY", "sk_dev_change_me")
    SQLALCHEMY_DATABASE_URI = (
        os.getenv("DATABASE_URL")
        or os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///sportrium.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- API prefixes ---
    API_PREFIX = os.getenv("API_PREFIX", "/api")
    ADMIN_API_PREFIX = os.getenv("ADMIN_API_PREFIX", "/api/admin/v1")

    # --- JWT ---
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", "jwt_dev_change_me")
    JWT_ACCESS_TOKEN_EXPIRES = _int("JWT_EXPIRES_SECONDS", 3600)

    # --- CORS / Frontend ---
    CORS_ALLOW_ORIGINS = [
        o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173").split(",")
        if o.strip()
    ]
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    ADMIN_FRONTEND_ORIGIN = os.getenv("ADMIN_FRONTEND_ORIGIN", "http://localhost:5174")
    FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", FRONTEND_ORIGIN)

    # --- Push / Firebase (optional) ---
    FCM_SERVICE_ACCOUNT_JSON_PATH = os.getenv("FCM_SERVICE_ACCOUNT_JSON_PATH")

    # --- OAuth (optional) ---
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
    FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID")
    FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET")
    FACEBOOK_REDIRECT_URI = os.getenv("FACEBOOK_REDIRECT_URI")

    # --- Assistant / LLM ---
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    ASSISTANT_SYSTEM_PROMPT_FILE = os.getenv(
        "ASSISTANT_SYSTEM_PROMPT_FILE", "backend/prompts/assistant_system.md"
    )
    LLM_TIMEOUT_SEC = _int("LLM_TIMEOUT_SEC", 6)
    LLM_CIRCUIT_TRIP = _int("LLM_CIRCUIT_TRIP", 3)
    LLM_CIRCUIT_COOLDOWN_SEC = _int("LLM_CIRCUIT_COOLDOWN_SEC", 300)

    # --- APScheduler ---
    SCHEDULER_API_ENABLED = True
