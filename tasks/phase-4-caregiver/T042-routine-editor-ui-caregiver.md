# T042 — Routine editor UI (caregiver)

**Phase:** 4 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T040, T041

## Read first
- `docs/05-user-stories.md (C2)`

## Touches
- `frontend/src/features/caregiver/schedule`

## Goal
Schedule tab: list, create, edit, delete routine items with category icons, time, days-of-week; doctor items shown locked.

## Scope (do exactly this)
- Form with category select (icons), time picker, day chips, note; validation; optimistic update via TanStack Query.
- Doctor-sourced items show a lock and 'Set by Dr. Deka'.
- Changes reflect on the patient device after refresh (sync engine later).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Conflict warnings.

## Acceptance criteria
- [ ] Vitest: create submits correct payload; doctor item has no edit button.
- [ ] Manual: Rao's Today's routine shows the new item.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
