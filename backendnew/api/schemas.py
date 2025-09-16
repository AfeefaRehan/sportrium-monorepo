from marshmallow import Schema, fields

class UserSchema(Schema):
    id = fields.Str()
    email = fields.Email()
    display_name = fields.Str(allow_none=True)
    city = fields.Str(allow_none=True)
    bio = fields.Str(allow_none=True)
    avatar_url = fields.Str(allow_none=True)
    sports = fields.List(fields.Str(), allow_none=True)
    is_admin = fields.Bool()
    created_at = fields.DateTime()

user_schema = UserSchema()
users_schema = UserSchema(many=True)

class TeamSchema(Schema):
    id = fields.Str()
    name = fields.Str()
    short_name = fields.Str(allow_none=True)
    league = fields.Str(allow_none=True)
    sport = fields.Str(allow_none=True)
    city = fields.Str(allow_none=True)
    province = fields.Str(allow_none=True)
    owner_id = fields.Str()
    created_at = fields.DateTime()

team_schema = TeamSchema()
teams_schema = TeamSchema(many=True)

class EventSchema(Schema):
    id = fields.Str()
    title = fields.Str()
    sport = fields.Str()
    status = fields.Str()
    city = fields.Str(allow_none=True)
    province = fields.Str(allow_none=True)
    venue = fields.Str(allow_none=True)
    lat = fields.Float(allow_none=True)
    lng = fields.Float(allow_none=True)
    starts_at = fields.DateTime()
    ends_at = fields.DateTime(allow_none=True)
    host_id = fields.Str()
    created_at = fields.DateTime()

event_schema = EventSchema()
events_schema = EventSchema(many=True)

class TournamentSchema(Schema):
    id = fields.Str()
    name = fields.Str()
    organizer = fields.Str(allow_none=True)
    level = fields.Str(allow_none=True)
    institution_type = fields.Str(allow_none=True)
    city = fields.Str(allow_none=True)
    province = fields.Str(allow_none=True)
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)
    created_at = fields.DateTime()

tournament_schema = TournamentSchema()
tournaments_schema = TournamentSchema(many=True)

class ReminderSchema(Schema):
    id = fields.Str()
    user_id = fields.Str()
    event_id = fields.Str()
    method = fields.Str()
    created_at = fields.DateTime()

reminder_schema = ReminderSchema()
reminders_schema = ReminderSchema(many=True)
