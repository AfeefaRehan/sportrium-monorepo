from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..app.extensions import db
from ..app.models import User
from ..app.schemas import user_schema

bp = Blueprint("users", __name__)

@bp.get("/me")
@bp.get("/profile")
@jwt_required()
def get_me():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    return jsonify(user_schema.dump(user)), 200

@bp.patch("/me")
@bp.patch("/profile")
@jwt_required()
def patch_me():
    uid = get_jwt_identity()
    user = db.session.get(User, uid)
    data = request.get_json() or {}
    for f in ["display_name", "city", "bio", "avatar_url", "sports"]:
        if f in data:
            setattr(user, f, data[f])
    db.session.commit()
    return jsonify(user_schema.dump(user)), 200
