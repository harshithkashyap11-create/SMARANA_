# T026 — Memory quiz question generation (backend)

**Phase:** 2 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T025

## Read first
- `docs/04-api-contract.md (memory-quiz)`
- `docs/05-user-stories.md (E3)`

## Touches
- `backend/apps/memories`

## Goal
`GET memory-quiz/next/` returns a gentle question with 3 options drawn from the patient's own data; `POST attempts/` records it.

## Scope (do exactly this)
- Question types: `who` (options = 3 FamilyMembers incl. correct), `when` (year/occasion date vs 2 nearby), `where` (place vs 2 other known_places/places), `occasion`. Prefer memories with visibility=quiz and consent `use_memories_in_quiz`.
- Selection: least-recently-asked first; avoid repeating the same memory within 5 questions (track via attempts).
- `MemoryQuizAttempt` (OfflineCapable) with idempotent create; response includes `feedback_key` (`quiz.correct` / `quiz.saved_as`) and `expected_label`.
- Fallback question when data is thin: `who` from FamilyMembers only (no memory).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Frontend (T027).

## Acceptance criteria
- [ ] Tests: options always contain exactly one correct; no repeat within 5; consent off → only family questions; idempotent attempts.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
