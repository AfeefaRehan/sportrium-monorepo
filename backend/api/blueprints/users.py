from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User
from ..schemas import user_schema

bp = Blueprint("users", __name__)

@bp.get("/me")
@jwt_required()
def get_me():
    u = db.session.get(User, get_jwt_identity())
    return jsonify(user_schema.dump(u))

@bp.patch("/me")
@jwt_required()
def patch_me():
    u = db.session.get(User, get_jwt_identity())
    data = request.get_json(silent=True) or {}
    for k in ["display_name", "city", "bio", "avatar_url", "sports"]:
        if k in data:
            setattr(u, k, data[k])
    db.session.commit()
    return jsonify(user_schema.dump(u))
