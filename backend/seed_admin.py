from dotenv import load_dotenv
load_dotenv()

from api import create_app
from api.extensions import db
from api.models import User

# agar aapke project me custom hash func nahi hai to werkzeug use karein:
try:
    from api.utils.security import hash_password as make_hash
except Exception:
    from werkzeug.security import generate_password_hash as make_hash

app = create_app()
with app.app_context():
    # ✅ tables ensure
    db.create_all()

    email = "admin@example.com"
    password = "Adminpass123"

    u = User.query.filter_by(email=email).first()
    if not u:
        u = User(
            email=email,
            password_hash=make_hash(password),
            display_name="Admin",
            is_admin=True,
        )
        db.session.add(u)
    else:
        u.password_hash = make_hash(password)
        u.is_admin = True

    db.session.commit()
    print("✅ Admin ready:", email, "password:", password)
