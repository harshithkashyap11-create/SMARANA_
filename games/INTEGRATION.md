# SMĀRANA games 7–12 — integration notes

Six new cognitive games, written to drop into the existing games 1–6 architecture.
No second registry, no second DDA client, no second metrics format, no second i18n system.

## A. What I assumed

You didn't attach games 1–6, so I built against the contract described in your brief rather than
guessing at your file names. Everything the games need from the outside world goes through **one
file**: `games/shared/gameBindings.jsx`. Rewire those three exports and the games are integrated.

```js
// games/shared/gameBindings.jsx  — replace the fallbacks with your real modules
export { default as GameLayout } from './GameLayout';
export { useTranslation } from 'react-i18next';
export { submitMetrics as submitGameMetrics } from './ddaClient';
```

Expected shapes are documented at the top of that file. The fallbacks that ship in it (a plain
layout, a key-humanising translator, a no-op metrics sink) exist so the games run and can be
reviewed standalone — delete them once the real bindings are in.

Two further shared files are **additive** and safe to delete if you already have equivalents:

| File | Why it exists | If you already have one |
| --- | --- | --- |
| `games/shared/rng.js` | seeded RNG so round generation is deterministic in tests | point the six `logic.js` imports at yours |
| `games/shared/useDifficultyController.js` | bounded 1–5 difficulty + DDA call + failure safety | inline it, or map it onto your existing hook |
| `games/shared/metricsShape.js` | the standard metric envelope + mean/SD/consistency helpers | pipe `buildStandardMetrics` output through your `buildMetrics` |
| `games/shared/games7to12.css` | elderly-first styling, every value falls back to a `--sm-*` token | fold the class names into your game stylesheet |

Nothing in games 1–6 is touched.

## B. Files created

```
games/
├── registry.games7to12.js          ← spread into your existing registry
├── __tests__/
│   └── games7to12.logic.test.js
├── shared/
│   ├── gameBindings.jsx            ← the only integration seam
│   ├── rng.js
│   ├── useDifficultyController.js
│   ├── metricsShape.js
│   └── games7to12.css
├── visual_search/        VisualSearch.jsx      config.js  logic.js
├── pattern_completion/   PatternCompletion.jsx config.js  logic.js
├── spatial_recall/       SpatialRecall.jsx     config.js  logic.js
├── attention_tap/        AttentionTap.jsx      config.js  logic.js
├── association_game/     AssociationGame.jsx   config.js  logic.js
└── personal_memory/      PersonalMemory.jsx    config.js  logic.js  sampleData.js

i18n/
└── en.games7to12.json              ← merge into your English bundle
```

## C. Files you need to modify

1. **`games/registry.js`** — one import and one spread:
   ```js
   import { GAMES_7_TO_12 } from './registry.games7to12';
   export const GAME_REGISTRY = [...existingGames, ...GAMES_7_TO_12];
   // object-keyed registry:
   // GAMES_7_TO_12.reduce((acc, g) => ({ ...acc, [g.id]: g }), existingRegistry)
   ```
   If your registry uses different key names (`titleKey` instead of `nameKey`, etc.), rename the
   keys in `registry.games7to12.js` — the values are what matter.
2. **Your English translation bundle** — deep-merge `i18n/en.games7to12.json`. It adds
   `games.common.*`, `games.<gameName>.*`, `items.*` and `relationships.*`. If `games.common.*`
   already exists, keep yours and drop the duplicates.
3. **`games/shared/gameBindings.jsx`** — the three exports above.
4. **Routing** — only if your router is not registry-driven. Routes are declared per game in the
   registry entries (`/games/visual-search`, `/games/pattern-completion`, `/games/spatial-recall`,
   `/games/attention-tap`, `/games/association`, `/games/personal-memory`).
5. **Stylesheet import** — import `games/shared/games7to12.css` wherever games 1–6 import theirs.

## D. Component contract

Every game has the same props, so the session runner treats all twelve identically:

```jsx
<VisualSearch
  initialDifficulty={2}        // clamped to 1–5 internally
  seed="optional-seed"         // deterministic rounds; omit in production
  submitMetrics={ddaSubmit}    // optional override of the bound DDA client
  onComplete={(metrics) => {}} // fired once at natural end of session
  onExit={(metrics) => {}}     // fired on early exit; metrics.early_exit === true
/>
```

`PersonalMemory` takes one extra prop, `dataProvider`.

## E. DDA pipeline

Each game collects its own round results, calls `buildMetrics()` from its `logic.js`, and passes the
envelope to `reportPerformance()` on the shared controller. The controller:

- adds `game_id` and the current `difficulty`,
- awaits your `submitMetrics`,
- normalises whatever comes back (`-1 | 0 | 1`, `{ adjustment }`, `{ difficulty_delta }`,
  `{ data: { adjustment } }`) to `-1 | 0 | +1`,
- clamps the result into 1–5 and applies it,
- and on **any** rejection keeps the current difficulty and marks the session `offline`. Play never
  stops, and there is no invented client-side "AI".

Reporting cadence is `reportEveryRounds` in each game's `config.js` (every 3 rounds for most, every
round for Attention Tap, which produces a full reaction-time distribution per round).

Difficulty means something different in every game — that's the point:

| Game | difficulty ↑ |
| --- | --- |
| Visual Search | bigger grid, more distractors, distractors from the target's own family, sometimes two targets |
| Pattern Completion | longer patterns, more rule types, more and closer answer choices, less rule support |
| Spatial Recall | larger grid, more objects, shorter observation, longer delay, two recall targets |
| Attention Tap | shorter (never <1.5 s) presentations, lower target frequency, near-miss distractors, inhibition rule at level 5 |
| Association Game | more pairs, same-category distractors, longer delay, recognition → cued recall |
| Personal Memory | **less support**: fewer contextual cues, fewer hints, recognition → relationship → cued recall |

## F. Personal Memory data flow

`PersonalMemory.jsx` never contains patient data. It calls `dataProvider.getItems()` and nothing else.

```js
import { createApiMemoryProvider, withCacheFallback } from './games/personal_memory/sampleData';

const provider = withCacheFallback(
  createApiMemoryProvider({ endpoint: '/api/memory-capsule/items/' }),
  yourExistingOfflineStore      // { read(), write(items) } — reuse yours, don't build a new one
);

<PersonalMemory dataProvider={provider} />
```

`sampleData.js` also exports `createSampleMemoryProvider()` (the default, used when no provider is
passed) and `normalizeMemoryItem()`, which maps both snake_case API payloads and camelCase objects
onto the item shape the game expects. All sample names are invented.

Two safeguards that are deliberate, not incidental:
- On two consecutive misses the game calls `stepDifficulty(-1)` itself — **more** support, without
  waiting for the DDA round trip.
- Metrics carry `recall_after_hint`, `items_needing_more_support` and `support_level` rather than a
  failure score, and the feedback copy never says "wrong".

## G. Accessibility and safety decisions

- Minimum touch target 4.5 rem, base text 1.25 rem, prompts 1.6 rem.
- `:focus-visible` outlines on every interactive element; the Attention Tap area responds to Space
  and Enter as well as tap.
- Attention Tap enforces a floor of 1500 ms per stimulus and 700 ms blank gap at *every* level
  (`MIN_STIMULUS_MS` / `MIN_GAP_MS` in its `config.js`). Nothing flashes, strobes or moves.
- Only transition anywhere is a 150 ms colour fade, and it's disabled under
  `prefers-reduced-motion`. `prefers-contrast: more` thickens borders.
- No countdowns are shown to the patient. The two games with a response window (Visual Search at
  levels 3–5) end the round quietly with "Let's try the next one" — no penalty language.
- Grids cap at 20 cells (Visual Search) and 16 (Spatial Recall) so cells stay large on a tablet.

## H. Offline behaviour

All gameplay is local: round generation, scoring and difficulty translation are pure functions with
no network dependency. A failed `submitMetrics` is caught, the session is flagged `offline` in the
layout, and play continues at the current difficulty. Personal Memory relies on the provider you
pass for cached content — `withCacheFallback` is a thin helper over *your* store, not a new sync
framework.

## I. Verification checklist

**Gameplay**
- [ ] Each of the six games loads from its route and from the game list.
- [ ] Visual Search: target card → grid → tap → feedback → next; level 4–5 needs both targets found.
- [ ] Pattern Completion: correct choice ends the round; three wrong attempts reveals the answer.
- [ ] Spatial Recall: objects visible only during observation; "I've looked" skips ahead; level 4–5 asks two locations.
- [ ] Attention Tap: one stimulus at a time, visible gap between them, taps in the gap are counted as false alarms.
- [ ] Association Game: learning phase shows every pair; level 5 questions require "Show the choices".
- [ ] Personal Memory: hint button always available; a hint after 12–30 s of inactivity appears on its own.

**Difficulty 1–5** (pass `initialDifficulty` directly)
- [ ] All five levels render for all six games.
- [ ] Out-of-range values (0, 9, `"3"`, `undefined`) clamp instead of crashing.
- [ ] Level 5 Attention Tap shows the inhibition rule and the rule's stimulus appears in the sequence.
- [ ] Level 1 Personal Memory shows relationship on the card; level 5 shows no context.

**DDA**
- [ ] `+1` raises difficulty by one and the next round is visibly harder; `-1` lowers it.
- [ ] At difficulty 5 a `+1` is ignored; at 1 a `-1` is ignored.
- [ ] Reject the metrics promise → play continues, difficulty unchanged, `offline` chip appears.
- [ ] Backend returning garbage (`null`, `"yes"`, `{}`) → treated as 0.

**Metrics**
- [ ] Every payload has the twelve standard keys plus `meta` (the test suite asserts this).
- [ ] Early exit sets `early_exit: true` and `completed: false`.
- [ ] Attention Tap reports `reaction_time_sd_ms` and `sustained_attention_consistency`.
- [ ] Personal Memory reports no failure score.

**Responsive / accessibility**
- [ ] 360 px wide phone and 768 px tablet: no horizontal scroll, buttons full-width on phone.
- [ ] Keyboard only: tab to every control, visible focus ring, Space/Enter taps in Attention Tap.
- [ ] Screen reader announces the prompt, the grid cells by name, and feedback via `aria-live`.
- [ ] OS "reduce motion" on: no transitions.

**Offline**
- [ ] DevTools offline → all six games play to completion.
- [ ] Personal Memory with a failing provider and no cache shows the "no memories saved yet" screen, not a crash.

**Routing and registry**
- [ ] All twelve games appear once in the registry; no duplicate ids or routes.
- [ ] Session generator can read `cognitiveDomain`, `estimatedDurationMin`, `enabled`, `ddaProfile`, `supportsOffline`, `supportsVoice` for the new six.

**Games 1–6 regression**
- [ ] All six original games still build, route, play and submit metrics unchanged.
- [ ] Shared components and DDA client are byte-identical to before this change.
- [ ] Translation bundle merge didn't clobber existing `games.common.*` keys.

## J. Tests

`games/__tests__/games7to12.logic.test.js` covers grid/target generation, pattern continuation and
answer-choice validity, object placement and grid distance, stimulus timing floors and hit/miss/
false-alarm scoring, association choice generation and confusion tracking, personal-memory prompt
building and hint ordering, difficulty clamping, adjustment normalisation, and metric-shape parity
across all six games. It's written for Jest/Vitest globals — move the cases into your existing suite
if games 1–6 use a different helper style.
