# T051 — Cognitive metrics summary endpoint (7/30/90d) + doctor Metrics tab

**Phase:** 5 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T031, T050

## Read first
- `docs/05-user-stories.md (H2)`
- `docs/03-data-model.md (games)`

## Touches
- `backend/apps/games/analytics.py`
- `frontend/src/features/doctor/metrics`

## Goal
Per-domain trends computed from real sessions, per-session table, and charts, with a clear 'not a diagnosis' boundary and no predicted values.

## Scope (do exactly this)
- `analytics.summary(patient, window)` → per domain (from GameDefinition.cognitive_domains): sessions, mean accuracy, mean RT, mistakes, hints/round, level path, trend direction (slope sign over the window with a minimum of 5 sessions, else 'insufficient data').
- Exclude `guest_mode` sessions; include `completed=false` in counts but not in accuracy means (document).
- Frontend Metrics tab: domain cards, window selector, per-session table, charts; banner text from `pro.disclaimer`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Any prediction or scoring beyond descriptive stats.

## Acceptance criteria
- [ ] Tests with seeded sessions: means correct; guest excluded; <5 sessions → insufficient_data; permissions (caregiver gets limited fields — define a reduced serializer).

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
