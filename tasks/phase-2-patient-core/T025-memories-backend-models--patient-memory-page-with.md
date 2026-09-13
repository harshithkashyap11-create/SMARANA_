# T025 — Memories: backend models + patient memory page with Read-to-me

**Phase:** 2 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T020, T023b

## Read first
- `docs/03-data-model.md (memories)`
- `docs/04-api-contract.md (Memories)`
- `docs/05-user-stories.md (E2)`

## Touches
- `backend/apps/memories`
- `frontend/src/features/patient/memories`

## Goal
Memory + MemoryMedia models with visibility, list/detail endpoints respecting visibility and consent, and the patient page with photo strip and TTS summary.

## Scope (do exactly this)
- Backend models + `GET patients/{id}/memories/` (patient: private+quiz+care_team; doctor: care_team only and `share_memories_with_doctor`; caregiver: all).
- Frontend `db/repo/memories.ts`; list of memory cards (cover photo, title, occasion icon, date); detail with `PhotoStrip`, large summary, 'Read to me' (useTts), tagged people chips.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Uploads (T043).
- Video (v1).

## Acceptance criteria
- [ ] Tests: doctor cannot see `quiz`-visibility memories; doctor sees nothing when consent off; patient sees own only.
- [ ] Vitest: Read to me speaks the summary via fake TTS.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
