from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..app.extensions import db
from ..app.models import Reminder

bp = Blueprint("reminders", __name__)

@bp.get("/me/reminders")
@jwt_required()
def my_reminders():
    uid = get_jwt_identity()
    rows = db.session.scalars(db.select(Reminder).filter_by(user_id=uid)).all()
    return jsonify([{
        "id": r.id, "user_id": r.user_id, "event_id": r.event_id,
        "method": r.method, "offset_minutes": r.offset_minutes,
        "created_at": r.created_at.isoformat()
    } for r in rows])

@bp.post("/events/<event_id>/reminders")
@jwt_required()
def create_reminder(event_id):
    uid = get_jwt_identity()
    data = request.get_json() or {}
    off = int(data.get("offset_minutes", 60))
    if off < 0 or off > 1440:
        return jsonify({"error":"offset_minutes must be 0..1440"}), 400
    row = db.session.scalar(db.select(Reminder).filter_by(user_id=uid, event_id=event_id, method="email"))
    if not row:
        from ..app.models import Reminder as R
        row = R(user_id=uid, event_id=event_id, offset_minutes=off)
        db.session.add(row)
    else:
        row.offset_minutes = off
    db.session.commit()
    return jsonify({"id": row.id, "offset_minutes": row.offset_minutes}), 201

@bp.delete("/reminders/<id>")
@jwt_required()
def delete_reminder(id):
    uid = get_jwt_identity()
    row = db.session.get(Reminder, id)
    if row and row.user_id == uid:
        db.session.delete(row); db.session.commit()
    return ("", 204)
