
Added backend features (no user-frontend design changes required):
- Admin POST /api/admin/v1/events  -> create event (default status=approved)
- Admin POST /api/admin/v1/events/<id>/approve|reject  -> now also send notifications to host
- Admin POST /api/admin/v1/teams/<id>/verify|reject  -> verify/reject with notifications to owner
- Admin GET  /api/admin/v1/users/<id>/activity  -> followers/following/team follows/hosted events/registrations

User/API:
- GET  /api/events/schedule  -> approved upcoming events for schedule page
- POST /api/events/<id>/tickets/purchase  -> create a purchase (and send notifications)
- GET  /api/events/<id>/tickets  -> list purchases

Models:
- Team.verified_at, Team.rejected_at
- TicketType, TicketPurchase

Migration:
- backend/migrations/versions/<timestamp>_admin_events_teams_tickets.py
Run:
    alembic upgrade head   (or)   flask db upgrade
