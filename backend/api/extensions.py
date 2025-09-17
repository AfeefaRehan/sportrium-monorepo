# backend/api/extensions.py
import os
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler

try:
    # Optional: only needed if you want push notifications
    from firebase_admin import credentials, initialize_app as fb_init
except Exception:
    fb_init = None
    credentials = None

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
jwt = JWTManager()
scheduler = BackgroundScheduler()

try:
    from flask_mail import Mail
    mail = Mail()
except Exception:
    mail = None


def init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # Allow dev frontend origin(s)
    CORS(
        app,
        resources={r"/api/*": {
            "origins": os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:5173").split(",")
        }},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "OPTIONS"],
        max_age=86400,
    )

    if mail:
        mail.init_app(app)


def init_firebase(app):
    """
    Initialize Firebase Admin for FCM push notifications.
    Safe no-op if config or dependency is missing.
    """
    path = app.config.get("FCM_SERVICE_ACCOUNT_JSON_PATH")
    if not path:
        app.logger.warning("FCM_SERVICE_ACCOUNT_JSON_PATH not set; push disabled")
        return None
    if not fb_init or not credentials:
        app.logger.warning("firebase_admin not installed; push disabled")
        return None
    try:
        cred = credentials.Certificate(path)
        fb_init(cred)
        app.logger.info("Firebase initialized")
        return True
    except Exception as e:
        app.logger.warning(f"Firebase init failed: {e}")
        return None
