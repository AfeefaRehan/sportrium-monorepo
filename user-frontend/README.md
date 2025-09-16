# Sportrium client (Vite + React)

## Run
1) npm install
2) npm run dev

# Sportrium Backend (Flask + PostgreSQL)

## 🚀 Quick Start
1) Create virtualenv & install:
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
2) Start Postgres (either your local or `docker-compose up -d db`)

3) Create tables & seed:
flask --app wsgi db init
flask --app wsgi db migrate -m "init"
flask --app wsgi db upgrade
flask --app wsgi seed
4) Run API:
flask --app wsgi run --port 5000

API base: `http://localhost:5000/api/v1`

## 🔗 Frontend integration
Set your React calls to:
- Auth:
  - POST `/api/v1/auth/signup`, `/api/v1/auth/login`
  - GET  `/api/v1/auth/me`
  - POST `/api/v1/auth/forgot`, `/api/v1/auth/reset`
- Profile:
  - GET `/api/v1/me`, PATCH `/api/v1/me`
- Teams:
  - GET `/api/v1/teams?...`, GET `/api/v1/teams/:id`, GET `/api/v1/teams/:id/members`
  - POST `/api/v1/teams` (JWT) — create team
  - GET `/api/v1/teams/mine` (JWT)
  - GET `/api/v1/me/following` (JWT)
  - POST `/api/v1/teams/:id/follow`, DELETE `/api/v1/teams/:id/follow`
- Events:
  - GET `/api/v1/events?...`, GET `/api/v1/events/live`, GET `/api/v1/events/:id`
  - POST `/api/v1/events` (JWT) — host new match
  - GET `/api/v1/events/hosted` (JWT)
  - GET `/api/v1/events/:id/ics` (download calendar)
- Tournaments:
  - GET `/api/v1/tournaments?...`, GET `/api/v1/tournaments/:id`
  - POST `/api/v1/tournaments/:id/register` (JWT)
- Reminders:
  - GET `/api/v1/me/reminders` (JWT)
  - POST `/api/v1/events/:id/reminders` (JWT)
  - DELETE `/api/v1/reminders/:id` (JWT)

Set `VITE_API_BASE=http://localhost:5000` in your frontend and prefix fetches with `${VITE_API_BASE}`.
# Sportrium Backend (Flask + PostgreSQL)

## Install
