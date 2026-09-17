# Upgrade baseline (before implementation)

2026-09-17: reviewed the existing audit, browser STT/TTS, loop, conversation, router,
TalkButton, action executor, repositories, game catalog/components, and Django providers.

- Full frontend: 315 passed, 1 failed. Legacy catalog exported 9 modules instead of 12.
- Typecheck and production build: failed with 12 incompatible game component casts,
  plus two possibly-undefined callbacks in the previously added audit probes.
- Backend voice: 9 passed, 6 database setup errors (hostname `db` unavailable).
- Existing UI probes reproduced action-after-close and overlapping typed calls.
- Audit matrix baseline: 24/46 intents, 21/46 complete entities, 3/12 canonical games,
  0/7 alternate games. Existing audit report is preserved as historical evidence.

No real microphone, speaker playback or successful local inference was established
by these tests. Target-device acceptance remains necessary after implementation.
