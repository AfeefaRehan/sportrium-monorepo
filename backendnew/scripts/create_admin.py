# scripts/create_admin.py
import sys
from manage import app
from api.extensions import db
from api.models import User
from api.utils.security import hash_password

email = (sys.argv[1] if len(sys.argv) > 1 else "admin@example.com").strip().lower()
password = sys.argv[2] if len(sys.argv) > 2 else "Admin123!"

with app.app_context():
    u = User.query.filter_by(email=email).first()
    if not u:
        u = User(email=email, display_name="Admin User", is_active=True, is_admin=True)
        u.password_hash = hash_password(password)
        db.session.add(u)
    else:
        u.is_active = True
        u.is_admin = True
        u.password_hash = hash_password(password)
    db.session.commit()
    print("Admin ready:", u.id, u.email)
