# 10 — Voice Assistant Spec

Principle: **deterministic first, LLM last.** The spec's listed commands are a small closed set. A rule-based router handles them offline; an optional cloud LLM (behind `VITE_VOICE_LLM_FALLBACK=1`) handles the long tail online.

## Stack
- STT: `SpeechRecognition` (Web Speech API). Locale from the *locked* language: `en-IN`, `as-IN` (fall back to `bn-IN` if unsupported), `bn-IN`, `hi-IN`.
- TTS: `speechSynthesis`. Pick a voice matching locale; fallback order per language in `voice/voices.ts`. Rate: normal 0.95, slow 0.7. Pitch 1.0.
- Mic only activates on explicit tap of the "Talk to Smārana" button (or hold-to-talk). Visible pulsing mic indicator while listening; auto-stop after 6s silence.

## Intents (v1)

| Intent | Example utterances (en) | Slots | Action |
|---|---|---|---|
| `open_section` | "open memories", "show my medicines", "go to calm time" | section | navigate |
| `start_game` | "play memory match", "let's play a game" | game? | navigate to game or games list |
| `medicines_today` | "what medicines do I have", "did I take my tablet" | — | TTS summary of today's medicine reminders + statuses |
| `next_activity` | "what's next", "what time is it", "what day is it" | — | TTS orientation line |
| `set_reminder` | "remind me to drink water at 4" | title, time | creates a `custom` RoutineItem for today only (patient-created, source=patient) — requires confirmation |
| `call_person` | "call Priya", "call my daughter" | name/relationship | confirm → tel: |
| `read_this` | "read this to me" | — | TTS of current screen's main text |
| `speak_slowly` / `speak_normally` | — | — | toggle |
| `help` | "help", "I'm confused" | — | opens Confused mode (v1) or Home |
| `sos` | "emergency", "I need help now" | — | confirmation dialog, never auto-trigger |

Matching: lowercase, strip punctuation, tokenise; each intent has patterns per language in `voice/intents.<lang>.json` (regex with named groups). Names/relationships match against `familyMembers` (fuzzy: normalised Levenshtein ≤ 0.3). Sections and games match against i18n labels so "মেমোরি" works.

## Confirmation safeguards
Anything that calls, skips a medicine, deletes, or triggers SOS shows a dialog with big Yes/No, and TTS repeats the question. Misheard commands can't cause harm.

## Language lock
`Settings → Language` has a padlock toggle. When locked, voice recognition locale cannot change, and a voice command like "switch to Bengali" is ignored with "Language is locked. Ask Priya to change it."

## Slow speech
Toggle in Settings and on the assistant sheet. Persists in `accessibility.slow_speech`. Affects TTS rate and also adds 400ms pauses between sentences (split on `।` and `.`).

## Walkthrough (v1, T104)
On first visit to each section, TTS explains it once ("This is your Memories page. Tap a photograph to hear its story."). `meta.walkthroughSeen[section]` prevents repeats. "Replay instructions" button in every section header.

## LLM fallback (optional)
If no intent matches and online and flag on: POST utterance + list of intents to a backend endpoint `/voice/route/` that calls Groq (or any provider) with a strict JSON schema; the backend returns `{intent, slots, confidence}`; below 0.7 → "Sorry, I didn't catch that. You can say 'open memories' or 'what's next'." Never let the LLM produce free text for the patient.

## Testing
Intent router is pure: `route(utterance, lang, context) → {intent, slots} | null`. Unit test ≥ 40 utterances across en/as/bn. STT/TTS are wrapped in an interface with a fake implementation for tests.
