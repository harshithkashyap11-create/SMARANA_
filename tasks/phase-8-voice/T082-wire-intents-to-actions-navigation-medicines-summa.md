# T082 — Wire intents to actions: navigation, medicines summary, next activity, read-this, slow speech toggle

**Phase:** 8 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T081

## Read first
- `docs/10-voice-assistant-spec.md`

## Touches
- `frontend/src/voice/actions.ts`
- `frontend/src/features/patient/settings`

## Goal
Speaking a command performs the action with confirmation where required; slow-speech toggle in Settings and the sheet persists to profile.

## Scope (do exactly this)
- `actions.ts` mapping intents → router navigation / TTS responses built from repos (offline-capable).
- `set_reminder` creates a patient-sourced RoutineItem for today (new allowed model in sync push: `routine_item` with `source=patient` only — update backend allowlist with validation).
- `call_person` and `sos` go through `ConfirmDialog` with TTS.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Vitest: 'open my memories' navigates; 'call Priya' opens confirm; 'what medicines' speaks a summary from fake repo. Backend test: patient-sourced routine item via push accepted; caregiver-sourced via push rejected.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
