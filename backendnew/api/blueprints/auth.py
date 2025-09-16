from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy.exc import IntegrityError
from ..extensions import db
from ..models import User, PasswordResetToken
from ..schemas import user_schema
from ..utils.security import hash_password, check_password
from ..utils.emailer import send_email

bp = Blueprint("auth", __name__)

@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    display_name = data.get("display_name")
    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400
    try:
        u = User(email=email, password_hash=hash_password(password), display_name=display_name)
        db.session.add(u)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "email already registered"}), 409
    token = create_access_token(identity=str(u.id))
    return jsonify({"access_token": token, "user": user_schema.dump(u)})

@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    pw = data.get("password") or ""
    u = User.query.filter_by(email=email).first()
    if not u or not check_password(pw, u.password_hash):
        return jsonify({"error": "invalid email or password"}), 401
    token = create_access_token(identity=str(u.id))
    return jsonify({"access_token": token, "user": user_schema.dump(u)})

@bp.get("/me")
@jwt_required(optional=True)
def me():
    uid = get_jwt_identity()
    if not uid:
        return jsonify({"user": None})
    u = db.session.get(User, uid)
    return jsonify({"user": user_schema.dump(u)}) if u else (jsonify({"user": None}), 404)

@bp.post("/forgot")
def forgot():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    u = User.query.filter_by(email=email).first()
    if not u:
        return jsonify({"ok": True})  # don't reveal existence
    tok = PasswordResetToken(
        user_id=u.id,
        token=create_access_token(identity=str(u.id)),  # reuse JWT as one-time token in dev
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.session.add(tok)
    db.session.commit()
    send_email(email, "Reset your Sportrium password", f"Use this token: {tok.token}")
    return jsonify({"ok": True})

@bp.post("/reset")
def reset():
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    new_pw = data.get("password") or ""
    if not token or not new_pw:
        return jsonify({"error": "token and password required"}), 400
    t = PasswordResetToken.query.filter_by(token=token).first()
    if not t or t.expires_at < datetime.utcnow():
        return jsonify({"error": "invalid or expired token"}), 400
    u = db.session.get(User, t.user_id)
    if not u:
        return jsonify({"error": "user not found"}), 404
    u.password_hash = hash_password(new_pw)
    db.session.delete(t)
    db.session.commit()
    return jsonify({"ok": True})
