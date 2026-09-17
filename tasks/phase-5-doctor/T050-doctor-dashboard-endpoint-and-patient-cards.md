# T050 — Doctor dashboard endpoint and patient cards

**Phase:** 5 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T012, T044

## Read first
- `docs/04-api-contract.md (doctor/dashboard)`
- `docs/05-user-stories.md (H1)`

## Touches
- `backend/apps/clinical`
- `frontend/src/features/doctor`

## Goal
Doctor landing: assigned patients as cards with flags, last session, engagement; needs-attention list; reviews due (empty until T054).

## Scope (do exactly this)
- Backend `GET doctor/dashboard/` aggregating from selectors; `engagement_status` computed (active/quiet/inactive by last session ≤3d/≤7d/>7d).
- Frontend doctor layout + dashboard grid + patient detail route with sub-tabs (Overview, Metrics, Difficulty, Routine & Medicines, Notes, Alerts, Report).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: only assigned patients; counts correct; unassigned patient detail → 404.
- [ ] Vitest: cards show flags count and last session date.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
