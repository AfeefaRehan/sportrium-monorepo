from datetime import datetime, timedelta, timezone
from flask import current_app
from ..extensions import scheduler, db
from ..models import Reminder, Event
from ..notifications.service import deliver_notification

def _now_utc():
    return datetime.utcnow().replace(tzinfo=timezone.utc)

def _due_window():
    now = _now_utc()
    return now - timedelta(minutes=2), now  # 2-min safety window

def check_due_reminders():
    start, end = _due_window()

    rows = db.session.query(Reminder, Event)\
        .join(Event, Reminder.event_id == Event.id)\
        .filter(Reminder.delivered_at.is_(None))\
        .all()

    to_fire = []
    for r, ev in rows:
        ev_start = ev.starts_at
        if not ev_start:
            continue
        trigger_time = ev_start - timedelta(minutes=r.offset_minutes or 15)
        if trigger_time.tzinfo is None:
            trigger_time = trigger_time.replace(tzinfo=timezone.utc)
        if start <= trigger_time <= end:
            to_fire.append((r, ev))

    if not to_fire:
        return

    fired_ids = []
    for r, ev in to_fire:
        title = f"Reminder: {ev.title}"
        body = f"Starts at {ev.starts_at}"
        deliver_notification(
            user_ids=[r.user_id],
            type_="reminder_due",
            title=title,
            body=body,
            data={"entity": "event", "eventId": ev.id}
        )
        fired_ids.append(r.id)

    if fired_ids:
        now = datetime.utcnow()
        Reminder.query.filter(Reminder.id.in_(fired_ids))\
            .update({Reminder.delivered_at: now}, synchronize_session=False)
        db.session.commit()
        current_app.logger.info(f"Reminders delivered: {len(fired_ids)}")

def register_jobs(app):
    # Run jobs inside the Flask app context so db/current_app work
    def _run_check_due_reminders():
        with app.app_context():
            check_due_reminders()

    scheduler.add_job(
        _run_check_due_reminders,
        "interval",
        minutes=1,
        id="reminders_due",
        replace_existing=True,
    )
