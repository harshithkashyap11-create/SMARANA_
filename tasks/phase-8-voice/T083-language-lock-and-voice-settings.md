# T083 — Language lock and voice settings

**Phase:** 8 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T082, T015

## Read first
- `docs/10-voice-assistant-spec.md (Language lock)`

## Touches
- `frontend/src/features/patient/settings`

## Goal
Padlock toggle preventing accidental language change (UI and voice); persisted in accessibility settings.

## Scope (do exactly this)
- Settings page for patient: language (with lock), text size, theme, slow speech, replay instructions placeholder.
- When locked: selector disabled with explanation; voice 'switch language' ignored with spoken reply.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Vitest: locked → selector disabled; router ignores language intent.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
