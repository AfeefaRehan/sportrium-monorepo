# backend/__init__.py
import os
from flask import Flask, jsonify
from dotenv import load_dotenv

from .config import Config
from .api.extensions import init_extensions, init_firebase, scheduler

# ✅ blueprints (now under backend/api/…)
from .api.blueprints.auth import bp as auth_bp
from .api.blueprints.users import bp as users_bp
from .api.blueprints.teams import bp as teams_bp
from .api.blueprints.events import bp as events_bp
from .api.blueprints.tournaments import bp as tournaments_bp
from .api.blueprints.reminders import bp as reminders_bp

# NEW blueprints (notifications, push-tokens, user-follows, oauth)
from .api.notifications.routes import bp as notifications_bp
from .api.push.routes import bp as push_bp
from .api.follows.routes import bp as follows_bp
from .api.auth.oauth import bp as oauth_bp

# legacy assistant (also lives under api)
from .api.assistant import bp as assistant_bp

# rules-based assistant router
from .api.assistant_router import bp as assistant_router_bp

# job registrations moved under api.reminders
from .api.reminders.scheduler import register_jobs

# chat/LLM router patch
from .patch_chat import patch_app

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    init_extensions(app)
    init_firebase(app)

    @app.get("/health")
    def health():
        return jsonify({"ok": True}), 200

    prefix = app.config.get("API_PREFIX", "/api").rstrip("/")

    app.register_blueprint(auth_bp, url_prefix=f"{prefix}/auth")
    app.register_blueprint(oauth_bp, url_prefix=f"{prefix}/auth/oauth")

    app.register_blueprint(users_bp, url_prefix=prefix)
    app.register_blueprint(follows_bp, url_prefix=f"{prefix}/users")

    app.register_blueprint(teams_bp, url_prefix=prefix)
    app.register_blueprint(events_bp, url_prefix=prefix)
    app.register_blueprint(tournaments_bp, url_prefix=prefix)
    app.register_blueprint(reminders_bp, url_prefix=prefix)

    app.register_blueprint(assistant_bp)

    app.register_blueprint(notifications_bp, url_prefix=f"{prefix}/notifications")
    app.register_blueprint(push_bp,           url_prefix=f"{prefix}/push")

    app.register_blueprint(assistant_router_bp)

    # add /api/chat (idempotent)
    patch_app(app)

    register_jobs(app)
    scheduler.start()
    return app
