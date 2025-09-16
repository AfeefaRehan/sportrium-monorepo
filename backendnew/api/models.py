import uuid
from datetime import datetime, timedelta
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import UniqueConstraint
from .extensions import db

def gen_uuid() -> str:
    return str(uuid.uuid4())

# ----------------- User -----------------
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = db.Column(db.String(255), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(120))
    city = db.Column(db.String(120))
    bio = db.Column(db.Text)
    avatar_url = db.Column(db.Text)
    sports = db.Column(db.JSON)  # list[str]
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

# password reset token
class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False)
    token = db.Column(db.String(64), unique=True, index=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

# ------------- Team & Follow -------------
class Team(db.Model):
    __tablename__ = "teams"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(200), nullable=False)
    short_name = db.Column(db.String(50))
    league = db.Column(db.String(120))
    sport = db.Column(db.String(80))
    city = db.Column(db.String(120))
    province = db.Column(db.String(120))
    owner_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    verified_at = db.Column(db.DateTime, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)

class TeamFollower(db.Model):
    __tablename__ = "team_followers"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False)
    team_id = db.Column(UUID(as_uuid=False), db.ForeignKey("teams.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint('user_id', 'team_id', name='uq_user_team_follow'),)

# ----------------- Event -----------------
class Event(db.Model):
    __tablename__ = "events"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    title = db.Column(db.String(200), nullable=False)
    sport = db.Column(db.String(80), index=True)
    status = db.Column(db.String(20), default="upcoming")  # upcoming|live|finished
    city = db.Column(db.String(120))
    province = db.Column(db.String(120))
    venue = db.Column(db.String(200))
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    starts_at = db.Column(db.DateTime, nullable=False)
    ends_at = db.Column(db.DateTime)
    host_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)


# ----------------- Ticketing ------------------
class TicketType(db.Model):
    __tablename__ = "ticket_types"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    event_id = db.Column(UUID(as_uuid=False), db.ForeignKey("events.id"), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    price_cents = db.Column(db.Integer, nullable=False, default=0)
    currency = db.Column(db.String(10), nullable=False, default="GBP")
    capacity = db.Column(db.Integer, nullable=True)   # None = unlimited
    sold = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

class TicketPurchase(db.Model):
    __tablename__ = "ticket_purchases"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(UUID(as_uuid=False), db.ForeignKey("events.id"), nullable=False, index=True)
    ticket_type_id = db.Column(UUID(as_uuid=False), db.ForeignKey("ticket_types.id"), nullable=True)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    total_cents = db.Column(db.Integer, nullable=False, default=0)
    currency = db.Column(db.String(10), nullable=False, default="GBP")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
# ----------------- Reminders -----------------
class Reminder(db.Model):
    __tablename__ = "reminders"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(UUID(as_uuid=False), db.ForeignKey("events.id"), nullable=False)
    method = db.Column(db.String(20), default="push")  # push|email|sms
    # NEW: send reminder X minutes before event start; fire-once tracking
    offset_minutes = db.Column(db.Integer, nullable=False, default=15)
    delivered_at   = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint('user_id', 'event_id', name='uq_user_event_reminder'),)

# ----------------- Tournament -----------------
class Tournament(db.Model):
    __tablename__ = "tournaments"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(200), nullable=False)
    organizer = db.Column(db.String(200))
    level = db.Column(db.String(80))  # school|college|university|open
    institution_type = db.Column(db.String(80))
    city = db.Column(db.String(120))
    province = db.Column(db.String(120))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

class Registration(db.Model):
    __tablename__ = "registrations"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False)
    tournament_id = db.Column(UUID(as_uuid=False), db.ForeignKey("tournaments.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (UniqueConstraint('user_id', 'tournament_id', name='uq_user_tournament'),)

# ================= NEW TABLES =================
# -------------- Notifications -----------------
class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), index=True, nullable=False)
    type = db.Column(db.String(50), nullable=False)       # e.g. reminder_due|new_follower|new_event|new_tournament
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=True)
    data_json = db.Column(db.JSON, nullable=True)         # deep-link payload: {"entity":"event","eventId": "..."}
    read_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

# ----------------- Push tokens ----------------
class PushToken(db.Model):
    __tablename__ = "push_tokens"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), index=True, nullable=False)
    token = db.Column(db.String(512), unique=True, nullable=False)
    platform = db.Column(db.String(20), nullable=True)    # web|android|ios
    revoked_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

# ---------------- User↔User follow -------------
class UserFollow(db.Model):
    __tablename__ = "user_follows"
    follower_id  = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), primary_key=True)
    following_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), primary_key=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

# --------------- Social identities -------------
class SocialIdentity(db.Model):
    __tablename__ = "social_identities"
    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), index=True, nullable=False)
    provider = db.Column(db.String(20), nullable=False)       # google | facebook
    provider_user_id = db.Column(db.String(191), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    raw_profile_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_provider_uid"),
    )
