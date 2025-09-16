from ..models import UserFollow, User
from ..notifications.service import deliver_notification

# inside create_event success branch, after db.session.commit()
# find followers of host (me)
rows = db.session.query(UserFollow.follower_id).filter_by(following_id=me).all()
audience = [r[0] for r in rows]
if audience:
    deliver_notification(audience, "new_event",
        title=f"New event: {event.title}",
        body="A new match was posted",
        data={"entity":"event","eventId": event.id, "sport": event.sport}
    )
