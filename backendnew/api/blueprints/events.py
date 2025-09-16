from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from ..extensions import db
from ..models import Event
from ..schemas import event_schema, events_schema
from ..utils.ics import event_to_ics

bp = Blueprint("events", __name__)

def parse_dt(s):
    if not s: return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None

@bp.get("/events")
def list_events():
    q = Event.query
    # filters
    for attr in ["sport", "city", "province", "status"]:
        v = request.args.get(attr)
        if v: q = q.filter(getattr(Event, attr) == v)
    start = parse_dt(request.args.get("from"))
    end = parse_dt(request.args.get("to"))
    if start: q = q.filter(Event.starts_at >= start)
    if end:   q = q.filter(Event.starts_at <= end)

    page = int(request.args.get("page", 1))
    size = int(request.args.get("page_size", 20))
    items = q.order_by(Event.starts_at.asc()).paginate(page=page, per_page=size, error_out=False)
    return jsonify({"items": events_schema.dump(items.items), "page": page, "page_size": size, "total": items.total})

@bp.get("/events/live")
def live_events():
    q = Event.query.filter(Event.status == "live").order_by(Event.starts_at.desc()).limit(100)
    return jsonify(events_schema.dump(q.all()))

@bp.get("/events/<id>")
def get_event(id):
    ev = db.session.get(Event, id)
    if not ev: return jsonify({"error":"not found"}), 404
    return jsonify(event_schema.dump(ev))

@bp.post("/events")
@jwt_required()
def create_event():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    starts_at = parse_dt(data.get("starts_at"))
    if not title or not starts_at:
        return jsonify({"error":"title and starts_at required (ISO 8601)"}), 400
    ev = Event(
        title=title,
        sport=data.get("sport"),
        status=data.get("status") or "upcoming",
        city=data.get("city"),
        province=data.get("province"),
        venue=data.get("venue"),
        lat=data.get("lat"),
        lng=data.get("lng"),
        starts_at=starts_at,
        ends_at=parse_dt(data.get("ends_at")) or starts_at,
        host_id=get_jwt_identity(),
    )
    db.session.add(ev)
    db.session.commit()
    return jsonify(event_schema.dump(ev)), 201

@bp.get("/events/hosted")
@jwt_required()
def hosted_by_me():
    uid = get_jwt_identity()
    q = Event.query.filter_by(host_id=uid).order_by(Event.starts_at.desc())
    return jsonify(events_schema.dump(q.all()))


@bp.get("/events/schedule")
def events_schedule():
    # approved upcoming events sorted by start time
    now = datetime.utcnow()
    q = Event.query.filter(Event.status == "approved", Event.starts_at >= now).order_by(Event.starts_at.asc())
    page = int(request.args.get("page", 1)); size = int(request.args.get("page_size", 20))
    items = q.paginate(page=page, per_page=size, error_out=False)
    return jsonify({"items": events_schema.dump(items.items), "page": page, "page_size": size, "total": items.total})

@bp.get("/events/<id>/ics")
def event_ics(id):
    ev = db.session.get(Event, id)
    if not ev: return jsonify({"error": "not found"}), 404
    ics = event_to_ics({
        "id": ev.id,
        "title": ev.title,
        "venue": ev.venue,
        "city": ev.city,
        "starts_at": ev.starts_at,
        "ends_at": ev.ends_at or ev.starts_at,
    })
    return Response(ics, mimetype="text/calendar")


@bp.post("/events/<id>/tickets/purchase")
@jwt_required()
def purchase_tickets(id):
    uid = get_jwt_identity()
    e = db.session.get(Event, id)
    if not e: return jsonify({"error":"not found"}), 404
    data = request.get_json(silent=True) or {}
    qty = max(1, int(data.get("quantity", 1)))
    ticket_type_id = data.get("ticket_type_id")
    price_cents = int(data.get("price_cents") or 0)
    currency = data.get("currency") or "GBP"
    # capacity check if ticket_type_id provided
    if ticket_type_id:
        from ..models import TicketType
        tt = db.session.get(TicketType, ticket_type_id)
        if not tt or str(tt.event_id) != str(e.id):
            return jsonify({"error":"invalid ticket_type"}), 400
        if tt.capacity is not None and tt.sold + qty > tt.capacity:
            return jsonify({"error":"sold_out"}), 400
        tt.sold += qty
        total_cents = (tt.price_cents or 0) * qty
        currency = tt.currency or currency
        ticket_type = tt
    else:
        total_cents = price_cents * qty
        ticket_type = None
    from ..models import TicketPurchase
    purchase = TicketPurchase(user_id=uid, event_id=e.id, ticket_type_id=ticket_type_id, quantity=qty, total_cents=total_cents, currency=currency)
    db.session.add(purchase); db.session.commit()
    # send notifications (buyer + host)
    try:
        from ..notifications.service import deliver_notification
        deliver_notification([uid], "ticket_purchased",
            title="Ticket purchased", body=f"You bought {qty} ticket(s) for {e.title}",
            data={"entity":"event","eventId": str(e.id)})
        deliver_notification([e.host_id], "ticket_sold",
            title="Ticket sold", body=f"{qty} ticket(s) sold for {e.title}",
            data={"entity":"event","eventId": str(e.id)})
    except Exception:
        pass
    return jsonify({"ok": True, "purchase_id": str(purchase.id)}), 201

@bp.get("/events/<id>/tickets")
@jwt_required()
def list_event_tickets(id):
    uid = get_jwt_identity()  # (optional) could restrict to host/admin in future
    from ..models import TicketPurchase
    purchases = TicketPurchase.query.filter_by(event_id=id).order_by(TicketPurchase.created_at.desc()).limit(500).all()
    return jsonify({"items": [{
        "id": str(p.id), "user_id": str(p.user_id), "quantity": p.quantity, "total_cents": p.total_cents,
        "currency": p.currency, "created_at": p.created_at.isoformat()
    } for p in purchases]})
