# SMĀRANA voice-assistant technical audit
Date: 2026-09-17. Scope: the current on-disk SMARANA application, including uncommitted game integration changes. No assistant implementation was changed. Audit scripts and two diagnostic UI tests were added.

## Overall Score

```text
39 / 100

Speech-to-Text:           4 / 15
Intent Detection:         8 / 20
Entity Extraction:        4 / 10
Ollama / LLM:             4 / 15
Text-to-Speech:           4 / 10
End-to-End Reliability:   5 / 15
Robustness:               7 / 10
Code Quality:             3 / 5

4 + 8 + 4 + 4 + 4 + 5 + 7 + 3 = 39 / 100
```

This is an evidence-limited engineering readiness judgment, not a calibrated scientific metric or a transcription accuracy score. Recovery and deterministic logic receive credit for executable checks; simulated speech and model responses do not receive credit for actual audio quality or live inference. Unverified capabilities are not assumed to work. The supplied brief describes a Colab prototype, but no notebook exists in this workspace: the implementation here is already React + Django.

| Category | Evidence behind score; reasons for deductions |
|---|---|
| STT | Adapter recovery checked with injected recognition events; no real microphone, accents, noise, transcription accuracy, format handling, or transcription latency verified. No app-owned model loading or CPU/GPU control. |
| Intent | 24/46 expected intents matched in the new deterministic matrix. Natural wording, repeat, schedule synonyms, emergency precedence, and unknown-game rejection fail. |
| Entities | 21/46 complete intent/entity outcomes; only 3/12 requested canonical games resolve correctly. Dates, recurrence, and ambiguous hours are unsafe. |
| LLM | Nine backend provider/validation tests passed, using mocked HTTP/providers. Live service probe timed out. Answer quality, model loading, real latency, and medical overclaiming NOT VERIFIED. |
| TTS | Missing output, provider errors, thrown exceptions, timeout and cancellation recover in injected-provider checks. Actual generated audio, installed language voice quality, naturalness and playback latency NOT VERIFIED. |
| End-to-end | React wiring, typed routing, action contracts and loop lifecycle tested at boundaries. Two UI race defects reproduced. No successful real speech-to-action-to-audio run; full application typecheck fails. |
| Robustness | Many unavailable/malformed/invalid paths recover. Cancellation is incomplete, typed requests overlap, error messages conflate failures, and unsupported reminder requests can appear successful. |
| Quality | Clear adapter/router/action separation and configurable providers. Duplicated game lists, unused intent assets, hardcoded English responses, broad dependency ranges, and UI orchestration races reduce maintainability. |

## What Actually Works

Verified as executable deterministic logic, not as hardware acceptance:

- Selected commands, including explicit Sequence Recall, Memory Match, Object Sorting, progress navigation, stop-the-game, Help, and ordinary unknown input.
- AM/PM parsing: 8 PM -> 20:00; 12 AM -> 00:00; invalid 13 PM and 25:00 are rejected in the contextual pipeline.
- Relative reminder calculation in Asia/Kolkata and bare-time reminder follow-up; five-minute pending reminder expiry is covered by existing tests.
- Rules-first UI selection before optional model fallback is connected in TalkButton.handle.
- Action-layer rejection of arbitrary section URLs, traversal and prototype property names is tested.
- Confirmation-before-reminder-write and no false saved response after storage failure are verified using mocked storage, not actual database durability.
- Loop pauses recognition during an awaited handler and resumes after completion or handler failure, using a fake recognizer.
- Typed request UI routes requests when speech recognition is unavailable; action execution is mocked in this UI test.
- Ten injected-provider recovery probes passed. Details below.

Checks: original frontend suite 93/93 passed in six files; two added UI defect-reproduction tests passed. The combined final run passed 95/95 tests in seven files. Backend 9/15 passed; six tests could not set up the database because hostname "db" did not resolve. App typecheck failed with TS2352 errors in frontend/src/games/registry.ts in the current game integration work. These are not voice-module type errors, but they block the supplied build/start path.

## Partially Working

- STT: browser SpeechRecognition/webkitSpeechRecognition adapter is connected, but microphone capture and recognizer quality are NOT VERIFIED. Locale is selected from application language; it is not automatic language detection.
- TTS: browser synthesis is connected and recovery tested. Actual playback is NOT VERIFIED. Sentence splitting, slow rate and 400 ms inter-sentence pauses exist.
- Navigation: works for explicit supported wording at router/action test boundaries, but not tolerant phrasing. Actual requested-page render after voice navigation is NOT VERIFIED.
- Reminders: specific absolute/relative phrases and tomorrow are parsed. Unsupported weekday/recurrence phrases are not safely rejected. A bare "5" becomes 05:00 rather than asking AM/PM.
- Conversation: short-lived pending reminder and game context only; no general conversational history or memory.
- LLM: authenticated HTTP integration and structured-response validators are present. Mocked provider priority and recovery are tested; live Ollama inference is NOT VERIFIED.
- Medicines: reads names/doses from getMedications(), not today's scheduled reminders or taken/skipped status. This is narrower than the voice specification.
- Language support: selected multilingual patterns and locales exist, but the rules are not comprehensive for all seven configured languages; recognition/voice quality for those languages is NOT VERIFIED.

## Broken

- Closing the assistant while fallback is pending does not invalidate its eventual action. A UI diagnostic reproduced action execution after the sheet disappeared.
- Two typed submissions run concurrently. A diagnostic reproduced two outstanding fallback calls and two actions. Single shared confirmation resolver/state can therefore be overwritten; that specific confirmation-deadlock outcome was traced, not separately reproduced.
- "Help emergency" selects ordinary help instead of emergency confirmation.
- "Do not open games" opens games.
- "Let's play sequence recall" loses the game slot because an early generic game rule returns first.
- Nine of the twelve requested canonical game names do not resolve to their game. Generic start_game with no slot opens the catalog, not the requested game.
- "Start personal memory game" incorrectly selects Memory Match.
- "Every day" and "on Friday" in reminders become part of the task title, while action execution defaults to today's one-time reminder.
- Typical schedule, repeat and several reminder variations fail.
- Current application build prerequisite fails typechecking in game catalog component casts.

## Missing

Absent in this codebase, not inferred:

- Colab notebook, setup cells, notebook microphone JavaScript, cell-order guarantees, runtime reconnect/reset handling.
- Explicit audio recording/export, app-owned audio preprocessing, PCM/sample-rate/channel/codec conversion, audio file management.
- faster-whisper/Whisper package or model, CPU fallback, GPU detection/control, STT model loading.
- Automatic spoken-language detection, background wake-word engine.
- Repeat intent and last-response replay state.
- Comprehensive aliases for the twelve requested games, and a unified frontend/backend game recognition schema.
- Validated recurrence/weekday/date natural-language reminder support and voice deletion.
- Dialogue history passed to Ollama; "this activity" has no current-game/page context in its model request.
- Model installation/pull/health readiness as part of the supplied app startup.
- Runtime verification of real STT/TTS and a full real-audio acceptance suite.
- An enforced short-sentence/short-word-count policy or validated conversational medical safety guard.

## Demo-Only / Mocked

- FakeSpeechToText and FakeTextToSpeech are explicit test adapters. The deployed TalkButton instantiates browser adapters, not those fakes.
- Browser recognition tests use RecognitionFake; TTS recovery probes inject utterance/synthesis providers.
- TalkButton tests mock profile repositories, model routing and/or performAction. They prove orchestration behavior, not actual navigation, live inference, telephone calls or durable persistence.
- Action tests replace IndexedDB transaction and put operations with mocks. They do not prove atomic storage behavior.
- Backend model tests patch urlopen or provider methods. "small-model" is a test setting, not evidence that a model exists.
- isFakeOffline() in the routine repository is an explicit simulated-offline switch.
- Fixed Help/navigation/success strings are deterministic product responses, not simulated intelligence. No random-generated assistant answer was found; crypto.randomUUID() generates reminder identifiers, not responses.
- English/Assamese/Bengali intent JSON assets exist, but router.ts does not load them. They are not the live routing source despite the older specification describing them.

## Top 10 Problems

No demonstrated CRITICAL vulnerability was established. Priorities reflect malfunction and unsafe ambiguity, not medical efficacy.

| Rank | Severity | Problem / why it matters | Location | Recommended fix |
|---|---|---|---|---|
| 1 | HIGH | In-flight commands survive close/stop; user believes interaction ended but an action can occur later. Reproduced in UI. | frontend/src/shared/ui/TalkButton.tsx:56-142, 243-249 | Per-turn/session cancellation token; abort fallback; check token before speech, action and confirmation; clear confirmation on stop. |
| 2 | HIGH | Unsupported reminder dates/recurrence and ambiguous bare hours produce misleading schedules. Confirmation only repeats title, not resolved date/time. | frontend/src/voice/conversation.ts:65-82; frontend/src/voice/actions.ts:139-166; frontend/src/shared/i18n/en.json:647 | Explicitly reject unsupported grammar or ask follow-up; validate future due time; confirm full task/date/time/timezone. |
| 3 | HIGH | Emergency wording beginning with Help is swallowed by help rule. "help emergency" reproduced. | frontend/src/voice/router.ts, English help rule before SOS rule | Evaluate emergency intent first, retaining confirmation; cover competing-intent phrases. |
| 4 | HIGH | Game catalog says all 12 support voice, but router recognizes only 3 names; backend provider allowlist also lacks 9 new keys. Personal Memory aliases can select wrong game. | frontend/src/games/registry.ts:46-57; frontend/src/voice/router.ts gameKeys; backend/apps/voice/providers.py GAMES | One shared generated catalog/alias schema; specific names before generic rules; cross-layer contract tests. |
| 5 | HIGH | Typed requests bypass the loop's single-turn guarantee; shared response/TTS/confirmation state can race. Reproduced overlapping calls. | frontend/src/shared/ui/TalkButton.tsx form submit and confirm callback | Queue or disable while busy; own callbacks/resolvers per turn; ensure every cancelled confirmation resolves. |
| 6 | HIGH | No successful real-audio acceptance evidence and Ollama probe timed out. A complete voice assistant cannot be accepted from mocked tests. | frontend/src/voice/stt.ts, tts.ts; backend/apps/voice/providers.py | Test actual supported browser/mic/voices and deployed Ollama; verify service/model readiness and capture measured output. |
| 7 | HIGH | App typecheck fails in current integrated game catalog, blocking npm run build and start-local.sh. | frontend/src/games/registry.ts:46-57; scripts/start-local.sh build step | Correct game component prop contracts/adapters; restore clean typecheck/build before accepting integration. |
| 8 | MEDIUM | Exact keywords, generic-first game routing, negation and unknown-game handling produce surprising actions; repeat absent. | frontend/src/voice/router.ts:121-130 and final generic game rule; conversation.ts:34 | Add negation/unknown guards, alias-based extraction, ordering tests, and last-response replay; ask clarification rather than opening catalog for nonsense. |
| 9 | MEDIUM | Conversation output safety and accessibility are weakly enforced: prompt-only medical restriction, 2000-character response allowed, unlocalized English strings, no dialogue/page context. | backend/apps/voice/providers.py prompt/valid_result; frontend/src/voice/actions.ts; TalkButton.tsx | Bound spoken words/sentences, validate safety policy, localize replies, pass minimal explicit activity context, test real answers. |
| 10 | MEDIUM | External data paths are not clearly disclosed in UI. Browser STT locality unknown; optional remote router gets text; debug logs include reminder slots. | frontend/src/voice/stt.ts; fallback.ts; TalkButton.tsx debug block; backend/apps/voice/providers.py | Disclose actual deployment providers, consent before remote routing, keep debug off, minimize/redact sensitive logging, verify network traffic. |

## Intent Accuracy

```text
Expected intent correct:       24 / 46 = 52.17%
Intent + required entities:    21 / 46 = 45.65%
Canonical game recognition:     3 / 12 = 25.00%
Alternate game recognition:     0 /  7 =  0.00%
Combined game recognition:      3 / 19 = 15.79%
```

This is a deliberately challenging English deterministic-pipeline matrix, not representative population accuracy or STT word error rate. Fresh conversation state per row, fixed time 2026-09-17T10:00:00Z, Asia/Kolkata reminder timezone, no family context. Title whitespace is trimmed for comparison. Intent success does not imply entity success. "set_reminder_followup" is an audit label for an expected missing/ambiguous-time clarification, not an implementation enum. UNKNOWN represents a null route.

GENERAL_CHAT rows fail deterministic classification but are eligible for optional LLM fallback in the UI. Their live LLM outcome is NOT VERIFIED, not a proven live model failure. All complete-pipeline intent accuracy remains NOT VERIFIED because live inference and microphone recognition were not exercised.

Major confusion pairs: named game -> generic game/catalog; personal memory -> Memory Match; reminder mentioning tablets -> medicines_today; emergency prefixed by Help -> help; schedule/progress synonyms -> unknown; general conversation/repeat -> unknown.

### Complete intent test matrix

PASS requires the expected intent and any required entities. The result column contains actual slots or clarification text; action execution is not implied.

| Group | Input | Expected | Detected | Extracted entities / result | Pass |
|---|---|---|---|---|---|
| START_GAME | Start Sequence Recall | start_game | start_game | {"game":"sequence_recall"} | PASS |
| START_GAME | Let's play sequence recall | start_game | start_game | {} | FAIL |
| START_GAME | I want to play a memory game | start_game | start_game | {"game":"memory_match"} | PASS |
| START_GAME | Can we do Memory Match? | start_game | unknown | {} | FAIL |
| START_GAME | Play Memory Match | start_game | start_game | {"game":"memory_match"} | PASS |
| START_GAME | Open Object Sorting | start_game | start_game | {"game":"object_sorting"} | PASS |
| START_GAME | Start the sequence game | start_game | start_game | {} | FAIL |
| START_GAME | Can you start Find the Change? | start_game | start_game | {} | FAIL |
| STOP_GAME | Stop the game | stop_game | stop_game | {} | PASS |
| STOP_GAME | Exit this activity | stop_game | unknown | {} | FAIL |
| STOP_GAME | Quit my game | stop_game | stop_game | {} | PASS |
| STOP_GAME | Close the game | stop_game | stop_game | {} | PASS |
| STOP_GAME | Stop playing | stop_game | unknown | {} | FAIL |
| SCHEDULE | Open my schedule | open_section | unknown | {} | FAIL |
| SCHEDULE | What do I have today? | open_section | unknown | {} | FAIL |
| SCHEDULE | Show my routine | open_section | open_section | {"section":"routine"} | PASS |
| SCHEDULE | Show my reminders | open_section | open_section | {"section":"reminders"} | PASS |
| SCHEDULE | Take me to my schedule | open_section | unknown | {} | FAIL |
| PROGRESS | Show my progress | open_section | open_section | {"section":"progress"} | PASS |
| PROGRESS | How am I doing? | open_section | unknown | {} | FAIL |
| PROGRESS | Open progress | open_section | open_section | {"section":"progress"} | PASS |
| PROGRESS | Take me to my progress | open_section | open_section | {"section":"progress"} | PASS |
| PROGRESS | Show my results | open_section | unknown | {} | FAIL |
| REMINDER | Remind me to take medicine at 8 PM | set_reminder | set_reminder | {"title":"take medicine","time":"20:00"} | PASS |
| REMINDER | Remind me about my tablets tonight | set_reminder_followup | medicines_today | {} | FAIL |
| REMINDER | At 7 tomorrow morning remind me to drink water | set_reminder | unknown | {} | FAIL |
| REMINDER | Remind me to call my daughter at 5 | set_reminder_followup | set_reminder | {"title":"call my daughter","time":"05:00"} | FAIL |
| REMINDER | Set a reminder for my medicine | set_reminder_followup | medicines_today | {} | FAIL |
| REMINDER | Remind me after lunch to take my tablets | set_reminder_followup | medicines_today | {} | FAIL |
| REMINDER | Remind me in 20 minutes to drink water | set_reminder | set_reminder | {"title":"drink water","time":"15:50","date":"2026-09-17"} | PASS |
| REMINDER | Remind me to drink water tomorrow at 8 PM | set_reminder | set_reminder | {"title":"drink water ","time":"20:00","date":"2026-09-18"} | PASS |
| HELP/REPEAT | Help | help | help | {} | PASS |
| HELP/REPEAT | I'm confused | help | help | {} | PASS |
| HELP/REPEAT | What can you do? | help | unknown | {} | FAIL |
| HELP/REPEAT | Say that again | repeat | unknown | {} | FAIL |
| HELP/REPEAT | Can you repeat that? | repeat | unknown | {} | FAIL |
| CHAT/UNKNOWN | Why do people sometimes forget names? | general_chat | unknown | {} | FAIL |
| CHAT/UNKNOWN | What is memory? | general_chat | unknown | {} | FAIL |
| CHAT/UNKNOWN | Tell me something interesting | general_chat | unknown | {} | FAIL |
| CHAT/UNKNOWN | Explain this activity | general_chat | unknown | {} | FAIL |
| CHAT/UNKNOWN | Why are we playing this game? | general_chat | unknown | {} | FAIL |
| CHAT/UNKNOWN | Purple clouds dancing | unknown | unknown | {} | PASS |
| CHAT/UNKNOWN | (empty) | unknown | unknown | {} | PASS |
| CHAT/UNKNOWN | x | unknown | unknown | {} | PASS |
| CHAT/UNKNOWN | Start | unknown | unknown | {} | PASS |
| CHAT/UNKNOWN | Play banana rocket | unknown | start_game | {} | FAIL |

## End-to-End Verdict

**Prototype only.**

The application contains genuinely connected React/Django routing rather than a disconnected notebook demo. However, no real microphone-to-action-to-audio success was verified, live local inference was unreachable during the probe, and the current app fails typechecking. Command recognition is narrow, requested game recognition is incomplete, and cancellation/reminder defects cause behavior that conflicts with user intent. It is not integration-ready as an acceptance result, even though integration code already exists.

## What Must Be Fixed Before SMĀRANA Integration

There is no separate notebook assistant to connect in the supplied files: these are acceptance requirements for the integration already present.

### Must fix before integration

- Cancellation/session identity and single-turn typed execution, including confirmation lifecycle.
- Safe reminder ambiguity handling and full date/time confirmation; reject unsupported recurrence/weekday phrasing.
- Emergency precedence and negated-command handling.
- Shared game vocabulary/allowlists; correct recognition for games claiming voice support.
- Restore app typecheck/build.
- Verify real mic/STT/TTS/provider readiness on target hardware and browser.
- Establish provider disclosure/privacy consent before sensitive user trials or remote routing.

### Can fix after integration

- Broader ordinary navigation wording and multilingual coverage, provided unsupported wording clarifies safely.
- Repeat capability and activity explanation context: do not advertise them before implemented.
- Separate recognition/model/storage error messages and accurate medicines-today scope.
- Automated browser, storage and live-provider acceptance tests; deeper acoustic/latency evaluation.

### Nice-to-have

- True wake-word detection, optional local Whisper and CPU/GPU acceleration.
- Configurable timezone if deployed outside the current Asia/Kolkata assumption.
- Additional voice selection preferences and richer dialogue history with privacy controls.

# Evidence appendix

## Architecture inventory

| Requested system | Implementation / status |
|---|---|
| Mic capture / recording | BrowserSpeechToText.start delegates capture directly to browser recognizer. No getUserMedia/MediaRecorder audio-recording layer or exported audio in assistant code. Physical capture NOT VERIFIED. |
| Audio preprocessing / format | MISSING at app level. Browser internals are not inspectable here; do not claim preprocessing quality. |
| STT / model | Web Speech API browser provider. No chosen downloadable STT model, faster-whisper, CPU/GPU setup or model-load code. |
| Language detection | MISSING; recognitionLocale maps current UI language to en-IN/as-IN/bn-IN/hi-IN/te-IN/mni-IN/lus-IN. Assamese retry uses bn-IN. |
| Routing / intent definitions | router.ts route, Intent union, inline rules and gameKeys. Intent JSON files are not imported. stop_listening, stop_game, time/date and general_chat exist in addition to original spec intents. |
| Entity extraction | Regex game/page/time/title plus fuzzy family name/relationship matching. conversation.ts handles contextual, relative and tomorrow reminders. No general entity model before optional fallback. |
| Execution | actions.ts performAction via TalkButton.handle. Uses React Router, routine repository, confirmation dialog, telephone URL and SOS event. |
| Local LLM | providers.py OllamaProvider posts JSON nonstreaming /api/chat. Config default qwen2.5:1.5b, localhost:11434, 8 s timeout. Installed model and CPU/GPU runtime NOT VERIFIED. |
| Prompt | Lists allowlisted intents/sections/games, structured JSON with confidence and string slots, no invented reminder details, short friendly language, instruction not to give diagnoses/treatment/code/URLs. No page/game context/history; no enforced word-count/sentence bound or demonstrated output safety. |
| Cloud fallback | HttpJsonProvider to administrator-configured VOICE_ROUTER_ENDPOINT with server-only bearer token; 3 s timeout; after local invalid/unavailable output if enabled. No vendor assumed. |
| Chat | general_chat response slot spoken directly; no independent dialogue engine. No real relevance/tone/hallucination evaluation possible without live inference. |
| TTS | tts.ts BrowserTextToSpeech: installed browser voices, language fallback lists, 0.95/0.7 rate, calm preference, sentence playback, timeout cancellation. ConfirmDialog uses separate shared/hooks/useTts.ts, which has weaker error handling and no awaitable playback lifecycle. |
| Repeat | MISSING. Read-this and section instruction replay are not repeat-last-response. |
| State | VoiceLoop active/generation/timer; TalkButton React UI refs/state; VoiceConversation reminder context expiry and game-context boolean. Context has no reset call on ordinary sheet close and no patient/session identifier. Cross-profile context carryover is a risk to investigate, not reproduced. |
| Configuration | base.py VOICE_* and LOCAL_LLM_*; Vite build-time VITE_VOICE_LLM_FALLBACK and VITE_VOICE_DEBUG; .env examples and development compose pass-through. Values in examples are not proof of loaded runtime configuration. |
| Installation/startup | npm package + requirements.txt; start-local.sh initializes existing app DB, installs app dependencies if missing, builds frontend, launches app servers. It does not install/start Ollama, pull a model or wait for inference readiness. Compose does not define an Ollama service. |
| Tests | router, hybrid, STT, TTS, actions, TalkButton unit tests; backend API/provider tests. Their mock boundaries are explicit. New standalone audit harness and two UI race probes preserve findings. |
| Notebook/runtime | No .ipynb found in the workspace. Colab assumptions cannot be validated against this application. |

## Complete pipeline trace

This is the actual path, with browser-owned recording/transcription collapsed rather than pretending there is an audio-file pipeline:

```text
TalkButton.toggle -> VoiceLoop.listen -> BrowserSpeechToText.start
 -> browser recognizer result transcript
 -> TalkButton.handle -> VoiceConversation.resolve -> route
 -> [only if unresolved: routeWithFallback -> authenticated Django RouteView
     -> safe_route -> HybridProvider -> OllamaProvider -> optional HttpJsonProvider]
 -> performAction -> navigation/data/confirmation + response text
 -> wrapped BrowserTextToSpeech.speak -> speechSynthesis -> browser audio
 -> handler/confirmation completion -> 700 ms delay -> listen again
```

| Stage / responsible file-function | Input -> output | Dependencies / connection | Failure points |
|---|---|---|---|
| Activation: TalkButton.toggle, loop.ts start/listen | Tap -> active listening session | UI's current language adapter; direct connected callback to handle | Unsupported API, current synthesis speaking, UI/session cancellation races |
| Capture/recognition: stt.ts start | Browser microphone stream -> final transcript callback | SpeechRecognition/webkitSpeechRecognition; format/model/provider are browser-owned | Permission, device, unsupported locale, start exception, browser provider/network, silence |
| Audio recording/preprocessing | No separate app output | No file recording stage to connect | No audio inspection or format validation; empty/noisy recordings cannot be directly submitted |
| Transcript ingestion: TalkButton.handle | Trimmed text -> selected command/clarification | activeProfile, getFamilyMembers, language/slow-speech metadata | Profile missing returns silently; repository errors; async request may outlive sheet/session |
| Context/rules: conversation.ts resolve, router.ts route | Text/state/language/family -> intent + string slots or null/text | Synchronous rules connect directly to performAction; game keys hardcoded | Ordering, synonym gaps, stale context, negation, date/recurrence and hour ambiguity |
| Fallback: fallback.ts routeWithFallback | Text + UI language -> validated command/null | Online + build flag; apiClient; 15 s frontend abort | Disabled flag, stale navigator.onLine, auth/refresh/timeout/server error; local server cannot be reached when UI declares offline |
| Backend: views.py RouteView.post, providers.py safe_route | Authenticated JSON -> intent/slots/confidence/source | 20 requests/min; nonempty utterance <=500; supported language; local then opted-in cloud | DB/auth unavailable, invalid JSON/shape, malformed/nonfinite confidence, invalid slots, provider/model unavailable |
| Execution: actions.ts performAction | Command/profile/context -> side effect and response | Existing routes, db/outbox, repositories, confirms and callbacks | Unsupported target, incorrect game, storage failure, missing family phone, confirmation resolver overwrite; actual page/action acceptance NOT VERIFIED |
| Response text: wrapped tts.speak in TalkButton | Response string -> visible response then speech promise | setResponse before calling browser playback; confirmation prompt separately rendered | English-only strings, date/time omitted from reminder prompt, speech cancellation can continue later action, processing errors mislabeled |
| Synthesis/playback: tts.ts speak | Text -> utterances -> promise completion | Browser voices and speechSynthesis; actual audio NOT VERIFIED | No output API/voice, provider errors, hung utterance timeout; default voice may not speak target language intelligibly |
| Turn completion: loop.ts schedule | Handler/confirmation resolved -> next recognizer start | 700 ms timer; generation prevents obsolete loops restarting | Handler itself not cancelled; UI phase can disagree with loop active state; indefinitely awaited confirmation or unresolved repository |

The components are connected in source, and boundary tests exercise parts of these connections. The main fake-integration risk is evidentiary: tests mock action/persistence/providers, so their passes are not proof of live navigation, durable saves or actual audio. Separate frontend and backend game catalogs demonstrably disagree.

## Game recognition tests

Commands below were actually run through the deterministic frontend pipeline.

| Input | Expected game | Detected game / result | Outcome |
|---|---|---|---|
| Start Sequence Recall | sequence_recall | sequence_recall | PASS |
| Start Memory Match | memory_match | memory_match | PASS |
| Start Find the Change | find_the_change | no game slot; catalog | FAIL |
| Start Object Sorting | object_sorting | object_sorting | PASS |
| Start Daily Routine Builder | daily_routine | no game slot; catalog | FAIL |
| Start Word Recall | word_recall | no game slot; catalog | FAIL |
| Start Visual Search | visual_search | no game slot; catalog | FAIL |
| Start Pattern Completion | pattern_completion | no game slot; catalog | FAIL |
| Start Spatial Recall | spatial_recall | no game slot; catalog | FAIL |
| Start Attention Tap | attention_tap | no game slot; catalog | FAIL |
| Start Association Game | association_game | no game slot; catalog | FAIL |
| Start Personal Memory Recall | personal_memory | no game slot; catalog | FAIL |
| Start sequence game | sequence_recall | no game slot; catalog | FAIL |
| Start matching game | memory_match | no game slot; catalog | FAIL |
| Start sorting game | object_sorting | no game slot; catalog | FAIL |
| Start routine game | daily_routine | no game slot; catalog | FAIL |
| Start word game | word_recall | no game slot; catalog | FAIL |
| Start pattern game | pattern_completion | no game slot; catalog | FAIL |
| Start personal memory game | personal_memory | memory_match; wrong game | FAIL |

## Reminder detail tests

| Request | Task | Time | Date/day | Ambiguity / result |
|---|---|---|---|---|
| Remind me to take medicine at 8 PM | take medicine | 20:00 correct | omitted -> action defaults today | Parsing passes; real save NOT VERIFIED |
| Remind me about my tablets tonight | lost | lost | lost | medicines_today, not reminder/follow-up |
| At 7 tomorrow morning remind me to drink water | lost | lost | lost | unknown |
| Remind me to call my daughter at 5 | call my daughter | 05:00 | omitted -> today | Does not clarify AM/PM; potential past time |
| Set a reminder for my medicine | lost | missing | missing | medicines_today instead of asking time |
| Remind me after lunch to take my tablets | lost | lost | missing | medicines_today; no clarification about lunch time |
| Remind me in 20 minutes to drink water | drink water | 15:50 at fixed test clock | 2026-09-17 | Correct relative calculation |
| Remind me to drink water tomorrow at 8 PM | drink water (trailing whitespace accepted) | 20:00 | 2026-09-18 | Correct day/time |
| Remind me to drink water every day at 8 PM | drink water every day | 20:00 | omitted -> today only | Recurrence silently lost |
| Remind me to drink water on Friday at 8 PM | drink water on Friday | 20:00 | omitted -> today | Requested weekday silently lost |
| Remind me to drink water; then tomorrow at 8 PM | pending task retained | follow-up not parsed | not parsed | null route for natural follow-up |
| Same pending task; then 8 PM | drink water | 20:00 | omitted -> today | Bare-time follow-up works |
| Remind me to drink water at 13 PM / 25:00 | not executed | rejected | none | Valid-time clarification |
| Remind me in 0 minutes to drink water | not executed | rejected | none | "Please choose a shorter reminder time" is misleading for zero |

## Conversational fallback test

Actual deterministic routing below; fallback responses are all NOT VERIFIED. Local /api/tags request timed out after 3001 ms, with no response received. Ollama executable exists, but that does not prove service/model availability. No installation, model pull or server startup was performed during audit.

| Input | Rule result | Live answer assessment |
|---|---|---|
| Why are we playing this game? | null -> fallback eligible | NOT VERIFIED |
| What is memory? | null -> fallback eligible | NOT VERIFIED |
| Explain this activity. | null -> fallback eligible | NOT VERIFIED; no activity context supplied |
| I'm confused. | help -> deterministic response | No LLM request; generic help script only |
| What should I do now? | null -> fallback eligible | NOT VERIFIED |
| Why do people forget names? | null -> fallback eligible | NOT VERIFIED |
| Tell me something interesting. | null -> fallback eligible | NOT VERIFIED |
| What can you help me with? | null -> fallback eligible | NOT VERIFIED |

Relevance, clarity, spoken length, actual tone, hallucinations and medical overclaiming cannot be evaluated without real answers. The prompt requests short friendly answers and bans diagnoses/treatment, but validators only require a nonempty response of at most 2000 characters per slot. num_predict=350 is not an elderly-friendly spoken-answer limit. Model suitability for the actual CPU/GPU/memory runtime is NOT VERIFIED.

## Actual and injected failure conditions

| Condition | Exercised? | Observed behavior |
|---|---|---|
| Nonsense sentence | Actual deterministic input | unknown |
| Half-finished "Start" / very short "x" | Actual deterministic input | unknown |
| Wrong game "Play banana rocket" | Actual deterministic input | generic start_game, no clarification |
| Empty utterance | Actual deterministic input | null/unknown; UI blank submit ignored |
| Empty STT transcript | Injected recognition event | no result callback |
| Microphone permission denied | Injected provider error | not-allowed and end callback; actual OS/browser denial NOT VERIFIED |
| Silence | Injected timer/recognizer | recognizer stopped and end callback; actual silence/noise acoustics NOT VERIFIED |
| STT unsupported/start throws | Injected provider conditions | structured unsupported/start-failed and end callback |
| Background noise, accents, empty audio file | NOT VERIFIED | No live microphone/acoustic fixtures or app audio-file interface |
| Ollama live availability | Actual local health probe | No response; timed out after 3 s. Cause not established. |
| Model missing | NOT VERIFIED live | Exception path reviewed; no real model response/error obtained |
| LLM timeout/malformed JSON | Existing mocked backend tests | gracefully returns None; no escaping exception |
| Invalid intent/confidence/slots/route | Existing unit tests | rejection; no arbitrary section navigation |
| Missing TTS | Injected API absence | speak resolves without audio |
| TTS error/thrown exception | Injected provider | promise resolves; does not trap turn |
| Hung TTS | Injected provider and timer | timeout calls cancel and resolves |
| TTS cancellation | Injected provider | unfinished sentence resolves; later sentences not spoken |
| Repeated turns | Existing fake-loop test | resumes after handler, stops on stop-listening |
| Closing during delayed fallback | New React UI probe | performAction still called after close: defect reproduced |
| Repeated typed execution | New React UI probe | two outstanding requests and two actions: defect reproduced |
| Runtime reconnect / Colab reset | NOT VERIFIED / absent implementation | No notebook/reconnect mechanism to exercise |

## Elderly-friendly review

Helpful aspects, verified at text/control and logic boundaries: large Yes/No controls, typed alternative, ordinary error text suggests typing, optional slow speech, confirmations for reminder/call/SOS.

Problems: no repeat-last-answer capability; unfamiliar synonyms fail; wrong game can open without explanation; ambiguous reminders do not show resolved date/time; failure to save or process uses "I could not hear you"; Help hides emergency wording; English strings are spoken even when another locale is selected; read-this can read an entire main element without length bound; listening is paused during confirmations, so speaking Yes/No is not implemented; all activity explanations are generic/no current activity context. Real audibility, comprehensibility, voice naturalness and usability with elderly users are NOT VERIFIED. No clinical effectiveness claim is made.

## Latency

Observed standalone Node microbenchmark, 10,000 calls of context + deterministic reminder parsing:

- p50: 0.048 ms; p95: 0.067 ms; max: 1.345 ms.
- This excludes profile/repository access, browser work, network, inference, synthesis and actual audio. It is not total response latency and not a browser-device benchmark.
- Recording end -> transcription: NOT VERIFIED.
- LLM request -> successful response: NOT VERIFIED. Failed health probe observed 3001 ms timeout.
- Response -> first audible TTS: NOT VERIFIED.
- Total real voice response time: NOT VERIFIED.
- Configured budgets, not measurements: local provider 8 s, optional cloud 3 s, frontend fallback 15 s; next listening turn waits 700 ms after handler completion; STT stops at 6 s without results; TTS watchdog max(10,000 ms, sentence length * 250 ms), slow inter-sentence gap 400 ms.

Slowest actual successful stage cannot be established. Deterministic routing itself is unlikely to dominate compared with unmeasured inference/audio/repository work; this is an inference, not an observed end-to-end result.

## Colab reliability

No notebook found. Ollama installation cells, background process management, model downloads, GPU detection, browser recording JS, audio paths, repeated setup execution and top-to-bottom cell ordering are MISSING from the supplied artifact. New-user Colab run: NOT VERIFIED; cannot audit an unavailable notebook. Actual app startup does not manage Ollama readiness. Vite flags must be set at build time; example env values are not runtime evidence. Development compose points local inference at host.docker.internal by default; reachability of that host alias in a user's Docker environment is NOT VERIFIED.

## Security / privacy

- App-owned audio files/recording persistence: none found in the assistant. Browser recognizer retention and provider-side audio storage are NOT VERIFIED.
- Browser STT processing location is unknown from the adapter. Do not describe this system as guaranteed local/private/offline STT.
- Deterministic router and context run in the browser. Reminder data writes locally and enters the app outbox.
- Frontend fallback sends utterance/language through the authenticated app API. Backend local inference sends those strings to the configured Ollama URL. A configurable URL is not necessarily localhost or private.
- Optional HttpJsonProvider sends utterance/language to a remote endpoint when cloud fallback is enabled and local routing fails. No profile/family record is included, but an utterance can itself contain health-related information.
- CLOUD_LLM responses show an Online assistant label; there is no equivalent provider disclosure for browser transcription.
- VITE_VOICE_DEBUG=1 logs intent, reminder parameters, confidence and latency to browser console. Reminder task titles may be sensitive. Leave off; broader infrastructure/browser log retention NOT VERIFIED.
- Router token is read server-side and not in the frontend voice request. No embedded voice-provider API key was found. Repository examples contain development credentials; they are not production secrets and must not be deployed as credentials.
- Dexie encryptedStorage middleware is connected in schema.ts and seals patient rows/outbox payloads via vault. Indexed routing/scheduling fields remain unencrypted. This implementation is not proof of whole-system confidentiality; no raw-store/persistence audit was conducted here.
- API authentication, supported input types/lengths, 20/min user throttling, bounded provider response bytes, confidence checks, and section/game allowlists reduce execution risk. These do not validate the truth/safety of conversational model text.
- No conversation logger/notebook-output secret printing was found in the voice module. Full application security audit, deployment transport, browser provider policies and provider retention are out of scope/NOT VERIFIED.

## Reproduction and changed files

- Run original scoped suite from frontend: npm test -- --run src/voice src/shared/ui/TalkButton.test.tsx
- Run UI race probes: npm test -- --run src/shared/ui/VoiceAuditProbe.test.tsx
- Run standalone matrix/recovery harness from repository root: node docs/audits/voice-audit.cjs
- Backend: .venv/bin/pytest apps/voice/tests -q (requires reachable test PostgreSQL for six API tests)
- Frontend: npm run typecheck (currently fails in integrated game catalog)

Audit harness transpiles actual TypeScript using installed TypeScript and executes router/conversation/reminder helpers; it does not replace routing with copied regular expressions. DB is stubbed when loading the pure reminder helper; recognition/synthesis recovery providers are explicitly injected. UI probes deliberately assert the currently observed defects, so they are diagnostic evidence, not desirable regression invariants after repair. No service, model, database or assistant implementation was installed/changed. Existing user game integration edits were preserved.
