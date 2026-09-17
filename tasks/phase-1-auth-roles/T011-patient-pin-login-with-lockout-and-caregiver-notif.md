# T011 — Patient PIN login with lockout and caregiver notification

**Phase:** 1 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T010

## Read first
- `docs/04-api-contract.md (Auth)`
- `docs/05-user-stories.md (A1)`

## Touches
- `backend/apps/accounts`
- `backend/apps/alerts (stub)`

## Goal
4-digit PIN login by `login_id`, Argon2-hashed, 5 failures → 15-minute lock and an alert to the primary caregiver.

## Scope (do exactly this)
- `PatientCredential` with `pin_hash`, `failed_attempts`, `locked_until`; `services.set_pin`, `services.verify_pin`.
- `POST auth/patient/login/` → tokens (patient refresh lifetime 30d, device-bound) or 423 `code=locked` with `retry_after_seconds`.
- Create `apps/alerts` with `Alert` model (fields from data model) and `services.raise_alert(patient, rule_key, ...)`; raise `pin_lockout` on lock (dedupe: one open alert per rule per patient).
- `POST auth/patient/pin-reset/` for the primary caregiver of that patient (404 otherwise); resets attempts and audits.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Push/email delivery of the alert (T045).
- Offline PIN (T073).

## Acceptance criteria
- [ ] Tests: correct PIN → 200; 5 wrong → 423 and an open `pin_lockout` Alert exists; 6th attempt within window → 423 even with correct PIN; after `locked_until` passes (freezegun) correct PIN works and attempts reset; non-primary caregiver reset → 404.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
