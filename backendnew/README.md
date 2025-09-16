# Sportrium Backend (Flask + PostgreSQL)

## Quick Start
1) **Start Postgres** (or use your own):
```bash
docker compose up -d db
```
2) **Create venv & install:**
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```
3) **Run the API:**
```bash
export FLASK_APP=wsgi.py
flask run  # serves on http://localhost:5000
```
> (Optional) `flask create-db` for quick tables, or add Flask-Migrate if you want migrations.

## Endpoints (prefix defaults to `/api`)
- **Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/forgot`, `POST /auth/reset`
- **Users**: `GET /me`, `PATCH /me`
- **Teams**: `GET /teams`, `GET /teams/:id`, `POST /teams` (JWT), `GET /teams/mine` (JWT), `POST/DELETE /teams/:id/follow` (JWT)
- **Events**: `GET /events`, `GET /events/live`, `GET /events/:id`, `POST /events` (JWT), `GET /events/hosted` (JWT), `GET /events/:id/ics`
- **Tournaments**: `GET /tournaments`, `GET /tournaments/:id`, `POST /tournaments/:id/register` (JWT)
- **Reminders**: `GET /me/reminders` (JWT), `POST /events/:id/reminders` (JWT), `DELETE /reminders/:id` (JWT)

## Frontend integration
In your React (Vite) app:
- Set **`.env`** in the frontend root:
```
VITE_API_URL=http://localhost:5000/api
```
- Your `src/lib/api.js` already builds requests relative to this.

## CORS
Development is open (`*`) for `/api/*`. For production, set `FRONTEND_ORIGIN` and tighten CORS rules in `extensions.py` if needed.
