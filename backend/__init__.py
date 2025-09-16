# backend/__init__.py
import os
from flask import Flask, jsonify
from dotenv import load_dotenv

# ✅ relative imports (robust when running as a package)
from .config import Config
from .extensions import init_extensions, init_firebase, scheduler

# blueprints
from .blueprints.auth import bp as auth_bp
from .blueprints.users import bp as users_bp
from .blueprints.teams import bp as teams_bp
from .blueprints.events import bp as events_bp
from .blueprints.tournaments import bp as tournaments_bp
from .blueprints.reminders import bp as reminders_bp

# NEW blueprints (notifications, push-tokens, user-follows, oauth)
from .notifications.routes import bp as notifications_bp
from .push.routes import bp as push_bp
from .follows.routes import bp as follows_bp
from .auth.oauth import bp as oauth_bp
from .reminders.scheduler import register_jobs

# legacy assistant
from .assistant import bp as assistant_bp

# rules-based assistant router
from .api.assistant_router import bp as assistant_router_bp

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

    register_jobs(app)
    scheduler.start()
    return app
