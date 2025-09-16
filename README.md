# Sportrium — Monorepo (Backend + User Frontend + Admin Frontend)

This package is pre-wired so **all three apps run together without path mismatches**.

## Structure
- `backend/` — Flask API
  - Public API at **http://localhost:5000/api** (login, users, teams, events, tournaments, reminders, etc.)
  - CORS open for user frontend origin
- `user-frontend/` — Vite + React app for end-users (dev server **5173**)
- `admin-frontend/` — Vite + React admin panel (dev server **5174**)

## Quick Start

### 0) Requirements
- Python 3.10+
- Node 18+ and pnpm/npm/yarn
- PostgreSQL running locally (or adjust `backend/.env` `DATABASE_URL`)

### 1) Backend (2 processes)
Open **two** terminals:

**Terminal A: public API (port 5000)**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python wsgi.py
```

**Terminal B: admin API (port 5050)**
```bash
cd backend
source .venv/bin/activate                           # Windows: .venv\Scripts\activate
python admin_app.py
```

> Admin API is mounted at **http://localhost:5050/api/admin/v1**

### 2) User Frontend (port 5173)
```bash
cd user-frontend
npm install
npm run dev
```

### 3) Admin Frontend (port 5174)
```bash
cd admin-frontend
npm install
npm run dev
```

## Environment
- `backend/.env` already set with:
  - `API_PREFIX=/api`
  - `FRONTEND_ORIGIN=http://localhost:5173`
  - `ADMIN_FRONTEND_ORIGIN=http://localhost:5174`
- `user-frontend/.env`
  - `VITE_API_URL=http://localhost:5000/api`
- `admin-frontend/.env`
  - `VITE_ADMIN_API_URL=http://localhost:5050/api/admin/v1`

## Admin Login
Use the CLI to create an admin user:
```bash
cd backend
source .venv/bin/activate
python manage.py create-user admin@example.com Admin Adminpass123 --admin
# or, if user exists:
python manage.py set-password admin@example.com NewPass123
```

## Notes
- If you prefer **single-port** backend: move the admin blueprint registration from `admin_app.py` into `api/__init__.py` and remove the separate `admin_app.py`. This monorepo keeps the original design (two ports) to avoid surprises.
- If you see CORS errors, confirm the three origins and ports match your actual dev servers.
