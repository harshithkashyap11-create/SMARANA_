# Smārana

Smārana is an offline-capable care and memory-support platform for elderly people in North-East India. The repository is a monorepo with a Django backend and a React/TypeScript PWA frontend.

## Prerequisites

- Git
- Docker Desktop or Docker Engine with Docker Compose
- GNU Make

Node.js 22 and Python 3.12 are supplied by the development containers, so they are not required on the host for the standard workflow.

## Start the development environment

Copy the example environment file if you want to override the safe development defaults:

```sh
cp .env.example .env
```

Build and start every service:

```sh
make up
```

The first build downloads container images and language packages, so it can take a few minutes.

## Development URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend health check | http://localhost:8000/api/v1/health/ |
| Django Admin | http://localhost:8000/admin/ |
| MinIO API | http://localhost:9000 |
| MinIO console | http://localhost:9001 |

The Django admin requires a time-based one-time password. Run `make seed`, then scan
the printed `Admin TOTP setup` URI with an authenticator app. Sign in with the admin
password and the current six-digit code.

For the missing-translations report, sign in at
http://localhost:8000/admin/content/contentitem/missing-translations/ or select
**Missing translations** on the Content items page. Files under
`backend/apps/content/templates/` are Django source templates; opening them as
local browser files displays template directives instead of the admin page.

PostgreSQL and Redis are available to the application containers on the internal Compose network. Every host port and credential used by Docker Compose is documented in `.env.example`.

## Common commands

```sh
make up      # build and start all services
make down    # stop all services
make test    # run the current backend and frontend checks
make lint    # run the current backend and frontend static checks
make seed    # create synthetic demo accounts and care records
```

You can inspect service state and logs directly:

```sh
docker compose ps
docker compose logs -f
```

## Repository layout

```text
backend/            Django backend and Celery processes
frontend/           React/TypeScript PWA
shared/             Cross-language fixtures and test vectors
docs/               Product and engineering specifications
tasks/              Ordered implementation task cards
.github/workflows/  Continuous-integration workflows
```

Development follows one task card at a time. See [the task-card guide](tasks/README.md) before starting a task.

## Run directly on this computer

Phase 10 adds features and polish; the current patient, caregiver, doctor and admin
portals can run independently of it. With Node.js 22+, Python 3.12+ and PostgreSQL
installed, run `make local`. It prepares a separate persistent database and media
folder in `.local/`, applies migrations and seeds demo accounts on the first run.
It does not use your existing application database. Keep the command running; Ctrl+C
stops the local services. Run the same command again to restart with saved data.

Open http://localhost:5173. Demo patient login: **RAO1234**, PIN **1234**.
Caregiver: **priya@example.com**; doctor: **deka@example.com**.
Both use **SmaranaDemo123!**. Admin username is **admin** with the same password;
the authenticator enrollment URI is in `.local/demo-setup.txt`.
Local demo notifications go to the console rather than sending email.

Original illustrative practice packs are bundled for all eight regions. Assam
and Meghalaya meet the configured counts; the other regions have at least five
items per kind. The illustrations and synthesized tones are generic English
practice material, with CC0 attribution. They are not documentary photos or
traditional music. Imported catalogue records remain **draft** until reviewed;
the frontend can use the bundled practice assets while a real catalogue is being
curated. Native-speaker review of translations and culturally specific assets
is a separate human content step before public use.

To verify the actual offline backend round trip with this demo backend running:

```sh
cd frontend
SMARANA_REAL_BACKEND=1 npx playwright test e2e/offline-real.spec.ts
```


## Production deployment

The development Compose setup is not suitable for production. See
[the engineering review and deployment runbook](ENGINEERING_REVIEW.md) for current
release blockers, verified workflows, and the required deployment sequence.
`docker-compose.prod.yml` builds a static frontend and runs Gunicorn/Celery against
externally provisioned PostgreSQL, Redis, private S3 and SMTP, behind HTTPS ingress.
It has not yet been built and validated against those real production services.

## Cognitive game integration

See [the game integration guide](docs/game-integration.md) for all twelve supplied
games, session persistence, daily selection and validation evidence.
The [notebook review](docs/dda-notebook-review.md) explains the optional RF artifact
contract and why the existing deterministic adaptive engine remains the default.
