from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Reminder, Event
from ..schemas import reminders_schema, reminder_schema

bp = Blueprint("reminders", __name__)

@bp.get("/me/reminders")
@jwt_required()
def my_reminders():
    uid = get_jwt_identity()
    rems = Reminder.query.filter_by(user_id=uid).all()
    return jsonify(reminders_schema.dump(rems))

@bp.post("/events/<id>/reminders")
@jwt_required()
def create_reminder(id):
    uid = get_jwt_identity()
    if not db.session.get(Event, id): return jsonify({"error":"event not found"}), 404
    method = (request.get_json(silent=True) or {}).get("method", "push")
    # upsert-like behavior
    r = Reminder.query.filter_by(user_id=uid, event_id=id).first()
    if r:
        r.method = method
    else:
        r = Reminder(user_id=uid, event_id=id, method=method)
        db.session.add(r)
    db.session.commit()
    return jsonify(reminder_schema.dump(r)), 201

@bp.delete("/reminders/<id>")
@jwt_required()
def delete_reminder(id):
    uid = get_jwt_identity()
    r = Reminder.query.filter_by(id=id, user_id=uid).first()
    if r:
        db.session.delete(r)
        db.session.commit()
    return jsonify({"ok": True})
@bp.post("/reminders")
@jwt_required()
def upsert_reminder_root():
    uid = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    event_id = data.get("event_id")
    method = data.get("method", "push")
    if not event_id:
        return jsonify({"error":"event_id required"}), 400
    if not db.session.get(Event, event_id):
        return jsonify({"error":"event not found"}), 404
    r = Reminder.query.filter_by(user_id=uid, event_id=event_id).first()
    if r:
        r.method = method
    else:
        r = Reminder(user_id=uid, event_id=event_id, method=method)
        db.session.add(r)
    db.session.commit()
    return jsonify(reminder_schema.dump(r)), 201
