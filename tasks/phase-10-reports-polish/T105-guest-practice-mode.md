# T105 — Guest practice mode

**Phase:** 10 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T032

## Read first
- `docs/05-user-stories.md (D6)`

## Touches
- `frontend/src/features/patient/games`
- `backend/apps/games`

## Goal
A 'Try a game (practice)' entry that runs any game without affecting DDA, metrics, or progress.

## Scope (do exactly this)
- `guest_mode=true` sessions; excluded in analytics (already) and DDA (already); progress summary excludes; UI banner 'Practice — nothing is saved to Rao's progress'.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [x] Tests: guest session leaves DifficultyState untouched; analytics unchanged.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [x] `/review-task` verdict READY
- [x] `/finish-task` run (PROGRESS.md updated, committed)

## Implementation evidence
Backend `test_guest_preserves_existing_and_absent_difficulty` verifies no state creation or timestamp/window/level change and unchanged analytics/doctor engagement. Caregiver practice is assignment-scoped. Frontend `phase10.test.tsx` verifies guest persistence without touching the normal resume.

Verification: backend Ruff, 137 PostgreSQL tests and migration check; frontend lint, typecheck, 189 tests, locale/copy checks and production build. Committed with `feat(care): complete T100-T108 and offline content hardening`.
