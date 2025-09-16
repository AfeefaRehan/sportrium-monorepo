from datetime import datetime, timezone

def to_ics_dt(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def event_to_ics(event, host_email="no-reply@sportrium.local"):
    uid = f"{event.id}@sportrium"
    start = to_ics_dt(event.starts_at)
    end = to_ics_dt(event.ends_at or event.starts_at)
    title = event.title.replace("\n", " ")
    loc = (event.venue or "") + (", " + event.city if event.city else "")
    return f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sportrium//EN
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{start}
DTSTART:{start}
DTEND:{end}
SUMMARY:{title}
LOCATION:{loc}
END:VEVENT
END:VCALENDAR
"""
