# Generated game integration

The supplied implementations run in the existing React/TypeScript PWA and Django
application. Existing regional games, care features and voice work are preserved.
The ZIPs and notebook in `games/` are source inputs, not application runtime code.

## Catalog and launching

`frontend/src/games/registry.ts` binds components to the shared public contract in
`shared/games.json`. The catalog drives the library, enabled-game checks, stable
patient routes and daily selection. The legacy engine exports remain compatible
with existing regional games and their tests; the UI uses `gameCatalog`.

| Game | Patient route | Main difficulty parameters |
|---|---|---|
| Sequence Recall | `/patient/games/sequence_recall` | sequence length, distractors, observation |
| Memory Match | `/patient/games/memory_match` | pair count, preview, similarity |
| Find the Change | `/patient/games/find_the_change` | objects, changes, observation |
| Object Sorting | `/patient/games/object_sorting` | objects, categories, distractors |
| Daily Routine Builder | `/patient/games/daily_routine` | steps, order, distractions |
| Word Recall | `/patient/games/word_recall` | words, recognition/recall, cues |
| Visual Search | `/patient/games/visual_search` | grid, similarity, target count |
| Pattern Completion | `/patient/games/pattern_completion` | rules, choices, support |
| Spatial Recall | `/patient/games/spatial_recall` | grid, objects, viewing/delay |
| Attention Tap | `/patient/games/attention_tap` | stimuli, target frequency, inhibition |
| Association Game | `/patient/games/association_game` | pairs, semantic distractors, cues |
| Personal Memory Recall | `/patient/games/personal_memory` | recognition/recall, context, hints |

All supplied games are bounded to 1–5. Existing regional games retain their own
established ranges. Doctor locks/caps are respected on launch. Invalid and disabled
catalog entries cannot launch through the game route. Router protection remains
role-based; direct browser refresh follows the app's existing PIN unlock behavior.

`dailySession.ts` selects four enabled generated games, covers distinct domains,
rotates by date and favours games not recently played. It is a selection helper,
not clinical personalization or a mandatory consecutive-game runner.

## Metrics, round decisions and persistence

The host adapts both supplied component interfaces through one authenticated
`integratedTransport.ts`. It uses the existing encrypted Dexie store and outbox.
The gameplay metrics are `game_id`, `difficulty`, `accuracy` (0–1),
`reaction_time_ms`, `errors`, `hints_used`, `completed`, `early_exit`,
`session_duration_sec`, `rounds_completed`, `timestamp`, plus optional game metadata.

- Cumulative round checkpoints POST to `/api/v1/game-events/` with client event and
  session UUIDs. Django derives the patient from authentication, validates inputs,
  saves `GamePerformanceEvent` and returns a -1/0/+1 decision.
- Checkpoints evaluate against previous completed session history. They do not add
  duplicate entries to `DifficultyState.window`. One adaptive change is allowed
  per session, avoiding repeated promotions from the same history.
- Completed/early-exit sessions become ordinary `GameSession` outbox records and
  reach Django through the existing `/api/v1/sync/push/` flow. Direct patient
  session POSTs also honour client UUIDs and reject cross-patient collisions.
- Final session persistence remains the sole writer of adaptive session history.
  State remains independent for each patient/game pair.
- The existing conservative deterministic engine is the default. Network timeout,
  invalid prediction or inference exception holds difficulty. The optional
  notebook RF deployment boundary is documented separately; it is not enabled.

Round reporting happens after each round. Next-round controls wait for the bounded
request to settle; gameplay generation has no backend dependency. Concurrent final
submission and exit are serialized. Checkpoints remain encrypted on interruption;
reopening that game closes an unfinished checkpoint as an early exit before
starting a new session. This does not resume the exact in-round board after reload.
Final metrics preserve game metadata in the standard session raw-event envelope.
Individual unsent online checkpoint requests are not separately replayed; cumulative
session metrics are retained and submitted through the existing outbox.

## Personal Memory and accessibility

The provider uses the existing patient-scoped Memory Capsule repository and familiar
people cache. It requires the existing `use_memories_in_quiz` consent, uses capsule
records marked `visibility=quiz`, and handles the actual `photo` media kind. Private
images use the existing authenticated/encrypted media component. There is no new
approval workflow or invented approval status. No real data or sample family is
hardcoded into production. Insufficient content shows a calm empty screen.
Place-only content safely falls back to place recognition even at the highest level.

Both generated sets share the app's i18next instance, layout, host transport and
RNG implementation (legacy helper signatures are retained as adapters). Item labels
use the real root translation keys. Game keys missing in Assamese/Bengali/Hindi
are enumerated in `game-english-fallbacks.json`; the UI explicitly discloses English
fallback. Native-speaker review remains pending. The i18n checker still reports
three pre-existing hardcoded voice-assistant strings in `TalkButton.tsx`.

Host controls enforce 64px minimum targets and respect reduced motion. Timers are
cleaned up, including hint/tap feedback timers. Games retain keyboard controls and
calm feedback. Full accessibility certification has not been performed.

## Analytics and extending

Sessions reuse the existing patient progress, caregiver game-session charts,
doctor domain summaries and reports. `summarizeGameParticipation` provides reusable
caregiver participation, completed-session accuracy and hints-per-round summaries.
Practice sessions retain guest mode and do not affect adaptation or clinical views.
Round events are not exposed through an additional patient-data admin screen.

To add a game, add its shared public contract and a component/catalog binding,
provide level configs and English keys, and use the existing metrics/transport
contract. Register its Django definition in a migration. Add logic and interaction
cases that prove scoring, submission, bounds and failure behavior.

## Verification evidence

Automated verification includes the supplied logic suites, all twelve components
launching/starting/exiting at levels 1–5, complete Visual Search/Pattern sessions,
place-only Personal Memory, transport response/failure/duplicate/recovery tests,
and PostgreSQL tests for authentication, idempotency, state isolation and inference
fallback. Existing frontend/backend regression suites are rerun after changes.

Browser verification exercised the real library, all twelve routes, representative
round interaction and early exits. A five-round Visual Search session completed
and was independently verified in Django (`completed=true`, `rounds=5`, four live
checkpoints plus the final persisted session). Empty/consent-disabled Personal Memory
was verified in the real app. Full manual completion of every game at every level,
a live caregiver-approved Personal Memory session, actual RF artifact parity,
and a new generated-game browser offline/reconnect round trip remain unverified.
These limitations must not be described as completed validation.
