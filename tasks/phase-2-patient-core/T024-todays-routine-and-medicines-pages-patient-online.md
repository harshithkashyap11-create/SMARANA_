# T024 — Today's Routine and Medicines pages (patient, online)

**Phase:** 2 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T023, T021

## Read first
- `docs/05-user-stories.md (C1)`
- `docs/14-design-system.md`

## Touches
- `frontend/src/features/patient/routine`
- `frontend/src/features/patient/medicines`
- `frontend/src/db/repo/routine.ts`

## Goal
Reminder cards with Taken / Remind me later / Skip / I need help; medicines page (read-only) with next dose.

## Scope (do exactly this)
- `db/repo/routine.ts` (Dexie tables `routineItems`, `reminders`, `reminderResponses`; network refresh) and `respond(reminderId, action)` writing locally then POSTing (outbox comes in T070 — for now direct POST with local write first).
- `ReminderCard` with 4 big buttons; Skip on medicine → `ConfirmDialog`; Later → snooze 15 min; `I need help` → marks help and shows caregiver call button.
- Undo toast (8s) after Taken.
- Medicines page: list with dose/time/instructions, next dose highlighted, 'Ask Priya' call button.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Offline queueing (T070).

## Acceptance criteria
- [ ] Vitest: Skip on medicine opens confirm; Taken shows undo; fake repo receives respond call.
- [ ] Manual: respond → caregiver DB reflects status.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
