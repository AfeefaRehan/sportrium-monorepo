import sys
from flask import current_app

def send_email(to: str, subject: str, body: str):
    # In dev, just print to console. Plug real SMTP if desired.
    app = current_app
    print(f"[DEV EMAIL] to={to} subject={subject}\n{body}", file=sys.stderr)
    return True
