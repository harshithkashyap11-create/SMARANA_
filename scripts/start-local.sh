#!/usr/bin/env bash
# Start the existing application on the host, using its own persistent demo DB.
set -euo pipefail
cd "$(dirname "$0")/.."
project_root="$PWD"
local_state="$project_root/.local"
mkdir -p "$local_state"
export DJANGO_SETTINGS_MODULE=config.settings.local
export POSTGRES_HOST=127.0.0.1 POSTGRES_PORT="${SMARANA_LOCAL_DB_PORT:-55440}"
export POSTGRES_USER=smarana POSTGRES_DB=smarana_local
export PGHOST="$POSTGRES_HOST" PGPORT="$POSTGRES_PORT" PGUSER="$POSTGRES_USER"
export DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver
export VITE_API_PROXY_TARGET=http://127.0.0.1:8000
if [ ! -x backend/.venv/bin/python ]; then
  python3 -m venv backend/.venv
  backend/.venv/bin/python -m pip install -r backend/requirements.txt
fi
if [ ! -d frontend/node_modules ]; then (cd frontend && npm ci); fi
if [ ! -f "$local_state/postgres/PG_VERSION" ]; then
  initdb -D "$local_state/postgres" -U smarana --auth=trust > "$local_state/initdb.log"
fi
started_database=false
if ! pg_ctl -D "$local_state/postgres" status >/dev/null 2>&1; then
  pg_ctl -D "$local_state/postgres" -l "$local_state/postgres.log" -o "-h 127.0.0.1 -p $POSTGRES_PORT -k /tmp" start
  started_database=true
fi
frontend_pid=""
backend_pid=""
cleanup() {
  [ -z "$frontend_pid" ] || kill "$frontend_pid" 2>/dev/null || true
  [ -z "$backend_pid" ] || kill "$backend_pid" 2>/dev/null || true
  if "$started_database"; then pg_ctl -D "$local_state/postgres" stop -m fast >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT
trap 'exit 0' INT TERM
if ! psql -At -d postgres -c "SELECT datname FROM pg_database WHERE datname='smarana_local'" | rg -q '^smarana_local$'; then
  createdb smarana_local
fi
(cd backend && .venv/bin/python manage.py migrate --noinput)
if [ ! -f "$local_state/seeded" ]; then
  (cd backend && .venv/bin/python manage.py seed_demo) > "$local_state/demo-setup.txt"
  for state in AS ML AR MN MZ NL SK TR; do
    (cd backend && .venv/bin/python manage.py import_content "content/$state")
  done
  touch "$local_state/seeded"
fi
(cd backend && .venv/bin/python manage.py seed_telemetry) > "$local_state/demo-setup.txt"
(cd frontend && npm run build) > "$local_state/build.log" 2>&1
(cd backend && exec .venv/bin/python manage.py runserver 127.0.0.1:8000 --noreload) > "$local_state/backend.log" 2>&1 &
backend_pid=$!
(cd frontend && exec node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5173 --strictPort) > "$local_state/frontend.log" 2>&1 &
frontend_pid=$!
printf 'Smārana: http://localhost:5173\nAdmin: http://localhost:5173/portal/admin\nDemo: RAO1234 / PIN 1234; priya@example.com or deka@example.com / SmaranaDemo123!\nAdmin authenticator setup: .local/demo-setup.txt\n'
wait -n "$backend_pid" "$frontend_pid"
