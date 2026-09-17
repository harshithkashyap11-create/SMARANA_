# SMĀRANA voice reliability upgrade — 17 September 2026

The existing React, Django, encrypted offline repository/outbox, browser recognition,
and browser synthesis architecture is preserved. Controlled reliability targets pass;
hardware audio and live conversational inference are not yet accepted. This report
does not replace the historical audit or claim a new hardware reliability score.

## 1. Files changed

Paths below are repository-relative. Existing unrelated working-tree changes were preserved.

| File | Reason |
|---|---|
| `frontend/src/voice/turn.ts` | Unique turns, abort propagation, stale completion guards. |
| `frontend/src/shared/ui/TalkButton.tsx` | One voice/text pipeline, close/stop/unmount cancellation, guarded confirmations, repeat, safe logs. |
| `frontend/src/voice/safety.ts` | Normalization and targeted command negation. |
| `frontend/src/voice/router.ts` | Explicit priority, deterministic commands, game extraction, medication status and repeat. |
| `frontend/src/voice/conversation.ts` | Safe reminder follow-ups, expiry, cancellation and reset. |
| `frontend/src/voice/reminderParser.ts` | Structured time/date/recurrence parsing and clarification. |
| `frontend/src/voice/gameContract.ts` | Shared game aliases with longest/exact matching and collision rejection. |
| `frontend/src/voice/registry.ts` | Shared allowlist without importing game components into the router. |
| `frontend/src/voice/actions.ts` | Guarded effects, canonical routes, atomic reminders, full confirmation, actual medication status. |
| `frontend/src/voice/fallback.ts` | Abortable, bounded, conversation-only inference. |
| `frontend/src/voice/loop.ts` | Initialization failure recovery and modal/synthesis listening pause. |
| `frontend/src/voice/tts.ts` | Immediate speed changes and safe voice enumeration. |
| `frontend/src/db/repo/patient.ts` | Cancel orientation/family requests without stale cache fallback. |
| `frontend/src/db/repo/routine.ts` | Cancel schedule/medication requests; explicit non-bound method contract. |
| `frontend/src/games/registry.ts` | Genuine component props, shared metadata, restore existing compatibility catalog. |
| `frontend/src/games/integratedProps.ts` | Typed integration props rather than incompatible component casts. |
| `frontend/src/features/patient/games/IntegratedGamePage.tsx` | Supply actual seeded random and speech dependencies to existing games. |
| `frontend/src/games/integrated/shared/gameBindings.jsx` | Correct metrics callback argument and result contract. |
| `shared/games.json` | One canonical contract for 12 integrated and 9 existing legacy games. |
| `shared/voice_audit_cases.json` | Unchanged original 46 controlled audit inputs/expectations. |
| `backend/apps/voice/providers.py` | Shared games, conversation-only boundary, short replies, readiness, safe provider error logs. |
| `backend/apps/voice/views.py` | Authenticated, throttled readiness endpoint. |
| `backend/apps/voice/urls.py` | Register readiness endpoint. |
| `backend/config/settings/base.py` | Configurable response word/character bounds. |
| `docker-compose.prod.yml` | Mount canonical contract and use root frontend build context. |
| `frontend/Dockerfile.prod` | Include shared contract and inference flag at frontend build time. |
| `.dockerignore` | Exclude secrets, local environments, caches and dependencies from expanded build context. |
| `frontend/src/voice/actions.test.ts` | Confirmation, recurrence, status, cancelled writes and model rejection regressions. |
| `frontend/src/voice/router.test.ts` | AM/PM and ambiguity expectations. |
| `frontend/src/voice/tts.test.ts` | Replacement, watchdog and voice enumeration failure coverage. |
| `frontend/src/voice/stt.test.ts` | Formatting only; existing recovery tests retained. |
| `frontend/src/voice/intents/en.json`, `as.json`, `bn.json` | Formatting only; existing multilingual definitions preserved. |
| `frontend/src/voice/turn.test.ts` | Abort and supersession regressions. |
| `frontend/src/voice/reliability.test.ts` | Audit matrix, every registered game alias, prefix variants, priorities and negation. |
| `frontend/src/voice/reminderParser.test.ts` | Time/date/recurrence/follow-up safety. |
| `frontend/src/voice/actions.persistence.test.ts` | Actual Dexie transaction/encryption with in-memory IndexedDB; write failure and abort rollback. |
| `frontend/src/voice/fallback.test.ts` | Critical-intent rejection, invalid replies, timeout and cancellation. |
| `frontend/src/shared/ui/VoiceAuditProbe.test.tsx` | Upgrade earlier defect reproductions into safe-behavior UI regressions. |
| `backend/apps/voice/tests/test_api.py` | Existing local success case now conversation-only. |
| `backend/apps/voice/tests/test_hybrid.py` | Local/cloud priority case now conversation-only. |
| `backend/apps/voice/tests/test_reliability.py` | Shared contract, critical-command rejection, bounded answers, provider readiness/errors and authenticated APIs. |
| `docs/audits/voice-audit.cjs` | Re-run original cases against actual updated modules; injected audio recovery probes. |
| `docs/audits/voice-upgrade-baseline.md` | Reproduced pre-change failures. |
| `docs/audits/voice-assistant-audit-2026-09-17.md` | Earlier review artifact; historical findings retained, not rewritten to inflate results. |
| `docs/voice-assistant-repair.md` | Update inference, recurrence, privacy and verification guidance. |
| This report | Results, limitations and real audio acceptance instructions. |

Existing changes to `GamePage.tsx`, shared UI translations, `tsconfig.json`, game
migration, transport and other integrated game files are not claimed as this upgrade's work.

## 2. Bugs fixed

| Reproduced audit finding | Fix and evidence |
|---|---|
| Close and overlap allow delayed actions | Abortable turns, active checks around awaits/effects, captured confirmation ownership; UI and turn tests. |
| Help swallows emergency | Emergency precedes generic help; three emergency wording regressions. |
| Negated command executes | Targeted negation before action; positive memory complaint remains supported. |
| Named games collapse to generic request; Personal Memory collision | Canonical aliases before generic launch; longest matching and distinct-game rejection. |
| Frontend/backend/catalog disagreement | Shared JSON consumed by both languages and deployment. |
| Ambiguous hour guessed; dates/recurrence discarded | Structured parsing, follow-up, next weekday, daily rule with all seven days; unsupported recurrence rejected. |
| Repeat missing | Replay only saved response, never re-run action. |
| Model can return action commands | Conversation-only backend/frontend/action boundaries. |
| Inference errors hang or expose details | Timeouts, cancellation, readiness status and calm fallback; metadata-only logs. |
| Medication list mistaken for adherence | Names/doses labeled as list; today's status reads actual routine status. |
| Integrated component casts break type/build | Genuine props and metrics signature, not new `any`/ignore directives. |

## 3. Architecture changes

Voice and typed input enter the same handler and TurnManager. Browser STT remains
the existing adapter. Each new turn invalidates the old one. Abort-aware waits
prevent stale continuations even when an underlying local operation cannot itself
be interrupted. Effects and confirmations check ownership before execution.
Reminder/outbox writes remain a single Dexie transaction, aborted together.

Priority is targeted negation/cancel, emergency, stop/repeat, reminders, named games,
schedule/progress/navigation, help, conversation, then unknown clarification.
Negation precedes emergency only to avoid executing explicitly denied emergencies.
The shared game contract contains actual existing routes and 69 registered voice
aliases. Unknown or competing games do not launch another game.

Reminder drafts retain task, time, date, timezone and daily recurrence. Missing task
or ambiguous hour asks a follow-up. Drafts expire after five minutes and reset on
assistant close, unmount or language change. One-time past times and unsupported
recurrence are rejected. Confirmation includes resolved date, time and timezone;
daily reminders explicitly say every day.

Only deterministic `general_chat` input reaches the authenticated inference API.
Ollama runs first; cloud runs only with explicit backend configuration. Model
results can supply only short conversational text, not critical actions. Replies
are bounded by configured words/characters and complete sentences. Critical
confirmation information is not truncated. `/api/v1/voice/readiness/` distinguishes
disabled, missing installation/service/model, timeout and invalid response.

Listening pauses for speech and modal confirmation. Fatal recognition initialization
errors stop the loop. TTS replacement cancels earlier output; unavailable or hung
synthesis resolves safely. Browser STT may use a browser vendor's remote service;
this upgrade does not promise offline audio or introduce Whisper.

## 4. Tests added

New suites are listed individually in section 1. They cover all original audit
cases, all game aliases, temporal parsing, recurrence payloads and confirmations,
single-turn ownership, stale UI callbacks, real transaction rollback, actual status
mapping, provider priority, critical model output rejection, timeout/recovery and
speech replacement. Existing tests were retained, with obsolete expectations for
unsafe behavior changed to the required safe behavior.

## 5. Test results

| Check | Actual result |
|---|---|
| Baseline frontend | 315 passed, 1 failed: catalog compatibility. |
| Baseline typecheck/build | Failed: 12 incompatible game component casts and 2 audit callback typing errors. |
| Final frontend | **655 passed, 55 files passed**. |
| Voice/UI regression subset | **400 passed, 11 files passed**. |
| Final typecheck | PASS: `npm run typecheck`. |
| Final production build | PASS: `npm run build`, 891 modules. Bundle size/dynamic import warnings remain. |
| Backend voice suite | **34 passed** against existing PostgreSQL at 127.0.0.1:55440. |
| Targeted frontend lint | PASS for voice, TalkButton, UI regressions, game props/host and repositories. |
| Backend lint | PASS for voice and settings. |
| Original router audit | 46/46 intents and required entities. |
| Games | 12/12 canonical, 7/7 original aliases, all 69 registered voice aliases covered in passing frontend suite. |
| Reminders | 20 parser regressions pass; action/confirmation and 3 transactional persistence/rollback tests pass. |
| Running app smoke | Typed `Open Sequence Recall` visibly reached game page; `Stop the game` visibly returned to catalog. |

Backend reproduction command:

```sh
cd backend
POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55440 POSTGRES_DB=smarana_local .venv/bin/pytest apps/voice/tests -q --tb=short --reuse-db
```

Frontend and deterministic audit:

```sh
cd frontend
npm test -- --run
npm run typecheck
npm run build
cd ..
node docs/audits/voice-audit.cjs
```

## 6. Updated metrics

| Controlled metric | Historical audit | Upgrade |
|---|---|---|
| Correct expected intents | 24/46 | **46/46 (100%)** |
| Intent + required entities | 21/46 | **46/46 (100%)** |
| Canonical integrated games | 3/12 | **12/12** |
| Original seven aliases | 0/7 | **7/7** |
| Entire registered voice alias set | Not measured | **69/69** in regression suite |
| Negated commands executing | Demonstrated | **0** in controlled regressions |
| Stale/cancelled effects executing | Demonstrated | **0** in controlled regressions |
| Unsupported recurrence silently downgraded | Demonstrated | **0** in controlled regressions |

Audit inputs and expected values were not relaxed to improve accuracy. These are
controlled test results, not recognition accuracy from human speech. Latest
10,000-iteration routing benchmark during concurrent builds/tests measured median
0.90 ms, p95 5.50 ms; it excludes STT, repositories, network, inference and playback
and is not end-to-end latency. A new aggregate score would imply unverified audio
and inference improvements; the historical 39/100 is not replaced with an invented score.

## 7. Remaining limitations

| Status | Scope |
|---|---|
| WORKING | Production build/typecheck; controlled command/entity regressions; observed live typed game launch/exit. |
| PARTIALLY WORKING | Deterministic action integration: cancellation and local persistence verified, but every browser/Django sync path is not manually accepted. |
| PARTIALLY WORKING | STT/TTS adapters: recovery verified with injected providers; actual microphone recognition and audible speaker output remain unverified. |
| NOT VERIFIED | Live Ollama inference. Executable exists; local tags probe timed out. No service/model was installed or started by this task. |
| NOT VERIFIED | Cloud inference and consent workflow; no vendor credentials assumed, cloud disabled unless explicitly configured. |
| NOT VERIFIED | Real browser reminder sync/delivery, live emergency delivery, phone dialer and all 12 games' gameplay completion. |
| NOT VERIFIED | Production Docker image build/deployment; shared contract paths were updated but Docker build was not run. |
| MISSING | True wake-word listener, guaranteed offline STT, custom Whisper and unsupported recurrence grammar; intentionally out of scope. |

Browser voices depend on the user's device and language installation. The frontend
bundle is approximately 1.53 MB before gzip; bundle splitting is a remaining
performance concern. A reminder already committed before a later cancellation
cannot be retroactively undone; cancellation guards pending work and rolls back
an active transaction, not previously completed user actions.

## 8. Manual verification steps

Use a dedicated test patient and test caregiver, not a real clinical account.
Use localhost or HTTPS in a supported browser with microphone and speakers. Start
the existing frontend, Django and database normally; sign in; open Talk. Confirm
permission only for this app. Do not test actual emergency delivery without the
test recipient's approval.

For **each row**, record Input, actual STT transcript, intent, entities, action,
backend result, displayed assistant response, audible TTS status, and PASS/FAIL.
Check the browser network panel for expected Django requests and no provider call
for deterministic commands; do not export sensitive request bodies or tokens.

| Say aloud | Expected verification |
|---|---|
| Open Sequence Recall. | Transcript, `start_game`, sequence_recall, actual game page, short audible acknowledgment. |
| Let's play Memory Match. | memory_match preserved, correct page rather than generic catalog. |
| Stop the game. | stop_game, catalog, no remaining game speech. |
| Show my progress. | progress section, actual backend content rather than invented totals. |
| Remind me to take medicine at 8 PM. | 20:00; if already past, clarification. Otherwise inspect full date/time/India timezone, then Yes on test account; verify one rule/outbox/synced reminder. |
| Remind me every day at 8 PM to take my medicine. | Explicit daily confirmation; Yes; inspect all seven weekday entries, no one-time end date. |
| Remind me on Friday at 6 PM. | Ask missing task; answer 'drink water'; confirm next valid Friday, 18:00; inspect persisted date after Yes. |
| What is my schedule today? | Routine screen and actual today's backend data. |
| Help, this is an emergency. | SOS priority and confirmation; select No first and verify no event/delivery. Only with approved test recipient, Yes through existing SOS flow and verify backend/test delivery. |
| Do not open games. | No navigation, acknowledgment only. |
| Repeat that. | Same prior response; no repeated action/API write. |
| Why are memory exercises useful? | Conversational route, bounded local reply or calm unavailable message; no action execution. |

Also test ambiguous 'Remind me at 8', then 'PM', then a missing task; cancellation
must discard the draft. Test tomorrow, next weekday, relative 20 minutes, invalid
13 PM/25:00 and unsupported weekly/monthly. Confirm no unintended reminders.

Race checks: throttle a request in the browser network panel; close Talk, press
stop, submit a newer request, and navigate away/unmount while processing. Release
the delayed response: no old navigation, confirmation, speech or write should
occur. Repeat during confirmation; ensure no previous write is repeated.

Audio recovery: deny microphone permission and confirm a clear error/not listening;
allow it and retry; stay silent; remove/disable microphone; stop during recognition;
close during speech; submit a new request during speech. Confirm old output stops
and the UI recovers. Listen for real sound—displayed response text is not proof.

Ollama: using the existing configured model, run the service and pull that model
separately if approved. Configure LOCAL_LLM_PROVIDER, LOCAL_LLM_MODEL,
LOCAL_LLM_URL and LOCAL_LLM_TIMEOUT on Django; rebuild frontend with
VITE_VOICE_LLM_FALLBACK=1. Check authenticated `/api/v1/voice/readiness/` for ready.
Speak the conversational example and verify local request plus audible response.
Stop the service, use a missing model, simulate timeout and malformed output;
confirm bounded wait and friendly recovery. Deterministic games/reminders must
still work. Keep VOICE_LLM_FALLBACK false unless remote processing is explicitly
approved and endpoint/token configured. Never paste keys into frontend variables.

Integration release acceptance remains pending until these real-device checks
and the unverified delivery paths are recorded as passing.
