# Smārana — Claude Code project instructions

Smārana is a PWA + Django platform for elderly people with memory loss in North-East India. Four roles: Patient, Caregiver, Doctor, Admin. It must work offline for the patient, be gentle in tone, and never generate medical diagnoses.

## How work happens here (non-negotiable)

- Work is done **one task card at a time** from `tasks/`. Never start work that is not on a task card. If something is missing, add it to `tasks/IDEAS.md` and continue.
- Use `/start-task T0XX` to begin and `/finish-task` to close. Use `/handoff` before ending a session.
- Read the docs listed in the task card **before** writing code. Do not re-read the whole `docs/` folder each time.
- Prefer small, complete slices over broad, half-done ones. If a task is too big, split it and note the split in `PROGRESS.md`.
- Ask at most one clarifying question, then make a reasonable assumption and record it under "Assumptions" in `PROGRESS.md`.

## Repository layout

```
backend/      Django 5 + DRF. Apps in backend/apps/<name>/
frontend/     React 18 + TypeScript + Vite + PWA (vite-plugin-pwa). Tailwind.
shared/       Cross-language test vectors (e.g. DDA cases as JSON)
docs/         Specs. Source of truth for behaviour.
tasks/        Task cards. Source of truth for what to do next.
PROGRESS.md   What is done, what is in flight, assumptions made.
```

## Tech decisions (do not relitigate inside a task)

- Backend: Django 5, DRF, PostgreSQL, SimpleJWT auth, django-filter, drf-spectacular for OpenAPI.
- Admin portal MVP = Django Admin (customised). A React admin is a v2 concern.
- Frontend: React + TS + Vite, Tailwind, react-router, TanStack Query, Zustand for UI state, Dexie for IndexedDB, i18next for languages, Workbox via vite-plugin-pwa.
- Offline: outbox pattern. Every client-created record has a client-generated UUID `id` and an `idempotency_key`. See `docs/09-offline-sync-spec.md`.
- DDA: a pure function with identical rules in Python (`backend/apps/games/dda.py`) and TypeScript (`frontend/src/games/dda.ts`), both validated against `shared/dda_cases.json`.
- Voice: Web Speech API (STT + TTS) + rule-based intent router first. LLM fallback is optional and last.
- Tests: pytest + pytest-django (backend), Vitest + React Testing Library (frontend), Playwright for a few smoke flows.

## Coding conventions

Backend
- One Django app per bounded context. Business logic lives in `services.py`, not in views or serializers.
- Every endpoint has an explicit permission class. Object-level checks are done in `get_queryset()` — never trust the client for scoping.
- Every model that a patient can create offline has: `id = UUIDField(primary_key=True, default=uuid4)`, `created_at`, `updated_at`, `device_updated_at`.
- Migrations are committed. `python manage.py makemigrations --check` must be clean.
- Type hints everywhere. `ruff` and `mypy --strict` for `services.py` files.

Frontend
- Feature folders: `src/features/<feature>/{components,hooks,api,store}`.
- All patient-facing text goes through i18next keys. No hard-coded English in patient screens.
- Follow `docs/14-design-system.md`: 64px min touch targets on patient screens, AA contrast, one primary action per screen, icons + short labels.
- Never store auth tokens in localStorage in a way that leaks across roles; use the `authStore` abstraction.
- Components must handle three states: loading, empty, error — with patient-friendly copy.

Both
- Supportive tone in every user-facing message. Never show raw numbers/metrics to patients. Never say "wrong"; say "This is saved as …".
- Conventional commits: `feat(games): …`, `fix(sync): …`, `test(dda): …`, `docs: …`.

## Verification before you say "done"

```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```
Plus whatever the task card lists. A task is not done until all of these pass.

## Things Claude must never do in this repo

- Never auto-generate a clinical diagnosis or medical-sounding label from metrics.
- Never lower a patient's difficulty because of a single bad round.
- Never expose one patient's data to a user who is not assigned to them, even in tests fixtures that "make it easier".
- Never put secrets in the repo. Use `.env` + `.env.example`.
- Never delete data; soft-delete with `is_active`/`deleted_at`.
