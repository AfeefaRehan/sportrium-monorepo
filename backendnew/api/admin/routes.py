
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import or_
from ..extensions import db
from ..models import User, Event, Team, Tournament, Reminder, Notification, PushToken
from ..schemas import user_schema
from datetime import datetime

bp = Blueprint("admin", __name__)

def _is_admin(u: User) -> bool:
    return bool(getattr(u, "is_admin", False))

def _require_admin():
    uid = get_jwt_identity()
    if not uid:
        return None, (jsonify({"error": "unauthorized"}), 401)
    u = db.session.get(User, uid)
    if not u or not _is_admin(u):
        return None, (jsonify({"error": "forbidden"}), 403)
    return u, None

@bp.get("/health")
def health():
    return jsonify({"ok": True})

@bp.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    pw = data.get("password") or ""
    u = db.session.query(User).filter_by(email=email).first()
    if not u:
        return jsonify({"error": "invalid email or password"}), 401
    from ..utils.security import check_password
    if not check_password(pw, u.password_hash):
        return jsonify({"error": "invalid email or password"}), 401
    if not _is_admin(u):
        return jsonify({"error": "not an admin"}), 403
    token = create_access_token(identity=str(u.id))
    return jsonify({"access_token": token, "user": user_schema.dump(u)})

@bp.get("/auth/me")
@jwt_required(optional=True)
def me():
    uid = get_jwt_identity()
    if not uid:
        return jsonify({"user": None})
    u = db.session.get(User, uid)
    if not u or not _is_admin(u):
        return jsonify({"user": None})
    return jsonify({"user": user_schema.dump(u)})

# Users
@bp.get("/users")
@jwt_required()
def users_list():
    admin, err = _require_admin()
    if err: return err
    q = request.args.get("q")
    status_filter = request.args.get("status")  # pending|verified|rejected
    query = db.session.query(User)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(or_(User.email.ilike(like), User.display_name.ilike(like)))
    page = int(request.args.get("page", 1)); page_size = min(int(request.args.get("page_size", 20)), 100)
    total = query.count()
    rows = query.order_by(User.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"page": page, "page_size": page_size, "total": total, "items": [user_schema.dump(u) for u in rows]})

@bp.patch("/users/<id>")
@jwt_required()
def user_patch(id):
    admin, err = _require_admin()
    if err: return err
    u = db.session.get(User, id)
    if not u: return jsonify({"error":"not found"}), 404
    data = request.get_json(silent=True) or {}
    for k in ["display_name", "is_admin", "is_active", "city", "bio", "avatar_url"]:
        if k in data and hasattr(u, k):
            setattr(u, k, data[k])
    db.session.commit()
    return jsonify({"user": user_schema.dump(u)})

# Events
def _ev(e: Event):
    return {
        "id": str(e.id), "title": e.title, "sport": getattr(e,"sport",None),
        "status": getattr(e,"status",None), "city": getattr(e,"city",None),
        "starts_at": e.starts_at.isoformat() if getattr(e,"starts_at",None) else None,
        "created_at": e.created_at.isoformat() if getattr(e,"created_at",None) else None,
    }


@bp.post("/events")
@jwt_required()
def admin_create_event():
    admin, err = _require_admin()
    if err: return err
    data = request.get_json(silent=True) or {}
    e = Event(
        title=data.get("title") or "Untitled",
        sport=data.get("sport"),
        city=data.get("city"),
        province=data.get("province"),
        venue=data.get("venue"),
        starts_at=datetime.fromisoformat(data["starts_at"]) if data.get("starts_at") else None,
        ends_at=datetime.fromisoformat(data["ends_at"]) if data.get("ends_at") else None,
        host_id=data.get("host_id") or admin.id,
        status=data.get("status") or "approved"
    )
    db.session.add(e); db.session.commit()
    return jsonify({"event": _ev(e)}), 201
@bp.get("/events")
@jwt_required()
def events_list():
    admin, err = _require_admin()
    if err: return err
    q = request.args.get("q")
    status_filter = request.args.get("status")  # pending|verified|rejected; status = request.args.get("status")
    query = db.session.query(Event)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(or_(Event.title.ilike(like), Event.city.ilike(like), Event.sport.ilike(like)))
    if status:
        query = query.filter(Event.status==status)
    page = int(request.args.get("page",1)); page_size = min(int(request.args.get("page_size",20)),100)
    total = query.count()
    rows = query.order_by(Event.starts_at.desc().nullslast(), Event.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"page":page,"page_size":page_size,"total":total,"items":[_ev(e) for e in rows]})

@bp.patch("/events/<id>")
@jwt_required()
def event_patch(id):
    admin, err = _require_admin()
    if err: return err
    e = db.session.get(Event, id)
    if not e: return jsonify({"error":"not found"}), 404
    data = request.get_json(silent=True) or {}
    for k in ["title","sport","city","status","venue","province"]:
        if k in data and hasattr(e, k):
            setattr(e, k, data[k])
    if "starts_at" in data:
        try:
            e.starts_at = datetime.fromisoformat(data["starts_at"]) if data["starts_at"] else None
        except Exception:
            pass
    db.session.commit()
    return jsonify({"event": _ev(e)})

@bp.post("/events/<id>/approve")
@jwt_required()
def event_approve(id):
    admin, err = _require_admin()
    if err: return err
    e = db.session.get(Event, id)
    if not e: return jsonify({"error":"not found"}), 404
    if hasattr(e,"status"): e.status = "approved"; db.session.commit()
    try:
        from ..notifications.service import deliver_notification
        deliver_notification([e.host_id], "event_approved",
            title="Event approved", body=f"Your event '{e.title}' was approved", data={"entity":"event","eventId": str(e.id)})
    except Exception:
        pass
    return jsonify({"event": _ev(e)})

@bp.post("/events/<id>/reject")
@jwt_required()
def event_reject(id):
    admin, err = _require_admin()
    if err: return err
    e = db.session.get(Event, id)
    if not e: return jsonify({"error":"not found"}), 404
    if hasattr(e,"status"): e.status = "rejected"; db.session.commit()
    try:
        from ..notifications.service import deliver_notification
        deliver_notification([e.host_id], "event_rejected",
            title="Event rejected", body=f"Your event '{e.title}' was rejected", data={"entity":"event","eventId": str(e.id)})
    except Exception:
        pass
    return jsonify({"event": _ev(e)})

# Teams
def _team(t: Team):
    return {
        "id": str(t.id), "name": t.name, "sport": getattr(t,"sport",None),
        "city": getattr(t,"city",None), "owner_id": getattr(t,"owner_id",None),
        "verified_at": getattr(t,"verified_at",None).isoformat() if getattr(t,"verified_at",None) else None,
        "created_at": t.created_at.isoformat() if getattr(t,"created_at",None) else None,
    }

@bp.get("/teams")
@jwt_required()
def teams_list():
    admin, err = _require_admin()
    if err: return err
    q = request.args.get("q")
    status_filter = request.args.get("status")  # pending|verified|rejected
    query = db.session.query(Team)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(or_(Team.name.ilike(like), Team.city.ilike(like), Team.sport.ilike(like)))
    page = int(request.args.get("page",1)); page_size = min(int(request.args.get("page_size",20)),100)
    total = query.count()
    rows = query.order_by(Team.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"page":page,"page_size":page_size,"total":total,"items":[_team(t) for t in rows]})

@bp.patch("/teams/<id>")
@jwt_required()
def team_patch(id):
    admin, err = _require_admin()
    if err: return err
    t = db.session.get(Team, id)
    if not t: return jsonify({"error":"not found"}), 404
    data = request.get_json(silent=True) or {}
    for k in ["name","sport","city","owner_id"]:
        if k in data and hasattr(t, k):
            setattr(t, k, data[k])
    db.session.commit()
    return jsonify({"team": _team(t)})


@bp.post("/teams/<id>/reject")
@jwt_required()
def team_reject(id):
    admin, err = _require_admin()
    if err: return err
    t = db.session.get(Team, id)
    if not t: return jsonify({"error":"not found"}), 404
    if hasattr(t, "rejected_at"):
        t.rejected_at = datetime.utcnow()
        db.session.commit()
        # notify owner if available
        try:
            from ..notifications.service import deliver_notification
            deliver_notification([t.owner_id], "team_rejected",
                title="Team rejected",
                body=f"Your team '{t.name}' was rejected by admin",
                data={"entity":"team","teamId": str(t.id)})
        except Exception:
            pass
    return jsonify({"team": _team(t)})
@bp.post("/teams/<id>/verify")
@jwt_required()
def team_verify(id):
    admin, err = _require_admin()
    if err: return err
    t = db.session.get(Team, id)
    if not t: return jsonify({"error":"not found"}), 404
    if hasattr(t, "verified_at"):
        t.verified_at = datetime.utcnow()
        db.session.commit()
        try:
            from ..notifications.service import deliver_notification
            deliver_notification([t.owner_id], "team_verified",
                title="Team verified", body=f"Your team '{t.name}' was verified", data={"entity":"team","teamId": str(t.id)})
        except Exception:
            pass
    return jsonify({"team": _team(t)})

# Tournaments
def _tour(t: Tournament):
    return {
        "id": str(t.id), "name": t.name, "sport": getattr(t,"sport",None),
        "city": getattr(t,"city",None), "start_date": getattr(t,"start_date",None).isoformat() if getattr(t,"start_date",None) else None,
        "end_date": getattr(t,"end_date",None).isoformat() if getattr(t,"end_date",None) else None,
        "status": getattr(t,"status",None),
        "created_at": t.created_at.isoformat() if getattr(t,"created_at",None) else None,
    }

@bp.get("/tournaments")
@jwt_required()
def tournaments_list():
    admin, err = _require_admin()
    if err: return err
    q = request.args.get("q")
    status_filter = request.args.get("status")  # pending|verified|rejected
    query = db.session.query(Tournament)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(or_(Tournament.name.ilike(like), Tournament.city.ilike(like), Tournament.sport.ilike(like)))
    page = int(request.args.get("page",1)); page_size = min(int(request.args.get("page_size",20)),100)
    total = query.count()
    rows = query.order_by(Tournament.created_at.desc()).offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"page":page,"page_size":page_size,"total":total,"items":[_tour(x) for x in rows]})

@bp.post("/tournaments")
@jwt_required()
def tournaments_create():
    admin, err = _require_admin()
    if err: return err
    data = request.get_json(silent=True) or {}
    t = Tournament(name=data.get("name"), sport=data.get("sport"), city=data.get("city"), status=data.get("status","planning"))
    from datetime import date
    if data.get("start_date"):
        try: t.start_date = date.fromisoformat(data["start_date"])
        except Exception: pass
    if data.get("end_date"):
        try: t.end_date = date.fromisoformat(data["end_date"])
        except Exception: pass
    db.session.add(t); db.session.commit()
    return jsonify({"tournament": _tour(t)}), 201

@bp.patch("/tournaments/<id>")
@jwt_required()
def tournaments_patch(id):
    admin, err = _require_admin()
    if err: return err
    t = db.session.get(Tournament, id)
    if not t: return jsonify({"error":"not found"}), 404
    data = request.get_json(silent=True) or {}
    for k in ["name","sport","city","status"]:
        if k in data and hasattr(t, k):
            setattr(t, k, data[k])
    from datetime import date
    if "start_date" in data:
        try: t.start_date = date.fromisoformat(data["start_date"]) if data["start_date"] else None
        except Exception: pass
    if "end_date" in data:
        try: t.end_date = date.fromisoformat(data["end_date"]) if data["end_date"] else None
        except Exception: pass
    db.session.commit()
    return jsonify({"tournament": _tour(t)})

# Reminders
def _rem(r: Reminder):
    return {
        "id": str(r.id), "user_id": str(r.user_id) if getattr(r,"user_id",None) else None,
        "event_id": str(r.event_id) if getattr(r,"event_id",None) else None,
        "method": getattr(r,"method",None), "status": getattr(r,"status",None),
        "due_at": getattr(r,"due_at",None).isoformat() if getattr(r,"due_at",None) else None,
        "sent_at": getattr(r,"sent_at",None).isoformat() if getattr(r,"sent_at",None) else None,
        "created_at": r.created_at.isoformat() if getattr(r,"created_at",None) else None,
    }

@bp.get("/reminders")
@jwt_required()
def reminders_list():
    admin, err = _require_admin()
    if err: return err
    q = db.session.query(Reminder).order_by(Reminder.created_at.desc())
    page = int(request.args.get("page",1)); page_size = min(int(request.args.get("page_size",20)),100)
    total = q.count()
    rows = q.offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"page":page,"page_size":page_size,"total":total,"items":[_rem(x) for x in rows]})

@bp.patch("/reminders/<id>")
@jwt_required()
def reminders_patch(id):
    admin, err = _require_admin()
    if err: return err
    r = db.session.get(Reminder, id)
    if not r: return jsonify({"error":"not found"}), 404
    data = request.get_json(silent=True) or {}
    for k in ["method","status"]:
        if k in data and hasattr(r,k):
            setattr(r,k,data[k])
    db.session.commit()
    return jsonify({"reminder": _rem(r)})

@bp.post("/reminders/<id>/requeue")
@jwt_required()
def reminders_requeue(id):
    admin, err = _require_admin()
    if err: return err
    r = db.session.get(Reminder, id)
    if not r: return jsonify({"error":"not found"}), 404
    if hasattr(r, "status"): r.status = "pending"
    if hasattr(r, "sent_at"): r.sent_at = None
    db.session.commit()
    return jsonify({"reminder": _rem(r)})

# Notifications
def _noti(n: Notification):
    return {
        "id": str(n.id), "user_id": str(n.user_id) if getattr(n,"user_id",None) else None,
        "title": getattr(n,"title",None), "body": getattr(n,"body",None),
        "status": getattr(n,"status",None),
        "sent_at": getattr(n,"sent_at",None).isoformat() if getattr(n,"sent_at",None) else None,
        "created_at": n.created_at.isoformat() if getattr(n,"created_at",None) else None,
    }

@bp.get("/notifications")
@jwt_required()
def notifications_list():
    admin, err = _require_admin()
    if err: return err
    q = db.session.query(Notification).order_by(Notification.created_at.desc())
    page = int(request.args.get("page",1)); page_size = min(int(request.args.get("page_size",20)),100)
    total = q.count()
    rows = q.offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"page":page,"page_size":page_size,"total":total,"items":[_noti(x) for x in rows]})

@bp.post("/notifications/<id>/resend")
@jwt_required()
def notifications_resend(id):
    admin, err = _require_admin()
    if err: return err
    n = db.session.get(Notification, id)
    if not n: return jsonify({"error":"not found"}), 404
    if hasattr(n, "status"): n.status = "queued"
    if hasattr(n, "sent_at"): n.sent_at = None
    db.session.commit()
    return jsonify({"notification": _noti(n)})

# Push tokens
def _pt(t: PushToken):
    return {
        "id": str(t.id), "user_id": str(t.user_id) if getattr(t,"user_id",None) else None,
        "token": getattr(t,"token",None), "platform": getattr(t,"platform",None),
        "revoked_at": getattr(t,"revoked_at",None).isoformat() if getattr(t,"revoked_at",None) else None,
        "created_at": t.created_at.isoformat() if getattr(t,"created_at",None) else None,
    }

@bp.get("/push-tokens")
@jwt_required()
def push_tokens_list():
    admin, err = _require_admin()
    if err: return err
    q = db.session.query(PushToken).order_by(PushToken.created_at.desc())
    page = int(request.args.get("page",1)); page_size = min(int(request.args.get("page_size",20)),100)
    total = q.count()
    rows = q.offset((page-1)*page_size).limit(page_size).all()
    return jsonify({"page":page,"page_size":page_size,"total":total,"items":[_pt(x) for x in rows]})
