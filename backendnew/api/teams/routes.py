from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Team  # adjust import
# ...

@bp.patch("/<team_id>")
@jwt_required()
def update_team(team_id):
    me = get_jwt_identity()
    t = Team.query.filter_by(id=team_id).first_or_404()
    if str(t.owner_id) != str(me):
        return jsonify({"error":"forbidden"}), 403

    data = request.get_json() or {}
    # allow listed fields only
    allowed = ["name","short_name","sport","city","province","bio","links","logo_url","league"]
    for k in allowed:
        if k in data:
            setattr(t, k, data[k])
    db.session.commit()

    return jsonify({"ok": True, "team": {
        "id": t.id, "name": t.name, "short_name": t.short_name, "sport": t.sport,
        "city": t.city, "province": t.province, "logo_url": getattr(t,"logo_url",None)
    }})
