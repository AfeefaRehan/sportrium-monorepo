rows = db.session.query(UserFollow.follower_id).filter_by(following_id=me).all()
audience = [r[0] for r in rows]
if audience:
    deliver_notification(audience, "new_tournament",
        title=f"New tournament: {tournament.title}",
        body="A new tournament is live",
        data={"entity":"tournament","tournamentId": tournament.id, "sport": tournament.sport}
    )
