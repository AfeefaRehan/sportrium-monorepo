# src/app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
jwt = JWTManager()  # NEW

# Optional Mail (safe if package not installed)
try:
    from flask_mail import Mail
    mail = Mail()
except Exception:
    mail = None

def init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    if mail:
        mail.init_app(app)

    # NEW: allow Vite dev (or all origins during dev)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
