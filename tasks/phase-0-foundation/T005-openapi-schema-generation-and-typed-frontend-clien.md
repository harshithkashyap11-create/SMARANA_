# T005 — OpenAPI schema generation and typed frontend client

**Phase:** 0 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T002, T003

## Read first
- `docs/04-api-contract.md`

## Touches
- `backend/config/urls.py`
- `frontend/src/api`

## Goal
drf-spectacular schema at `/api/schema/` and an orval-generated TS client so the frontend never hand-types API shapes.

## Scope (do exactly this)
- Configure drf-spectacular (title, version, servers). `python manage.py spectacular --file schema.yml` committed.
- Frontend `orval.config.ts` generating `src/api/generated` with a custom `mutator` (`api/client.ts`) that injects the bearer token and handles refresh (stubbed for now).
- `npm run api:gen` script; generated code is committed.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Any real endpoints.

## Acceptance criteria
- [ ] `npm run api:gen` regenerates without diff when schema unchanged.
- [ ] `health` client function is used by the Home route instead of raw fetch.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
cd frontend && npm run api:gen && git diff --exit-code src/api/generated
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
