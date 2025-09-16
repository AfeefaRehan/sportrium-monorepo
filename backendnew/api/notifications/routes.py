from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Notification

bp = Blueprint("notifications", __name__)

@bp.get("/")
@jwt_required()
def list_notifications():
    uid = get_jwt_identity()
    unread_only = request.args.get("unread") == "true"
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 20)), 100)

    q = Notification.query.filter_by(user_id=uid)
    if unread_only:
        q = q.filter(Notification.read_at.is_(None))
    q = q.order_by(Notification.created_at.desc())

    items = q.paginate(page=page, per_page=limit, error_out=False)
    data = [{
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "data": n.data_json,
        "read_at": n.read_at.isoformat() if n.read_at else None,
        "created_at": n.created_at.isoformat(),
    } for n in items.items]

    return jsonify({"items": data, "page": page, "total": items.total})

@bp.get("/badge")
@jwt_required()
def badge():
    uid = get_jwt_identity()
    count = Notification.query.filter_by(user_id=uid, read_at=None).count()
    return jsonify({"unread": count})

@bp.patch("/<nid>/read")
@jwt_required()
def mark_read(nid):
    uid = get_jwt_identity()
    n = Notification.query.filter_by(id=nid, user_id=uid).first_or_404()
    if n.read_at is None:
        from datetime import datetime
        n.read_at = datetime.utcnow()
        db.session.commit()
    return jsonify({"ok": True})

@bp.post("/read")
@jwt_required()
def mark_read_bulk():
    uid = get_jwt_identity()
    ids = (request.json or {}).get("ids", [])
    from datetime import datetime
    Notification.query.filter(
        Notification.id.in_(ids),
        Notification.user_id == uid,
        Notification.read_at.is_(None)
    ).update({Notification.read_at: datetime.utcnow()}, synchronize_session=False)
    db.session.commit()
    return jsonify({"ok": True})
