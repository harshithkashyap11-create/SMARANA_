# T031 — DDA pure function in Python + shared test vectors

**Phase:** 3 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T030

## Read first
- `docs/07-dda-spec.md`
- `.claude/skills/dda-engine/SKILL.md`

## Touches
- `backend/apps/games/dda.py`
- `shared/dda_cases.json`

## Goal
`dda.next()` implemented exactly per spec in Python with ≥20 shared vectors, wired into `save_session`.

## Scope (do exactly this)
- `dda.py` with dataclasses for state/session/config/result; explanations as specified.
- `shared/dda_cases.json` with the minimum 20 named cases from the spec.
- `tests/test_dda_vectors.py` iterating the file; `services.save_session` now calls DDA, persists state/change, returns `message_key`.
- Window cleared after any level change.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- TypeScript port (T032).
- Doctor overrides (T053).

## Acceptance criteria
- [ ] All vectors pass; 100% branch coverage on `dda.py`; API test: 3 poor sessions with worsening RT → level drops with the exact explanation string; 4th poor session (fresh window) → no change.

## Verification
```
cd backend && ruff check . && pytest -q
cd backend && pytest apps/games -q --cov=apps/games/dda.py --cov-branch --cov-fail-under=100
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
