# T001 — Repository skeleton and Docker Compose

**Phase:** 0 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** none

## Read first
- `docs/02-architecture.md`

## Touches
- `/ (new)`

## Goal
A monorepo that starts with one command and has the folder layout from the architecture doc.

## Scope (do exactly this)
- Create `backend/`, `frontend/`, `shared/`, `.github/workflows/`, `.env.example`, `docker-compose.yml`, `Makefile` (targets: up, down, test, lint, seed).
- Compose services: `db` (postgres:16), `redis`, `minio` + `createbuckets`, `backend`, `celery`, `celery-beat`, `frontend` (vite dev server). Healthchecks on db/redis.
- `backend/Dockerfile` (python:3.12-slim, non-root) and `frontend/Dockerfile` (node:20). `.dockerignore` files.
- README.md at repo root: prerequisites, `make up`, URLs, how to run tests, link to `tasks/README.md`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Any Django app code beyond `manage.py`/`config`.
- Production compose / nginx.

## Acceptance criteria
- [ ] `docker compose up` brings all services healthy within 2 minutes on a laptop.
- [ ] `make test` and `make lint` exist and run (may be trivially green for now).
- [ ] `.env.example` documents every variable read by compose.

## Verification
```
docker compose config --quiet
docker compose up -d && docker compose ps
```

## Notes
Keep the compose file boring. No profiles, no overrides yet.

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
