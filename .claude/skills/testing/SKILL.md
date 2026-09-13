---
name: testing
description: Testing conventions for Smārana (pytest-django, factory_boy, Vitest, React Testing Library, Playwright, shared JSON vectors). Use this whenever writing or fixing tests, when a task's verification commands fail, when adding fixtures, or when you're tempted to skip/xfail a test — which is not allowed here.
---

# Testing

Strategy: `docs/12-testing-and-dod.md`.

## Backend
- `pytest -q` from `backend/`. Settings: `config.settings.test` (SQLite is NOT used; tests run on Postgres via docker or `pytest-postgresql` — keep parity with prod).
- Factories in `apps/shared/tests/factories.py`. Fixtures in `conftest.py`: `api` (APIClient), `care_scenario` (patient, caregiver, doctor, other_patient, other_caregiver, other_doctor, admin), `frozen_now` (freezegun at 2026-09-12 09:00 IST).
- Every endpoint test class has: happy per role, wrong role → 403, unassigned → 404.
- Services are tested directly; views are tested through the API.
- Celery tasks: call the function synchronously in tests (`CELERY_TASK_ALWAYS_EAGER=True`).

## Frontend
- `npm test -- --run`. `renderWithProviders(ui, { role, route, repos })` in `src/test/utils.tsx` provides i18n (en), router, query client, and **fake repos** (in-memory implementations of `db/repo/*`).
- Prefer testing behaviour via RTL queries by role/text; avoid snapshot tests.
- Pure modules (dda.ts, intents, reminderId) have table-driven tests.

## Shared vectors (`shared/*.json`)
Cross-language contracts: `dda_cases.json`, `reminder_id_cases.json`, `intent_cases.json`. A case added on one side must pass on the other before the task is done.

## Playwright (`frontend/e2e/`)
Smoke flows only; seeded via `backend/manage.py seed_demo` (creates Rao, Priya, Dr. Deka, admin, sample content). Run: `npx playwright test`. Keep the suite under 10 minutes.

## Forbidden
`@pytest.mark.skip`, `xfail`, `it.skip`, `test.only` left in, assertions like `assert status in (200, 403)`, `try/except` around assertions, loosening an existing assertion to make a new feature pass. If a test is wrong, fix the test *and explain why in the commit message*.

## When verification fails
1. Read the full failure output; don't guess.
2. Reproduce with the narrowest command (`pytest path::Class::test -q`).
3. Fix the code, not the test, unless the test contradicts the spec — then cite the spec line.
