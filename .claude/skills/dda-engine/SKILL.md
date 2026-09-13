---
name: dda-engine
description: The Smārana Dynamic Difficulty Adjustment (DDA) engine — rules, message keys, doctor overrides, and the shared Python/TypeScript test vectors. Use this whenever a task mentions difficulty, levels, DDA, promote/demote, challenge mode, fatigue holds, doctor lock/cap, or supportive end-of-game messages, and whenever a game session is saved (the DDA runs then).
---

# DDA engine

Authoritative rules: `docs/07-dda-spec.md`. Read it. Key facts to keep straight:

- **Pure function** `next(state, session, config) -> {state, change, messageKey}`. No clock, no randomness, no DB inside.
- Two implementations that must agree: `backend/apps/games/dda.py` and `frontend/src/games/dda.ts`. Both are tested against `shared/dda_cases.json`. **Any rule change = update spec + both implementations + vectors, in one task.**
- Window of 3 sessions. Change at most ±1 level, then the window is cleared. So no more than one change per 3 completed sessions.
- Rule order: guest → append → doctor lock → insufficient data → fatigue hold → demote → promote → hold.
- A single bad, tired, or abandoned session **never** demotes.
- Doctor `cap` beats promotion. `min/max` from `GameDefinition`.
- Patients see only `messageKey` copy. Professionals see `explanation`.

## When saving a session (server, `apps/games/services.py`)
```
save_session(patient, payload) -> (session, state, change, message_key)
  1. validate metrics against GameDefinition.metrics_schema
  2. load DifficultyState (create at min_level if absent)
  3. result = dda.next(state, summary, config)
  4. persist session; persist state; persist DifficultyChange if level changed or reasonCode in {doctor_lock, cap}
  5. audit(actor=patient.user, "create", session, patient)
  6. return
```
Client (`games/engine/endSession.ts`) does the same with `dda.ts` and writes to Dexie + outbox; on sync the server result wins.

## Adding a test vector
Append to `shared/dda_cases.json`:
```json
{"name":"demote_when_rt_worsens","state":{...},"session":{...},"config":{...},"expected":{"level":2,"reasonCode":"demote","messageKey":"dda.easier_next_time"}}
```
Both test files iterate the file; no per-case code needed.

## Overrides (doctor)
`apps/clinical/services.py: apply_dda_override(doctor, patient, game, action, value, reason)` → mutates state, writes `DifficultyChange(reason_code=doctor_*|cap)`, `DdaOverride`, and audit. Never call `dda.next` from an override.
