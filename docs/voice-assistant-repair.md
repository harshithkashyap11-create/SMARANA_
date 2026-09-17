# Hybrid voice assistant

## Inspection assessment

- WORKING: React Router patient routes, encrypted offline repositories/outbox,
  deterministic multilingual router, browser STT/TTS adapters, typed requests.
- PARTIALLY WORKING: optional HTTP JSON intent provider; no local-model priority.
- BROKEN: 8 PM interpreted as 08:00; arbitrary section/game slots used to build
  routes; listening ended after one utterance; missing spoken navigation feedback.
- MISSING: continuous turn lifecycle, reminder follow-up, local inference adapter,
  strict model confidence/slot checks, voice-loop regression coverage.

## Use

Sign in as a patient, then press **Talk**. Listening stops during responses and
confirmation dialogs and resumes after completion. Say **stop listening**,
**goodbye**, **exit**, or **quit**, or press Talk again, to stop. The request box
is text mode: it uses the same router/actions without requiring a microphone.
Responses appear as text even when speech output is unavailable.

Examples: `Hey Smarana, open my games`, `Open the memory game`, `Show my progress`,
`Take me home`, `Open caregiver details`, `What time is it`, `Help`.
Caregiver details maps to the patient's People screen, and profile maps to
patient settings: there is no separate patient profile route. Role-protected
caregiver/doctor/admin portals are deliberately not exposed as patient actions.

Reminders: `Remind me to take medicine at 8 PM`, `Remind me in 20 minutes to drink
water`, or `Remind me to take medicine` followed by `8 PM`. Tomorrow is supported;
pending reminder context expires after five minutes. Creation requires the existing
Yes/No confirmation dialog, saves atomically to IndexedDB/outbox, then confirms
success. Relative reminders use the application's Asia/Kolkata timezone and
minute precision. Arbitrary recurring/date phrasing and voice reminder deletion
are not implemented; use the existing schedule interface for management.

## Optional local intelligence

Install Ollama separately and pull the configured small instruction model:

```sh
ollama pull qwen2.5:1.5b
```

Set these variables in the environment used to start the backend/frontend:

```dotenv
LOCAL_LLM_PROVIDER=ollama
LOCAL_LLM_MODEL=qwen2.5:1.5b
LOCAL_LLM_URL=http://127.0.0.1:11434
LOCAL_LLM_TIMEOUT=8
VITE_VOICE_LLM_FALLBACK=1
```

Frontend Vite variables must be present at build time, not only at runtime.
For the host startup script, export these before running `scripts/start-local.sh`.
Compose forwards the settings; when Ollama runs on the host use a reachable host
address, not the backend container's loopback. An `.env.example` is a template,
not an automatically loaded backend configuration.

The adapter uses Ollama's JSON, non-streaming [chat API](https://docs.ollama.com/api/chat).
Rules execute first in the browser. Only unresolved requests reach local inference.
Local replies require confidence >= 0.8 and allowlisted intent/slots. Models never
generate executable frontend code. They can return short conversational responses.
The frontend uses the existing authenticated `/api/v1/voice/route/` API and React
Router; it does not need a second website, a CLI microphone, or a websocket.

## Cloud fallback

Preserves the existing configured HTTP JSON router; no vendor credentials were
found and no vendor is assumed. Set `VOICE_LLM_FALLBACK=true`,
`VOICE_ROUTER_ENDPOINT`, and optional `VOICE_ROUTER_TOKEN` to opt in. This remote
service must return `{intent, slots, confidence}`. It is used only after local
inference is unavailable, malformed, or insufficiently confident. Timeouts,
invalid output, and provider exceptions become a graceful clarification.
Only the utterance/language are sent, not the cached patient profile. Spoken
utterances can still contain sensitive information: obtain deployment consent
before enabling a remote service. Tokens stay server-side.

## Speech and offline limits

STT preserves the existing Web Speech API provider: supported browser, localhost
or HTTPS, and microphone permission required. It trims text, handles silence and
permission/device/start failures, and retains the Assamese-to-Bengali retry.
There was no Whisper implementation to preserve. Browser STT may require internet;
this is **not** a guaranteed offline microphone transcription system. Typed
navigation, games, reminders, help, and time/date work without cloud inference.

TTS uses browser speech synthesis and installed language voices. Provider errors,
missing output support, cancellation, and hung playback do not trap the loop.
The timeout cancels playback before listening resumes. STT/TTS adapters remain
replaceable. Wake-name prefix recognition is transcript-based, not a background
wake-word detector.

`VITE_VOICE_DEBUG=1` enables optional intent/source/confidence/parameters/latency
logging. It may include reminder titles; leave disabled in production.

## Verification

```sh
cd frontend
npm test -- --run src/voice src/shared/ui/TalkButton.test.tsx
npm run typecheck
npm run build
# In backend; override POSTGRES_HOST/PORT for a host-only database:
.venv/bin/pytest apps/voice/tests -q
```

Real microphone recognition, installed voice quality, and live Ollama/cloud
inference require their actual providers and manual hardware checks. Mocked
provider tests verify priority, bounded JSON output, malformed output, timeouts,
confidence checks, and recovery; they are not evidence of live inference.

Repair verification: 347 frontend tests passed, 15 backend voice tests passed
using the project's local PostgreSQL test database, and the frontend production
build/typecheck and scoped frontend/backend lint passed. The live browser loaded
and authenticated the demo, but the automation did not obtain a visible successful
assistant navigation result; live UI navigation remains a manual acceptance check.
