---
name: cognitive-games
description: How to build a cognitive game module for Smārana on top of the shared game engine. Use this whenever creating or modifying any game (Memory Match, Sequence Recall, Object Sorting, Tea Garden Attention, Bihu Rhythm Recall, Daily Life Sequencing, Familiar Place Recall, Who Is This, Word Pairs, Spot the Change, Festival Match, Sound Match), the game engine, round generation, metrics, break prompts, or regional content inside games.
---

# Building a game

Catalog & level knobs: `docs/08-games-catalog.md`. Engine/DDA: `dda-engine` skill. Copy & sizing: `docs/14-design-system.md`.

## The contract
A game is a folder `frontend/src/games/modules/<key>/` exporting a `GameModule`:

```ts
export const memoryMatch: GameModule = {
  key: 'memory_match',
  domains: ['memory', 'attention'],
  roundsForLevel: (level) => 4 + Math.floor(level / 2),
  buildRound: (level, rng, content) => ({ /* serialisable RoundSpec */ }),
  score: (round, answer) => ({ correct: boolean, partial?: number }),
  Render: MemoryMatchRound,   // React component; receives round, onAnswer, onHint
};
```

The **engine** (`games/engine/`) does everything else: session start, seeded RNG (seed stored so resume regenerates identical rounds), timing per round, metrics accumulation, fatigue detection, break prompt, end-of-session DDA, supportive end screen, persistence via `db/repo/games.ts`, and registration in `games/registry.ts`.

Backend: add a `GameDefinition` row via data migration in `apps/games/migrations/00XX_seed_<key>.py` with `key, name, cognitive_domains, min_level, max_level, is_regional, metrics_schema`.

## Round generation rules
- Deterministic from `(level, rng)`; no `Math.random()`.
- Pull images/audio/labels from `content` (the regional pack for the patient's region, falling back to the default pack). Never hard-code Assam-only assets in the module; the pack chooses.
- `RoundSpec` must be JSON-serialisable (resume writes it to Dexie).
- Level knobs are explicit functions at the top of the module (`gridFor(level)`, `previewMsFor(level)`), so a doctor can understand them from the code.

## Render rules
- Use `OptionGrid` for choices, `BigButton` for actions. Targets ≥ 64px.
- Correct: brief highlight + "Yes!" (i18n `game.correct`). Incorrect: highlight the right one + `game.its_here`. No red, no buzzer.
- Hint = `onHint()`; the engine counts it. Show the hint gently (dim distractors).
- No countdown numbers. Time limits (level ≥ 4) render as a soft progress arc.
- Drag-and-drop must also work as tap-then-tap.

## Metrics
The engine computes `accuracy, mean_reaction_ms, mistakes, hints_used, rounds, duration_ms`. A module may push extra `raw_events` via `onAnswer({ ..., extra })` — keep ≤ 20 KB per session.

## Tests for each game
- `buildRound` is deterministic for a fixed seed; respects level knobs at levels 1, 5, 10.
- `score` correct/incorrect cases.
- Render test: options count matches `RoundSpec`; hint calls `onHint`.

## Definition of done for a game task
Playable end-to-end from the games list in dev, at levels 1 and 8 (use `?level=` dev override), with the end screen showing a supportive message and a `GameSession` row created (or queued offline).
