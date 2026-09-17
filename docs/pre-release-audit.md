# SMĀRANA final audit and demo runbook

Audit date: 17 September 2026. This pass preserves the existing Django/DRF,
PostgreSQL and React PWA architecture and the working tree's earlier DDA/voice
work. This document supersedes earlier demo instructions about Admin TOTP.
The demonstration uses fictional accounts, practice assets and synthetic model
history. It is not a clinically validated intervention or diagnostic system.

## Important findings and repairs

| Priority | Finding | Repair / evidence |
| --- | --- | --- |
| High | Local patient media was served without authentication | Assignment- and consent-checked streaming in `patients/media_views.py`; bearer-authorized frontend image fetch; private/no-store responses; patient, caregiver, doctor, foreign-account and deleted-memory tests. Signed S3 requests never receive the application's bearer token. |
| High | Query results could survive an account change | A query client per authenticated account, keyed provider remount and cancellation of retired queries; real observer/cache regression. |
| High | Several malformed JSON, UUID/date and prescription inputs could crash APIs | Object-only JSON parser, safe model-validation handling, routine recurrence/date and strict dose-time validation; real parser/API/database regressions. |
| High | Voice daily reminders became one-off records on sync | Validate and persist the actual recurrence through the existing encrypted outbox; backend replay and browser confirmation/persistence checks. |
| High | Recurrence edits left obsolete future doses and offline pending times stayed stale | Reconcile future, unanswered instances after rule/prescription edits and when reading reminders; retain past doses and recorded responses. Encrypted offline generation follows the same rule. |
| High | Reverse relationships used an unfiltered soft-delete manager | Make the active-record manager the default for routine, family and capsule relationships, with forward manager migrations; deleted records remain available for explicit audit/history access. Patient API, quiz and relationship regressions verify exclusion. |
| High | DDA history corruption and incomplete synthetic seed records could prevent inference | Conservative hold around optional inference, bounded/preloaded history, repair only explicitly synthetic seed metrics, and model failure/parity tests. |
| High | An enabled rule fallback could adapt after model/history failure | Model failures always hold; out-of-domain inputs have a separate status and an explicitly optional rule engine. Local and Compose demo defaults now hold. |
| High | Legacy game and clinician inputs allowed levels above five | Bound public game, event, baseline, override and cap inputs to 1–5; migration clamps current game definitions/states. Historical sessions and change logs are retained. |
| Medium | Admin required OTP and its transfer action had no usable doctor selector | Password/CSRF/Admin-role site, hidden OTP device management and permission choices, restored password profile field, approved-doctor selector, success message and atomic transfer; historical OTP migrations/devices retained. |
| Medium | Actual compressed photo uploads lost their filename and failed validation | Preserve the original filename after compression, submit one multipart capsule request and roll back database records on upload failure; real Chromium upload and ownership checks. |
| Medium | Ending an assignment without a reason could raise a server error | Inline form validation with a field error; history is ended rather than deleted. |
| Medium | Orientation caching replaced fuller patient preferences | Merge the stored profile and use a cancellable, bounded API request. |
| Medium | Optional audio, progress failures and exit persistence could leave errors or hanging UI | Defensive TTS cancellation/availability checks, explicit progress failure state, API request deadlines, exit rejection handling and no empty session on never-started navigation. |
| Medium | Slow utterances were cut off after six seconds | Six-second idle timeout; speech detection allows up to thirty seconds and waits for final recognition; lifecycle tests cover a fourteen-second utterance, denial, unsupported engines and cleanup. |
| Demo | Enlarged game text overflowed a 360px screen and scaled navigation line heights overlapped persistent controls | Flexible header/difficulty wrapping, bounded navigation line heights and wrapping labels; WCAG scans, runtime/overflow checks and explicit SOS/navigation geometry checks in both themes. |
| Demo | Startup printed successful URLs with a busy backend port | Required-tool and free-port checks, process checks and both HTTP health responses before printing success. Restart no longer resets synthetic account assignments. |
| Demo | The frontend Admin proxy changed the host and broke CSRF login | Preserve the original Admin request host; test the actual password login and profile through the frontend preview. |

## Run the real local demo

Required: Node 22.18 or newer, Python **3.12**, and PostgreSQL server/client
executables (`initdb`, `pg_ctl`, `psql`, `createdb`) on PATH, plus curl and ripgrep.
Run PostgreSQL as your normal account. If your distribution keeps its server
executables outside PATH, add its PostgreSQL `bin` directory first.

From the repository root:

```sh
python3.12 -m venv backend/.venv-dda
backend/.venv-dda/bin/python -m pip install -r backend/requirements-dda.txt
SMARANA_FRONTEND_PORT=5190 SMARANA_BACKEND_PORT=8010 bash scripts/start-local.sh
```

Keep that command running. It installs frontend dependencies if missing, starts
a loopback-only PostgreSQL server on **55440**, creates `smarana_local`, migrates,
seeds fictional accounts once, validates the trusted bundled RF artifact, adds
marked DDA warm-up observations where needed, builds the production frontend and
starts it with Django. Open **http://127.0.0.1:5190** after the URLs appear.
Ctrl+C stops services started by this invocation. Repeating the command preserves
saved data. Use different free ports if needed; defaults are 5173/8000.

Storage and logs are ignored Git files under `.local/`: database, private local
media, `backend.log`, `frontend.log`, `build.log` and initial seed output.
`SMARANA_LOCAL_DB_PORT` overrides 55440; `SMARANA_DEMO_PYTHON` selects an existing
compatible Python executable. Do not delete `.local/` to repair a browser cache.

| Role | Login | Secret (fictional local demo only) |
| --- | --- | --- |
| Patient | RAO1234 | PIN 1234 |
| Caregiver | priya@example.com | SmaranaDemo123! |
| Doctor | deka@example.com | SmaranaDemo123! |
| Admin | admin, via `/portal/admin` | SmaranaDemo123! |

The existing Compose workflow remains `cp .env.example .env`, `make up`,
`make seed`. PostgreSQL, Redis/Celery and private MinIO are provisioned by Compose;
the host-only local demo uses eager tasks and local media instead. The optional
ML Docker override is documented in `hackathon-dda-demo.md`. Do not run seed
commands against real patient records: they intentionally reset fictional users.

For a separate frontend/backend development session against the same local DB:

```sh
# Terminal 1, backend/; PostgreSQL must already be running.
export POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55440
export POSTGRES_USER=smarana POSTGRES_DB=smarana_local
export DJANGO_SETTINGS_MODULE=config.settings.local
.venv-dda/bin/python manage.py migrate
.venv-dda/bin/python manage.py runserver 127.0.0.1:8010

# Terminal 2, frontend/
npm ci
VITE_API_PROXY_TARGET=http://127.0.0.1:8010 npm run dev -- --port 5190
```

## Voice setup and verified behavior

Talk uses browser Web Speech recognition and browser speech synthesis. There is
no server audio-upload, sample-rate conversion, Whisper or cloud TTS pipeline in
this repository. Recognition availability, network use and available voices
depend on the browser/OS; localhost or HTTPS is required for microphone use.
The UI discloses provider dependence and offers a typed request field when
recognition is unsupported or denied. Assamese recognition may retry Bengali if
the browser rejects its locale. This is a documented approximation, not proof of
Assamese transcription quality.

Core application commands run deterministically from the shared game metadata:
`Start/Play/Open Sequence Recall`, `Play a memory game`, `Start a game`,
`Stop/End/Quit game`, `Open my reminders`, `What reminders do I have?`,
`What's my schedule?`, `Show my progress`, `How am I doing?`,
`Repeat instructions`, `Give me a hint`, `Go home`, `Open dashboard`, `Help`.
Hints activate the game's own control and obey its phase and remaining budget.
Game launch opens the real game; games with a Start control still wait for it.
Stopping leaves the game and lets its existing transport persist the checkpoint.

Reminder creation collects missing task/time details, shows a confirmation and
writes a real routine through the AES-GCM encrypted Dexie/outbox path. Online
sync persists it in PostgreSQL; offline records remain queued until reconnect.
Every-day recurrence is supported. Ambiguous `morning`/`evening` requests ask for
a time rather than guessing a medicine schedule. Dates/times use India time.
Changing language and interrupting a turn cancels stale actions/playback.

Optional local conversation: install Ollama separately and pull the configured
model, then configure the **backend** environment:

```sh
ollama pull qwen2.5:1.5b
export LOCAL_LLM_PROVIDER=ollama
export LOCAL_LLM_MODEL=qwen2.5:1.5b
export LOCAL_LLM_URL=http://127.0.0.1:11434
export LOCAL_LLM_TIMEOUT=8
export VITE_VOICE_LLM_FALLBACK=1
```

Restart/rebuild the demo after changing these values. The authenticated
`/api/v1/voice/readiness/` endpoint reports configured local model readiness.
Docker uses a reachable host address, normally `http://host.docker.internal:11434`.
Unknown conversation uses local inference first; application commands bypass it.

Remote fallback is opt-in with `VOICE_LLM_FALLBACK=true`,
`VOICE_ROUTER_ENDPOINT` and optional `VOICE_ROUTER_TOKEN` on the backend.
The existing remote contract returns a JSON object with `intent`, string-valued
`slots` and numeric `confidence`; conversational replies use `general_chat`
and `slots.response`. This is not a generic OpenAI chat-completions URL.
The remote timeout is three seconds; replies are size/type/confidence/safety
checked. No profile/history is appended, but the spoken utterance itself can
contain personal information. Tokens must never use a `VITE_` environment name.
Model responses cannot execute application actions.

Provider protocol, malformed replies, quota/timeouts/unavailable behavior,
bounded replies, stale turns, STT events and TTS overlap/cancellation/error
handling are tested. Browser action integration tests exercise the typed
no-audio fallback against the real backend. **Actual microphone/audio recognition
and audible native-voice playback were unavailable here.** The local Ollama
service responded, but its installed-model list was empty. Actual readiness
reported `model_missing`, and an actual failed inference safely returned no
conversation result. No installed model inference or credentialed remote
inference was validated; do a physical device voice check
before the jury demo and retain typed input as the reliable fallback.

## DDA evidence

Real game metrics flow through `/api/v1/game-events/` and session APIs into
patient/game-scoped difficulty state and history. The optional artifact is
checksum-validated and checked against twenty feature parity cases and five saved
RF predictions; tests exercise actual RF promotion/demotion, session persistence,
doctor locks/caps and corrupted/unavailable inference. The first three prior
sessions are a cold-start hold. Each adjustment is at most one level; public
levels are 1–5 and clinician limits prevail. No random adaptation is used.
History loading is bounded and difficulty changes are prefetched.

Local and Compose demo settings default to `DDA_RULE_FALLBACK=false`: unavailable
inference, corrupt history and features outside the synthetic training domain
hold difficulty. Optional `DDA_RULE_FALLBACK=true` permits the existing
deterministic engine only for validated features outside the model's domain,
labelled `model_status=model_out_of_domain`; it never substitutes an adjustment
after an artifact/history/inference error. A failed optional feature builder
holds safely; gameplay and encrypted queued metrics remain usable.
Only load trusted joblib files: serialization is not a safe upload format.

## Validation and coverage

Verified locally on 17 September 2026:

| Command / check | Result |
| --- | --- |
| Backend `pytest -q` (PostgreSQL, optional ML installed) | 265 passed |
| Backend `ruff check .` | Passed |
| Backend `mypy --strict apps config conftest.py manage.py` | Passed, 246 source files |
| Django `check` | No issues |
| Django `makemigrations --check --dry-run` | No changes detected |
| Django `migrate` | Current state clamps and three soft-delete manager migrations applied successfully |
| Django `validate_dda_model` | 20 feature cases and 5 RF predictions verified |
| Frontend `npm test -- --run --maxWorkers=2` | 789 passed, 63 test files |
| Frontend `lint`, `typecheck`, `i18n:check`, `copy:check` | Passed, locale checks cover 694 keys |
| Frontend `npm run build` | Production bundle and PWA generated successfully |
| Real-backend `npx playwright test --workers=1` | 13 passed, including both mobile themes and Admin access transfer/revocation |
| Frontend `npm audit --audit-level=high` | 0 known vulnerabilities |
| Backend exact installed-version `pip-audit` (including optional ML runtime) | No known vulnerabilities found |
| Locale checker `node --test scripts/check-i18n.test.mjs` | Passed |
| Live frontend/backend health | Both HTTP 200 |
| Live Ollama missing-model probe | Readiness `model_missing`; HTTP 404 inference recovered safely |

Run checks from the correct directory with the local database running:

```sh
# backend/
export POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55440
export POSTGRES_USER=smarana POSTGRES_DB=smarana_local
DJANGO_SETTINGS_MODULE=config.settings.test .venv-dda/bin/pytest -q
.venv-dda/bin/ruff check .
.venv-dda/bin/mypy --strict apps config conftest.py manage.py
DJANGO_SETTINGS_MODULE=config.settings.local .venv-dda/bin/python manage.py check
DJANGO_SETTINGS_MODULE=config.settings.local .venv-dda/bin/python manage.py makemigrations --check --dry-run
DJANGO_SETTINGS_MODULE=config.settings.local .venv-dda/bin/python manage.py validate_dda_model

# frontend/
npm run lint
npm run typecheck
npm run i18n:check
node --test scripts/check-i18n.test.mjs
npm run copy:check
npm test -- --run --maxWorkers=2
npm run build
VITE_API_PROXY_TARGET=http://127.0.0.1:8010 SMARANA_BACKEND_URL=http://127.0.0.1:8010 SMARANA_REAL_BACKEND=1 npx playwright test --workers=1
```

Install Playwright Chromium first if it is not already present. Playwright builds
and starts an independent preview on 4173, so leave that port free. Its real tests
modify fictional demo data, including an Admin transfer of Rao to Dr. Deka.
Use one browser worker when testing shared seeded records and assignment changes.
Without `SMARANA_REAL_BACKEND=1`, real integration cases are skipped.

Dependency auditing used `npm audit --audit-level=high` and a temporary
`pip-audit` installation outside the application environment. The backend audit
used an exact freeze of every installed dependency with
`pip-audit --no-deps --disable-pip -r <installed-version-file>`; dependencies were
already fully enumerated, including scikit-learn/pandas/joblib/NumPy. These
results concern known advisories at audit time, not a security certification.

Coverage includes real PostgreSQL parser/permission/patient isolation and
idempotency tests, all twelve integrated components at levels 1–5, legacy game
logic/interaction, full representative integrated sessions, actual artifact
inference and encrypted media/outbox tests. Browser checks cover mobile WCAG/
overflow/runtime errors, English/Assamese/Bengali fallbacks and offline PIN unlock,
caregiver/doctor login, real offline gameplay/reminder replay, check-ins and PDF
downloads, confirmed voice-created routines, real capsule uploads/media ownership
and Admin password/profile/doctor access revocation. This is representative
coverage, not a claim that every game was manually completed at every level.

## Remaining limitations and deployment boundary

- Clinical validation, native-speaker review and culturally authentic content
  curation remain human work. Several integrated game instructions use explicit
  English fallback; professional screens and many voice dialogue responses are
  English. Telugu is partial; Manipuri/Mizo have disclosed English fallback.
- Browser recognition may require internet and may have unavailable regional
  voices. Offline typed commands and games are more predictable than offline STT.
- A cold browser needs an initial successful load/PWA installation and patient
  login before offline use. The app's optional features cannot make an uninstalled
  app or expired server credential function as a fully online session.
- Local notifications and eager jobs are not evidence of real SMTP/SMS or
  deployed Celery/Redis delivery. Production Compose, HTTPS ingress, private S3,
  database TLS/backups, SMTP and monitoring need deployment-environment validation.
- The initial JavaScript bundle remains large (about 1.55 MB / 402 KB gzip), and
  PWA precaching includes about 10 MB of practice assets. Allow first installation
  to finish on a good connection; subsequent offline loads use cached assets.
- This is a local demonstration, with loopback trust database authentication and
  development settings. Production settings reject weak credentials/wildcard
  hosts and enable secure cookies/HSTS/throttling; do not expose the local demo
  to real users or store real patient data in it.

## Minimal jury checklist

1. Start the command above and wait for successful URLs. Open 5190 in a fresh
   browser profile, log in as RAO1234 / 1234, dismiss the first-use instructions
   and allow the service worker to finish installing.
2. Complete a game (Pattern Completion or Visual Search), show saved progress and
   the doctor's performance trend. Describe DDA as a synthetic adaptive-game demo.
3. On the physical demo device, grant microphone permission and check Talk with
   `Play Sequence Recall`, `Repeat instructions`, `Give me a hint`, `Go home`.
   Keep the typed request field ready if recognition/voices are unavailable.
4. Confirm `Remind me every day at 8 PM to take medicine`, then show the routine
   and verify it remains after reconnect. For offline proof, disconnect only
   after installation/login, complete a game and reconnect to upload it once.
5. Sign in as Priya to show the uploaded capsule and schedule; Dr. Deka to show
   assigned performance indicators; Admin to show password profile and the usable
   doctor-transfer selector with no OTP option.
6. Keep the startup terminal open, power connected and a network fallback ready.
   Use only fictional records and state the speech/translation/model limitations.
