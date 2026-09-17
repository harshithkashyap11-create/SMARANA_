# T043 — Memory upload (caregiver) with client-side image compression and people tagging

**Phase:** 4 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T025, T040

## Read first
- `docs/05-user-stories.md (E1)`
- `docs/04-api-contract.md (Memories)`

## Touches
- `backend/apps/memories`
- `frontend/src/features/caregiver/memories`

## Goal
Caregivers create a memory with photos (compressed ≤1600px), title, occasion, date, place, summary, tagged family, visibility.

## Scope (do exactly this)
- Backend `POST memories/` (multipart) + `POST memories/{id}/media/`; validate file type/size (≤ 8 MB), image-only for now; audit.
- Frontend: form + multi-photo picker; `browser-image-compression` before upload; progress; visibility selector with plain-language explanations ('Use in memory questions').

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Video/audio (v1).

## Acceptance criteria
- [ ] Tests: non-image rejected; caregiver of other patient → 404; created memory appears in patient quiz pool when visibility=quiz.
- [ ] Vitest: compression called; payload has tagged people ids.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
