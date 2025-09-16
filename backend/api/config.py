import os
from datetime import timedelta

# (Safe even if wsgi loads .env already)
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass


def _db_uri() -> str:
    """
    Choose DB from env, default to a local SQLite file.
    Normalizes postgres:// → postgresql+pg8000:// for pg8000.
    Priority:
      1) SQLALCHEMY_DATABASE_URI
      2) DATABASE_URL
      3) sqlite:///sportrium.db
    """
    uri = os.getenv("SQLALCHEMY_DATABASE_URI") or os.getenv("DATABASE_URL")
    if not uri:
        return "sqlite:///sportrium.db"
    if uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql+pg8000://", 1)
    return uri


class Config:
    API_PREFIX = os.getenv("API_PREFIX", "/api")

    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = (
        os.getenv("DEBUG", "").lower() in {"1", "true", "yes"}
        or ENV != "production"
    )

    # ✅ Always gets SQLite unless you explicitly set a Postgres URL
    SQLALCHEMY_DATABASE_URI = _db_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Auth / JWT
    SECRET_KEY = os.getenv("SECRET_KEY", "dev_change_me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_EXPIRES_SECONDS", "3600"))
    )

    # CORS helpers (if other parts of app read these)
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # Email (optional)
    SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER = os.getenv("SMTP_USER") or None
    SMTP_PASS = os.getenv("SMTP_PASS") or None
    SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@sportrium.local")
