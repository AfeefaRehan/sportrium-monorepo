from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import or_
from ..app.extensions import db
from ..app.models import Team, TeamMember, FollowTeam
from ..app.schemas import team_schema, teams_schema

bp = Blueprint("teams", __name__)

@bp.get("/teams")
def list_teams():
    q = Team.query
    search = request.args.get("search")
    sport = request.args.get("sport")
    city = request.args.get("city")
    province = request.args.get("province")

    if search:
        like = f"%{search}%"
        q = q.filter(or_(Team.name.ilike(like), Team.short_name.ilike(like), Team.league.ilike(like)))
    if sport: q = q.filter(Team.sport==sport)
    if city: q = q.filter(Team.city==city)
    if province: q = q.filter(Team.province==province)

    page = int(request.args.get("page", 1))
    size = min(int(request.args.get("page_size", 20)), 100)
    items = q.order_by(Team.created_at.desc()).paginate(page=page, per_page=size, error_out=False)
    return jsonify({
        "items": teams_schema.dump(items.items),
        "page": page, "page_size": size, "total": items.total
    })

@bp.get("/teams/<id>")
def get_team(id):
    t = db.session.get(Team, id)
    if not t: return jsonify({"error":"not found"}), 404
    return jsonify(team_schema.dump(t))

@bp.get("/teams/<id>/members")
def team_members(id):
    rows = db.session.scalars(db.select(TeamMember).filter_by(team_id=id)).all()
    return jsonify([{"id": r.id, "user_id": r.user_id, "role": r.role, "joined_at": r.joined_at.isoformat()} for r in rows])

@bp.post("/teams")
@jwt_required()
def create_team():
    uid = get_jwt_identity()
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error":"name required"}), 400
    t = Team(
        name=data["name"],
        short_name=data.get("short_name"),
        league=data.get("league"),
        sport=data.get("sport"),
        city=data.get("city"),
        province=data.get("province"),
        owner_id=uid,
    )
    db.session.add(t); db.session.commit()
    return jsonify(team_schema.dump(t)), 201

@bp.patch("/teams/<id>")
@jwt_required()
def update_team(id):
    uid = get_jwt_identity()
    t = db.session.get(Team, id)
    if not t: return jsonify({"error":"not found"}), 404
    if t.owner_id != uid: return jsonify({"error":"forbidden"}), 403
    data = request.get_json() or {}
    for f in ["name","short_name","league","sport","city","province"]:
        if f in data: setattr(t, f, data[f])
    db.session.commit()
    return jsonify(team_schema.dump(t))

@bp.get("/teams/mine")
@bp.get("/teams/my")
@jwt_required()
def my_teams():
    uid = get_jwt_identity()
    q = Team.query.filter_by(owner_id=uid).order_by(Team.created_at.desc())
    return jsonify(teams_schema.dump(q.all()))

@bp.get("/me/following")
@bp.get("/profile/following")
@jwt_required()
def my_following():
    uid = get_jwt_identity()
    rows = db.session.scalars(db.select(FollowTeam).filter_by(user_id=uid)).all()
    ids = [r.team_id for r in rows]
    if not ids: return jsonify([])
    teams = db.session.scalars(db.select(Team).where(Team.id.in_(ids))).all()
    return jsonify(teams_schema.dump(teams))

@bp.post("/teams/<id>/follow")
@jwt_required()
def follow_team(id):
    uid = get_jwt_identity()
    if not db.session.get(Team, id): return jsonify({"error":"not found"}), 404
    if not db.session.get(FollowTeam, {"user_id": uid, "team_id": id}):
        db.session.add(FollowTeam(user_id=uid, team_id=id)); db.session.commit()
    return ("", 204)

@bp.delete("/teams/<id>/follow")
@jwt_required()
def unfollow_team(id):
    uid = get_jwt_identity()
    row = db.session.get(FollowTeam, {"user_id": uid, "team_id": id})
    if row:
        db.session.delete(row); db.session.commit()
    return ("", 204)
