from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Tournament, Registration
from ..schemas import tournament_schema, tournaments_schema

bp = Blueprint("tournaments", __name__)

@bp.get("/tournaments")
def list_tournaments():
    q = Tournament.query
    for attr in ["city", "province", "level", "institution_type"]:
        v = request.args.get(attr)
        if v: q = q.filter(getattr(Tournament, attr) == v)
    page = int(request.args.get("page", 1))
    size = int(request.args.get("page_size", 20))
    items = q.order_by(Tournament.start_date.asc().nulls_last()).paginate(page=page, per_page=size, error_out=False)
    return jsonify({"items": tournaments_schema.dump(items.items), "page": page, "page_size": size, "total": items.total})

@bp.get("/tournaments/<id>")
def get_tournament(id):
    t = db.session.get(Tournament, id)
    if not t: return jsonify({"error":"not found"}), 404
    return jsonify(tournament_schema.dump(t))

@bp.post("/tournaments/<id>/register")
@jwt_required()
def register(id):
    uid = get_jwt_identity()
    if not db.session.get(Tournament, id):
        return jsonify({"error":"not found"}), 404
    reg = Registration.query.filter_by(user_id=uid, tournament_id=id).first()
    if reg:
        return jsonify({"ok": True})  # idempotent
    db.session.add(Registration(user_id=uid, tournament_id=id))
    db.session.commit()
    return jsonify({"ok": True})
