from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from ..app.extensions import db
from ..app.models import Event
from ..app.schemas import event_schema, events_schema
from ..utils.ics import event_to_ics

bp = Blueprint("events", __name__)

def parse_dt(s):
    return datetime.fromisoformat(s.replace("Z","+00:00")) if s else None

@bp.get("/events")
def list_events():
    q = Event.query
    status = request.args.get("status")
    sport = request.args.get("sport")
    level = request.args.get("level")
    inst = request.args.get("institution_type")
    city = request.args.get("city")
    province = request.args.get("province")
    date_from = parse_dt(request.args.get("date_from"))
    date_to = parse_dt(request.args.get("date_to"))

    if status: q = q.filter(Event.status==status)
    if sport: q = q.filter(Event.sport==sport)
    if level: q = q.filter(Event.level==level)
    if inst: q = q.filter(Event.institution_type==inst)
    if city: q = q.filter(Event.city==city)
    if province: q = q.filter(Event.province==province)
    if date_from: q = q.filter(Event.starts_at >= date_from)
    if date_to: q = q.filter(Event.starts_at <= date_to)

    page = int(request.args.get("page", 1))
    size = min(int(request.args.get("page_size", 20)), 100)
    items = q.order_by(Event.starts_at.asc()).paginate(page=page, per_page=size, error_out=False)
    return jsonify({"items": events_schema.dump(items.items), "page": page, "page_size": size, "total": items.total})

@bp.get("/events/live")
def live_events():
    q = Event.query.filter(Event.status=="live").order_by(Event.starts_at.desc()).limit(100)
    return jsonify(events_schema.dump(q.all()))

@bp.get("/events/<id>")
def get_event(id):
    ev = db.session.get(Event, id)
    if not ev: return jsonify({"error":"not found"}), 404
    return jsonify(event_schema.dump(ev))

@bp.get("/events/slug/<slug>")
def get_event_by_slug(slug):
    ev = db.session.scalar(db.select(Event).filter_by(slug=slug))
    if not ev: return jsonify({"error":"not found"}), 404
    return jsonify(event_schema.dump(ev))

@bp.post("/events")
@jwt_required()
def create_event():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    if not data.get("title") or not data.get("starts_at"):
        return jsonify({"error":"title and starts_at required (ISO 8601)"}), 400
    starts = parse_dt(data["starts_at"])
    ev = Event(
        title=data["title"],
        sport=data.get("sport"),
        level=data.get("level"),
        institution_type=data.get("institution_type"),
        host_id=uid,
        tournament_id=data.get("tournament_id"),
        team_a_id=data.get("team_a_id"),
        team_b_id=data.get("team_b_id"),
        venue=data.get("venue"),
        city=data.get("city"),
        province=data.get("province"),
        starts_at=starts,
        ends_at=parse_dt(data.get("ends_at")) if data.get("ends_at") else None,
        status=data.get("status") or "scheduled",
        slug=(data.get("slug") or f"ev-{uid[:6]}-{int(starts.timestamp())}"),
    )
    db.session.add(ev); db.session.commit()
    return jsonify(event_schema.dump(ev)), 201

@bp.get("/events/hosted")
@bp.get("/profile/hosted")
@jwt_required()
def hosted_by_me():
    uid = get_jwt_identity()
    q = Event.query.filter_by(host_id=uid).order_by(Event.starts_at.desc())
    return jsonify(events_schema.dump(q.all()))

@bp.get("/events/<id>/ics")
def event_ics(id):
    ev = db.session.get(Event, id)
    if not ev: return jsonify({"error":"not found"}), 404
    ics = event_to_ics(ev)
    return Response(ics, mimetype="text/calendar")
