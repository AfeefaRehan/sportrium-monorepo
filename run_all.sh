#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
# backend public
( cd "$here/backend" && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python wsgi.py ) &
sleep 1
# backend admin
( cd "$here/backend" && source .venv/bin/activate && python admin_app.py ) &
sleep 1
# user frontend
( cd "$here/user-frontend" && npm i && npm run dev ) &
sleep 1
# admin frontend
( cd "$here/admin-frontend" && npm i && npm run dev ) &
wait
