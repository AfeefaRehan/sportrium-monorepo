from flask import Blueprint, request, jsonify, current_app
from datetime import timedelta
from sqlalchemy.exc import IntegrityError

from src.app.extensions import db, bcrypt
from src.app.models import User

# JWT
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)

bp = Blueprint("auth", __name__)  # NOTE: no /api or /auth here

@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    display_name = data.get("display_name") or ""

    if not email or not password:
        return jsonify({"error": "email and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already exists"}), 409

    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    u = User(email=email, password_hash=pw_hash, display_name=display_name)
    db.session.add(u)
    db.session.commit()

    exp = int(current_app.config.get("JWT_EXPIRES_SECONDS", 3600))
    token = create_access_token(identity=str(u.id), expires_delta=timedelta(seconds=exp))

    return jsonify({
        "access_token": token,
        "user": {"id": str(u.id), "email": u.email, "display_name": u.display_name}
    }), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    u = User.query.filter_by(email=email).first()
    if not u or not bcrypt.check_password_hash(u.password_hash, password):
        return jsonify({"error": "invalid credentials"}), 401

    exp = int(current_app.config.get("JWT_EXPIRES_SECONDS", 3600))
    token = create_access_token(identity=str(u.id), expires_delta=timedelta(seconds=exp))

    return jsonify({
        "access_token": token,
        "user": {"id": str(u.id), "email": u.email, "display_name": u.display_name}
    }), 200


@bp.get("/me")
@jwt_required()
def me():
    uid = get_jwt_identity()
    u = User.query.get(uid)
    if not u:
        return jsonify({"error": "not found"}), 404
    return jsonify({"id": str(u.id), "email": u.email, "display_name": u.display_name}), 200
