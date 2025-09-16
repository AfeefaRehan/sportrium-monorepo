from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import UserFollow, User
from ..notifications.service import deliver_notification

bp = Blueprint("follows", __name__)

@bp.post("/<user_id>/follow")
@jwt_required()
def follow(user_id):
    me = get_jwt_identity()
    if str(me) == str(user_id):
        return jsonify({"error": "cannot follow self"}), 400

    exists = UserFollow.query.filter_by(follower_id=me, following_id=user_id).first()
    if not exists:
        db.session.add(UserFollow(follower_id=me, following_id=user_id))
        db.session.commit()
        u = db.session.get(User, me)
        name = getattr(u, "display_name", None) or getattr(u, "email", "Someone")
        deliver_notification([user_id], "new_follower", f"{name} followed you", "", {"entity":"user","userId": me})
    return jsonify({"ok": True})

@bp.delete("/<user_id>/follow")
@jwt_required()
def unfollow(user_id):
    me = get_jwt_identity()
    UserFollow.query.filter_by(follower_id=me, following_id=user_id).delete()
    db.session.commit()
    return jsonify({"ok": True})

@bp.get("/<user_id>/followers")
@jwt_required()
def followers(user_id):
    rows = db.session.query(UserFollow.follower_id).filter_by(following_id=user_id).all()
    ids = [r[0] for r in rows]
    return jsonify({"items": ids, "count": len(ids)})

@bp.get("/<user_id>/following")
@jwt_required()
def following(user_id):
    rows = db.session.query(UserFollow.following_id).filter_by(follower_id=user_id).all()
    ids = [r[0] for r in rows]
    return jsonify({"items": ids, "count": len(ids)})
