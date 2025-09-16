# src/app/models.py
import uuid
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID, ARRAY
from .extensions import db


def gen_uuid() -> str:
    """Return a string UUID (works well with UUID(as_uuid=False))."""
    return str(uuid.uuid4())


# -------------------------
# Core domain models
# -------------------------

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    display_name = db.Column(db.String(120))
    city = db.Column(db.String(120))
    bio = db.Column(db.Text)
    avatar_url = db.Column(db.Text)
    # Postgres-only; fine because you’re using pg8000/PostgreSQL
    sports = db.Column(ARRAY(db.String()), default=list)

    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Convenience relationships (optional but handy in queries)
    teams_owned = db.relationship(
        "Team", backref="owner", lazy=True, foreign_keys="Team.owner_id"
    )
    events_hosted = db.relationship(
        "Event", backref="host", lazy=True, foreign_keys="Event.host_id"
    )

    def __repr__(self) -> str:
        return f"<User {self.email}>"


class Team(db.Model):
    __tablename__ = "teams"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(200), nullable=False)
    short_name = db.Column(db.String(50))
    league = db.Column(db.String(120))
    sport = db.Column(db.String(80))
    city = db.Column(db.String(120))
    province = db.Column(db.String(120))

    owner_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False, index=True
    )

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Team {self.name}>"


class TeamMember(db.Model):
    __tablename__ = "team_members"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    team_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("teams.id"), nullable=False, index=True
    )
    user_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False, index=True
    )
    role = db.Column(db.String(40), nullable=False, default="player")
    joined_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("team_id", "user_id", name="uq_team_user"),)


class Tournament(db.Model):
    __tablename__ = "tournaments"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = db.Column(db.String(255), nullable=False)
    organizer = db.Column(db.String(255))
    level = db.Column(db.String(80))
    institution_type = db.Column(db.String(80))
    city = db.Column(db.String(120))
    province = db.Column(db.String(120))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)

    def __repr__(self) -> str:
        return f"<Tournament {self.name}>"


class TournamentRegistration(db.Model):
    __tablename__ = "tournament_registrations"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    tournament_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("tournaments.id"), nullable=False, index=True
    )
    team_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("teams.id"), nullable=False, index=True
    )
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("tournament_id", "team_id", name="uq_tourn_team"),
    )


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    slug = db.Column(db.String(255), unique=True, index=True)

    title = db.Column(db.String(255), nullable=False)
    sport = db.Column(db.String(80))
    level = db.Column(db.String(80))
    institution_type = db.Column(db.String(80))

    host_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False, index=True
    )
    tournament_id = db.Column(UUID(as_uuid=False), db.ForeignKey("tournaments.id"))
    team_a_id = db.Column(UUID(as_uuid=False), db.ForeignKey("teams.id"))
    team_b_id = db.Column(UUID(as_uuid=False), db.ForeignKey("teams.id"))

    venue = db.Column(db.String(255))
    city = db.Column(db.String(120))
    province = db.Column(db.String(120))

    starts_at = db.Column(db.DateTime, nullable=False, index=True)
    ends_at = db.Column(db.DateTime)

    # scheduled | live | finished | cancelled
    status = db.Column(db.String(20), nullable=False, default="scheduled")

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class FollowTeam(db.Model):
    __tablename__ = "follow_teams"

    user_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("users.id"), primary_key=True
    )
    team_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("teams.id"), primary_key=True
    )


class Reminder(db.Model):
    __tablename__ = "reminders"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False, index=True
    )
    event_id = db.Column(
        UUID(as_uuid=False), db.ForeignKey("events.id"), nullable=False, index=True
    )
    method = db.Column(db.String(20), nullable=False, default="email")
    offset_minutes = db.Column(db.Integer, nullable=False, default=60)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "event_id", "method", name="uq_user_event_method"),
    )


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    id = db.Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = db.Column(UUID(as_uuid=False), db.ForeignKey("users.id"), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
