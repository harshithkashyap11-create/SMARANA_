# T030 — Game engine: session lifecycle, seeded RNG, metrics, persistence, resume

**Phase:** 3 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T021, T023

## Read first
- `docs/08-games-catalog.md`
- `docs/07-dda-spec.md (Fatigue section only)`
- `.claude/skills/cognitive-games/SKILL.md`

## Touches
- `frontend/src/games/engine`
- `frontend/src/games/registry.ts`
- `frontend/src/db/repo/games.ts`
- `backend/apps/games`

## Goal
The shared engine every game plugs into, plus backend models/endpoints for game definitions and sessions (DDA hook stubbed to 'hold').

## Scope (do exactly this)
- Backend: `GameDefinition` (+ admin registration), `GameSession`, `DifficultyState`, `DifficultyChange` models; `GET games/`; `POST patients/{id}/game-sessions/` validating `metrics_schema`, creating state at min_level if absent, returning the contract shape with `change=null`, `message_key='dda.same_next_time'` (DDA arrives in T031/T032). Seed 6 MVP GameDefinitions via data migration.
- Frontend engine: `useGameSession(module)` → start (seed = uuid), round loop, per-round timing, metrics accumulation, `SupportiveEndScreen`, persistence via `db/repo/games.ts` (local write then POST), `resumeState` in Dexie `meta` written after every round; games list page reading `GET games/`.
- A trivial `demo_tap` module used only in tests to exercise the engine.
- Dev override `?level=`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- DDA rules.
- Fatigue detection (T035).
- Real games.

## Acceptance criteria
- [ ] Vitest: engine with `demo_tap` runs N rounds, computes accuracy/mean RT/mistakes/hints correctly on a scripted sequence; resume after unmount restores the same round (same seed).
- [ ] Backend tests: invalid metrics → 400; session creates DifficultyState at min level; permissions.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
