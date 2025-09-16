from datetime import datetime
from textwrap import dedent

def event_to_ics(ev):
    # ev: dict-like with starts_at, ends_at, title, venue, city
    dt_start = ev.get("starts_at")
    dt_end = ev.get("ends_at")
    def to_ics(dt: datetime):
        return dt.strftime("%Y%m%dT%H%M%SZ")
    title = ev.get("title", "Sportrium Event")
    loc = ", ".join([x for x in [ev.get("venue"), ev.get("city")] if x])
    uid = ev.get("id", "sportrium")
    body = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sportrium//EN
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{to_ics(dt_start)}
DTSTART:{to_ics(dt_start)}
DTEND:{to_ics(dt_end or dt_start)}
SUMMARY:{title}
LOCATION:{loc}
END:VEVENT
END:VCALENDAR
"""
    return dedent(body).strip()
