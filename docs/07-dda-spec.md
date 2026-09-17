# 07 — Dynamic Difficulty Adjustment (DDA) Spec

The DDA is a **pure, deterministic function**. Same inputs → same output, in Python and TypeScript. No randomness, no clock reads inside the function (timestamps are inputs).

## Signature

```
next(state: DifficultyState, session: SessionSummary, config: DdaConfig) -> DdaResult
```

```ts
type SessionSummary = {
  level: number;            // level the session was played at
  accuracy: number;         // 0..1
  meanReactionMs: number;
  mistakes: number;
  hintsUsed: number;
  rounds: number;
  completed: boolean;       // false if abandoned
  challengeMode: boolean;   // played at +1 due to toggle
  guestMode: boolean;
  fatigueFlagged: boolean;  // break prompt was shown/accepted this session
};

type DifficultyState = {
  level: number;                 // current base level
  window: SessionSummary[];      // last N sessions (N = config.windowSize), oldest first
  lockedByDoctor: boolean;
  capLevel: number | null;       // doctor cap
  minLevel: number; maxLevel: number;   // from GameDefinition
};

type DdaConfig = {
  windowSize: 3;
  promoteAccuracy: 0.85;   // all sessions in window ≥ this
  demoteAccuracy: 0.60;    // all sessions in window < this
  reactionWorsenRatio: 1.25; // latest mean RT / window mean RT ≥ this counts as "slower"
  hintPenaltyPerRound: 0.5;  // hints/rounds ≥ this blocks promotion
};

type DdaResult = {
  state: DifficultyState;   // new state (window updated, level maybe changed)
  change: {
    fromLevel: number; toLevel: number;
    reasonCode: 'promote'|'hold'|'demote'|'doctor_lock'|'cap'|'insufficient_data'|'guest'|'fatigue_hold';
    explanation: string;    // English sentence for professionals
  } | null;                 // null when level unchanged and reason is 'hold' (still returns reasonCode in state? no — see below)
  messageKey: 'dda.harder_next_time' | 'dda.same_next_time' | 'dda.easier_next_time' | 'dda.thanks_for_playing';
};
```

Note: `change` is **always** returned (even for holds) so that doctors can see reasoning per session; `fromLevel === toLevel` for holds. Persist as `DifficultyChange` only when `fromLevel !== toLevel` **or** reasonCode ∈ {`doctor_lock`, `cap`} (those are informative).

## Rules, in order (first match wins)

1. **Guest mode** → no state change. `reasonCode: 'guest'`, message `dda.thanks_for_playing`. Session is not added to window.
2. **Challenge-mode session** → the session is recorded in the window with its `level` (base+1) but is evaluated against *its own* level; level changes still apply to base level. (Simplification: treat it like any session. Challenge mode is a UI-side +1 that does not persist.)
3. **Append session to window**, keeping only the last `windowSize`.
4. **Doctor lock** → `hold`, `reasonCode: 'doctor_lock'`, explanation "Difficulty is locked by Dr. <name>." Message `dda.same_next_time`.
5. **Insufficient data** (window length < windowSize) → `hold`, `reasonCode: 'insufficient_data'`, message `dda.same_next_time`.
6. **Fatigue hold**: if the latest session has `fatigueFlagged` or `completed === false` → `hold`, `reasonCode: 'fatigue_hold'`, explanation "Held because the latest session was cut short or a break was suggested." Message `dda.thanks_for_playing`. *A single tired session never demotes.*
7. **Demote** if **all** sessions in window have `accuracy < demoteAccuracy` **and** at least one of: (a) latest `meanReactionMs` ≥ `reactionWorsenRatio` × mean of the earlier window sessions' RT, or (b) latest `mistakes ≥ rounds / 2`. → `toLevel = max(minLevel, level - 1)`. Explanation: "Accuracy stayed under 60% across 3 rounds while reaction time increased." (or "... while mistakes were frequent."). Message `dda.easier_next_time`.
8. **Promote** if **all** sessions in window have `accuracy ≥ promoteAccuracy` **and** `hintsUsed / rounds < hintPenaltyPerRound` for each **and** latest RT ≤ 1.1 × window mean RT. → `toLevel = min(maxLevel, capLevel ?? maxLevel, level + 1)`. If capped: `reasonCode: 'cap'`, explanation "Reached the doctor-set cap of level N." Message `dda.harder_next_time` (or `same_next_time` if capped).
9. Otherwise **hold**, `reasonCode: 'hold'`, explanation "Performance within target range." Message `dda.same_next_time`.
10. **After any level change, clear the window** (start a fresh evaluation at the new level). This guarantees at most one change per 3 sessions.

## Supportive message copy (patient-facing, via i18n keys)

| key | en |
|---|---|
| dda.harder_next_time | Great job! Next time will be a little more interesting. |
| dda.same_next_time | Nice work. Same fun next time. |
| dda.easier_next_time | Today's game will be a bit easier so you can enjoy playing. |
| dda.thanks_for_playing | Thanks for playing. Rest whenever you like. |

Patients never see level numbers or the explanation string.

## Shared test vectors

`shared/dda_cases.json` — array of `{name, state, session, config, expected: {level, reasonCode, messageKey}}`. Both `backend/apps/games/tests/test_dda_vectors.py` and `frontend/src/games/dda.vectors.test.ts` load this file and assert. **Minimum 20 cases**, including: promote at cap, demote at min, lock, guest, fatigue hold, insufficient data, boundary accuracy exactly 0.60 and 0.85, hints blocking promotion, RT ratio exactly 1.25, window clearing after change.

## Doctor overrides (outside the function)

`set_level` replaces `level` and clears window. `lock`/`unlock` set `lockedByDoctor`. `cap` sets `capLevel` and if `level > capLevel`, sets `level = capLevel` with a `cap` change. All produce `DifficultyChange` + `AuditEvent`.

## Fatigue detection (separate from DDA, in the game engine)

During a session, prompt a break when any of:
- 4 consecutive mistakes
- latest reaction time > 2 × running session mean, twice in a row
- rapid-fire taps: 3 responses < 300 ms in a row (guessing)
- session duration > `session_cap_minutes` (patient profile; default 20)
Prompting sets `fatigueFlagged = true`. Accepting the break ends the session with `completed=false, abandoned_reason='break_prompt'`.
