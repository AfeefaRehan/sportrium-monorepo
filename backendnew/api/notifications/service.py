from typing import Iterable, Optional, Dict, Any
from firebase_admin import messaging
from flask import current_app
from ..extensions import db
from ..models import Notification, PushToken

def _make_note(user_id: str, type_: str, title: str, body: Optional[str], data: Optional[Dict[str, Any]]):
    note = Notification(user_id=user_id, type=type_, title=title, body=body or "", data_json=data or {})
    db.session.add(note)
    return note

def deliver_notification(
    user_ids: Iterable[str],
    type_: str,
    title: str,
    body: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None,
    push: bool = True,
):
    user_ids = list({u for u in user_ids if u})
    if not user_ids:
        return []

    notes = []
    for uid in user_ids:
        notes.append(_make_note(uid, type_, title, body, data))
    db.session.commit()

    if push:
        try:
            tokens = db.session.query(PushToken.token)\
                .filter(PushToken.user_id.in_(user_ids), PushToken.revoked_at.is_(None)).all()
            tokens = [t[0] for t in tokens]
            if tokens:
                msg = messaging.MulticastMessage(
                    notification=messaging.Notification(title=title, body=body or ""),
                    data={k: str(v) for k, v in (data or {}).items()},
                    tokens=tokens
                )
                resp = messaging.send_multicast(msg)
                current_app.logger.info(f"FCM sent: success {resp.success_count}, fail {resp.failure_count}")
        except Exception as e:
            current_app.logger.warning(f"Push send failed: {e}")

    return notes
