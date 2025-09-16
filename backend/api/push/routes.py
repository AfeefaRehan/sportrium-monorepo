from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import PushToken

bp = Blueprint("push", __name__)

@bp.post("/tokens")
@jwt_required()
def save_token():
    uid = get_jwt_identity()
    token = (request.json or {}).get("token")
    platform = (request.json or {}).get("platform", "web")
    if not token:
        return jsonify({"error": "token required"}), 400

    row = PushToken.query.filter_by(token=token).first()
    if row:
        row.user_id = uid
        row.platform = platform
        row.revoked_at = None
    else:
        row = PushToken(user_id=uid, token=token, platform=platform)
        db.session.add(row)
    db.session.commit()
    return jsonify({"ok": True})

@bp.delete("/tokens/<token>")
@jwt_required()
def revoke_token(token):
    uid = get_jwt_identity()
    row = PushToken.query.filter_by(token=token, user_id=uid).first()
    if not row:
        return jsonify({"ok": True})
    from datetime import datetime
    row.revoked_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"ok": True})
