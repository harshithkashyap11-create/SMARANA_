#!/usr/bin/env bash
# Start the existing application on the host, using its own persistent demo DB.
set -euo pipefail
cd "$(dirname "$0")/.."
project_root="$PWD"
local_state="$project_root/.local"
frontend_port="${SMARANA_FRONTEND_PORT:-5173}"
backend_port="${SMARANA_BACKEND_PORT:-8000}"
for command in node npm initdb pg_ctl psql createdb rg curl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing required command: %s. See docs/pre-release-audit.md.\n' "$command" >&2
    exit 1
  fi
done
# Fail before seeding or rebuilding if either requested port belongs to another app.
node - "$frontend_port" "$backend_port" <<'JS'
const net = require('node:net');
(async () => {
  for (const port of process.argv.slice(2)) {
    await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.once('error', reject);
      server.listen(Number(port), '127.0.0.1', () => server.close(resolve));
    });
  }
})().catch(error => {
  console.error(`Requested application port is unavailable: ${error.message}`);
  process.exitCode = 1;
});
JS
mkdir -p "$local_state"
export DJANGO_SETTINGS_MODULE=config.settings.local
export POSTGRES_HOST=127.0.0.1 POSTGRES_PORT="${SMARANA_LOCAL_DB_PORT:-55440}"
export POSTGRES_USER=smarana POSTGRES_DB=smarana_local
export PGHOST="$POSTGRES_HOST" PGPORT="$POSTGRES_PORT" PGUSER="$POSTGRES_USER"
export DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,testserver
export VITE_API_PROXY_TARGET="http://127.0.0.1:$backend_port"
demo_python="${SMARANA_DEMO_PYTHON:-$project_root/backend/.venv-dda/bin/python}"
if [ ! -x "$demo_python" ]; then
  printf 'Install the demo environment first: see docs/hackathon-dda-demo.md\n' >&2
  exit 1
fi
"$demo_python" -c 'import sklearn, pandas, joblib; assert sklearn.__version__ == "1.6.1"'
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
(cd backend && "$demo_python" manage.py migrate --noinput)
if [ ! -f "$local_state/seeded" ]; then
  (cd backend && "$demo_python" manage.py seed_demo) > "$local_state/demo-setup.txt"
  for state in AS ML AR MN MZ NL SK TR; do
    (cd backend && "$demo_python" manage.py import_content "content/$state")
  done
  touch "$local_state/seeded"
fi
if [ ! -f "$local_state/telemetry-seeded" ]; then
  (cd backend && "$demo_python" manage.py seed_telemetry) > "$local_state/demo-setup.txt"
  touch "$local_state/telemetry-seeded"
fi
(cd backend && "$demo_python" manage.py validate_dda_model)
(cd backend && "$demo_python" manage.py seed_dda_demo)
(cd frontend && npm run build) > "$local_state/build.log" 2>&1
(cd backend && exec "$demo_python" manage.py runserver "127.0.0.1:$backend_port" --noreload) > "$local_state/backend.log" 2>&1 &
backend_pid=$!
(cd frontend && exec node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port "$frontend_port" --strictPort) > "$local_state/frontend.log" 2>&1 &
frontend_pid=$!
ready=false
for attempt in $(seq 1 60); do
  if ! kill -0 "$backend_pid" 2>/dev/null || ! kill -0 "$frontend_pid" 2>/dev/null; then
    printf 'Application startup failed. See .local/backend.log and .local/frontend.log.\n' >&2
    exit 1
  fi
  if curl --silent --fail "http://127.0.0.1:$backend_port/api/v1/health/" >/dev/null &&
     curl --silent --fail "http://127.0.0.1:$frontend_port/" >/dev/null; then
    ready=true
    break
  fi
  sleep 1
done
if ! "$ready"; then
  printf 'Application startup timed out. See .local/backend.log and .local/frontend.log.\n' >&2
  exit 1
fi
printf 'Smārana: http://127.0.0.1:%s\nAdmin: http://127.0.0.1:%s/portal/admin\nDemo: RAO1234 / PIN 1234; priya@example.com, deka@example.com or admin / SmaranaDemo123!\n' "$frontend_port" "$frontend_port"
wait -n "$backend_pid" "$frontend_pid"
