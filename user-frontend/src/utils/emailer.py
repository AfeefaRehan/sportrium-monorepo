import smtplib
from email.message import EmailMessage
from flask import current_app

def send_email(to: str, subject: str, html: str):
    cfg = current_app.config
    msg = EmailMessage()
    msg["From"] = cfg["SMTP_FROM"]
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(html, subtype="html")

    with smtplib.SMTP(cfg["SMTP_HOST"], cfg["SMTP_PORT"]) as s:
        if cfg.get("SMTP_USER") and cfg.get("SMTP_PASS"):
            s.starttls()
            s.login(cfg["SMTP_USER"], cfg["SMTP_PASS"])
        s.send_message(msg)
