from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Team, TeamFollower
from ..schemas import team_schema, teams_schema

bp = Blueprint("teams", __name__)

@bp.get("/teams")
def list_teams():
    q = Team.query
    for attr in ["sport", "city", "province", "league"]:
        v = request.args.get(attr)
        if v: q = q.filter(getattr(Team, attr) == v)
    page = int(request.args.get("page", 1))
    size = int(request.args.get("page_size", 20))
    items = q.order_by(Team.created_at.desc()).paginate(page=page, per_page=size, error_out=False)
    return jsonify({"items": teams_schema.dump(items.items), "page": page, "page_size": size, "total": items.total})

@bp.get("/teams/<id>")
def get_team(id):
    t = db.session.get(Team, id)
    if not t: return jsonify({"error":"not found"}), 404
    return jsonify(team_schema.dump(t))

@bp.post("/teams")
@jwt_required()
def create_team():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error":"name required"}), 400
    t = Team(
        name=name,
        short_name=data.get("short_name"),
        league=data.get("league"),
        sport=data.get("sport"),
        city=data.get("city"),
        province=data.get("province"),
        owner_id=get_jwt_identity(),
    )
    db.session.add(t)
    db.session.commit()
    return jsonify(team_schema.dump(t)), 201

@bp.get("/teams/mine")
@jwt_required()
def my_teams():
    uid = get_jwt_identity()
    q = Team.query.filter_by(owner_id=uid).order_by(Team.created_at.desc())
    return jsonify(teams_schema.dump(q.all()))

@bp.post("/teams/<id>/follow")
@jwt_required()
def follow(id):
    uid = get_jwt_identity()
    if not db.session.get(Team, id): return jsonify({"error":"team not found"}), 404
    exists = TeamFollower.query.filter_by(user_id=uid, team_id=id).first()
    if exists: return jsonify({"ok": True})  # idempotent
    db.session.add(TeamFollower(user_id=uid, team_id=id))
    db.session.commit()
    return jsonify({"ok": True})

@bp.delete("/teams/<id>/follow")
@jwt_required()
def unfollow(id):
    uid = get_jwt_identity()
    row = TeamFollower.query.filter_by(user_id=uid, team_id=id).first()
    if row:
        db.session.delete(row)
        db.session.commit()
    return jsonify({"ok": True})
