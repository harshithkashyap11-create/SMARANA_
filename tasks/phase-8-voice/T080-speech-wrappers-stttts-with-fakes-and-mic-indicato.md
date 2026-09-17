# T080 — Speech wrappers (STT/TTS) with fakes and mic indicator

**Phase:** 8 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T023b

## Read first
- `docs/10-voice-assistant-spec.md`

## Touches
- `frontend/src/voice/stt.ts`
- `frontend/src/voice/tts.ts`
- `frontend/src/shared/ui/TalkButton.tsx`

## Goal
`SpeechRecognition`/`speechSynthesis` behind interfaces with fakes; Talk button with pulsing indicator; locale/voice selection per language with fallbacks.

## Scope (do exactly this)
- `stt.ts` (start/stop, 6s silence auto-stop, interim results off, locale from locked language with fallback table); `tts.ts` (voice selection, rate normal/slow, sentence pauses).
- `TalkButton` in patient top bar; bottom sheet showing 'Listening…' and the recognised text; explicit tap to start.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Intents (T081).

## Acceptance criteria
- [ ] Vitest with fakes: start/stop lifecycle; fallback locale for `as`; slow rate applied.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
