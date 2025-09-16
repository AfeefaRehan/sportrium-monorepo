from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import or_
from ..app.extensions import db
from ..app.models import Tournament, TournamentRegistration

bp = Blueprint("tournaments", __name__)

@bp.get("/tournaments")
def list_tournaments():
    q = Tournament.query
    search = request.args.get("search")
    level = request.args.get("level")
    city = request.args.get("city")
    province = request.args.get("province")
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Tournament.name.ilike(like), Tournament.organizer.ilike(like)))
    if level: q = q.filter(Tournament.level==level)
    if city: q = q.filter(Tournament.city==city)
    if province: q = q.filter(Tournament.province==province)

    page = int(request.args.get("page", 1))
    size = min(int(request.args.get("page_size", 20)), 100)
    items = q.paginate(page=page, per_page=size, error_out=False)
    return jsonify({"items":[{
        "id":t.id, "name":t.name, "organizer":t.organizer, "level":t.level,
        "institution_type":t.institution_type, "city":t.city, "province":t.province,
        "start_date":t.start_date.isoformat() if t.start_date else None,
        "end_date":t.end_date.isoformat() if t.end_date else None
    } for t in items.items], "page":page,"page_size":size,"total":items.total})

@bp.get("/tournaments/<id>")
def get_tournament(id):
    t = db.session.get(Tournament, id)
    if not t: return jsonify({"error":"not found"}), 404
    return jsonify({
        "id":t.id, "name":t.name, "organizer":t.organizer, "level":t.level,
        "institution_type":t.institution_type, "city":t.city, "province":t.province,
        "start_date":t.start_date.isoformat() if t.start_date else None,
        "end_date":t.end_date.isoformat() if t.end_date else None
    })

@bp.post("/tournaments/<id>/register")
@jwt_required()
def register_team(id):
    data = request.get_json() or {}
    team_id = data.get("team_id")
    if not team_id: return jsonify({"error":"team_id required"}), 400
    if not db.session.get(Tournament, id): return jsonify({"error":"tournament not found"}), 404
    exists = db.session.scalar(db.select(TournamentRegistration).filter_by(tournament_id=id, team_id=team_id))
    if not exists:
        db.session.add(TournamentRegistration(tournament_id=id, team_id=team_id, status="pending"))
        db.session.commit()
    return jsonify({"ok":True}), 201
