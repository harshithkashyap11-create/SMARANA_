# T023 — Routine items, reminders generation, and patient responses (backend)

**Phase:** 2 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T020

## Read first
- `docs/03-data-model.md (routines)`
- `docs/04-api-contract.md (Routines)`
- `docs/09-offline-sync-spec.md (Offline reminders)`

## Touches
- `backend/apps/routines`

## Goal
RoutineItem/Reminder/ReminderResponse models, deterministic reminder ids, a Celery Beat task that materialises 3 days of reminders, and the respond endpoint.

## Scope (do exactly this)
- Models per data model; `reminder_id_for(routine_item_id, date)` = uuid5 with a fixed namespace constant `SMARANA_NS` (document it in `shared/reminder_id_cases.json` with 5 cases).
- `services.materialise_reminders(patient, from_date, days=3)` idempotent; Celery Beat daily 00:05 IST and on RoutineItem save.
- `GET patients/{id}/reminders/?date=`; `POST patients/{id}/reminders/{rid}/respond/` with `{action, responded_at, idempotency_key}` → creates `ReminderResponse`, updates `Reminder.status`; medicine skip is allowed (confirmation is client-side).
- `Medication` model + `GET medications/` for patient/caregiver (doctor POST comes in T052).
- Status `missed` set by a Beat task 60 min after scheduled_at if still pending.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Caregiver editing UI (T042).
- Conflict detection.

## Acceptance criteria
- [ ] Tests: materialise twice → same ids, no duplicates; respond twice with same idempotency_key → one response; missed task marks only past pending; permissions (patient can respond only to own reminders; caregiver cannot respond).

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
