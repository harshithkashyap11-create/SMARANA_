# 08 — Games Catalog (12 games)

All games are built on the **game engine** (T030): it owns the session lifecycle (`start → rounds → end`), timing, metrics accumulation, fatigue detection, the DDA call, the supportive end screen, persistence (offline), and resume. A game module implements only:

```ts
interface GameModule {
  key: string;
  domains: CognitiveDomain[];
  buildRound(level: number, rng: SeededRng, content: ContentPack): RoundSpec;
  Render: React.FC<{ round: RoundSpec; onAnswer(a: Answer): void; onHint(): void }>;
  score(round: RoundSpec, answer: Answer): { correct: boolean; partial?: number };
  roundsForLevel(level: number): number;
}
```

RNG is seeded per session so a resumed session regenerates identical rounds.

Level 1–10. Each game defines how level maps to parameters. Defaults: rounds = 4 + floor(level/2), hint always available (costs a `hintsUsed`).

## MVP set (Phase 3)

| # | Key | Name | Domains | Level knobs | Regional? |
|---|---|---|---|---|---|
| 1 | `memory_match` | Memory Match | memory, attention | grid 2×2 → 4×5; face-up preview time 4s → 1s; images from content pack (dishes, festivals) | yes (images) |
| 2 | `sequence_recall` | Sequence Recall | memory, sequencing | sequence length 2 → 8; item set size 3 → 8; playback speed | tunes/colours |
| 3 | `object_sorting` | Object Sorting | recognition, attention | 2 → 4 categories; 4 → 14 items; distractors at L6+ | regional items (foods, tools) |
| 4 | `tea_garden_attention` | Tea Garden Attention | attention | find N ripe leaves/animals in a busy scene; scene density; time limit off until L4 | yes (Assam scene; other states get their own scene: bamboo grove, orchard, market) |
| 5 | `bihu_rhythm_recall` | Bihu Rhythm Recall | memory, sequencing | tap pattern length 3 → 8; tempo; visual + audio cue → audio only at L7+ | yes (per-state rhythm: Bihu, Cheiraoba, Wangala, Chapchar Kut…) |
| 6 | `daily_life_sequencing` | Daily Life Sequencing | routine, sequencing | order 3 → 7 steps of a daily task (making tea, morning routine, going to market); regional dishes/rituals | yes (scenes) |

## v1 set (Phase 10)

| # | Key | Name | Domains | Level knobs | Regional? |
|---|---|---|---|---|---|
| 7 | `familiar_place_recall` | Familiar Place Recall | recognition, memory | name the landmark from photo; 2 → 4 options; local → wider region at higher levels; also uses patient's `known_places` | yes |
| 8 | `who_is_this` | Who Is This? (family) | recognition | family photos from FamilyMember; 2 → 4 options; L5+ asks relationship | patient data |
| 9 | `word_pairs` | Word Pairs | memory, language | pairs in patient's language; 3 → 8 pairs; delay before recall | language packs |
| 10 | `spot_the_change` | Spot the Change | attention | two scenes, 1 → 4 differences; regional scenes | yes |
| 11 | `festival_calendar` | Festival Match | recognition, memory | match festival to month/season/state; 2 → 4 options | yes |
| 12 | `sound_match` | Sound Match | recognition, memory | hear a sound (rain, bell, bird, market), pick the image; 2 → 4 options; L6+ sequence of 2 sounds | yes (sound packs) |

## Metrics every game emits (validated by `GameDefinition.metrics_schema`)

`accuracy, mean_reaction_ms, mistakes, hints_used, rounds, duration_ms, completed, abandoned_reason, fatigue_flags[]`. Optional per-game extras go into `raw_events` (compact, ≤ 20 KB).

## Copy rules inside games
- Correct: "Yes!", "Well done", "That's right" with a soft chime.
- Incorrect: "It's here" (highlight correct) — never "wrong", no red, no buzzer.
- Hint button labelled "Show me" with a lightbulb.
- End screen: one supportive sentence (from DDA `messageKey`), a big "Play again" and "Back home". No scores, unless the patient's profile has `show_points=true` (then show points only, not accuracy).

## Accessibility per game
- Touch targets ≥ 64px; drag-and-drop always has a tap-tap alternative (tap item, tap target).
- No time limits below level 4; time limits are generous and never shown as a countdown — a gentle progress arc instead.
- All images have `alt` from content pack `title_translations`.

## Phase 10 pack metadata

- `routine_scene.tags.variants` is a non-empty list of `{imageUrl, differences}`. Each difference is `{id, title, imageUrl}`; a variant has 1–4 unique difference IDs. The base image and variant must depict the same scene. Original generated demo scenes include variants with 1–4 objects removed.
- `festival.tags` supplies translated `season`, `month`, and `state` labels. Festival Match uses season at L1–3, month at L4–6, and state at L7–10, falling back to season when the selected field has fewer than two distinct labels. Demo celebrations are explicitly fictional practice content.
- `sound` items need both an audio asset and a matching image. Audio is played sequentially at L6+; replay increments hints and cancels prior playback.
- `word` titles come from the requested language pack; Word Pairs uses 3–8 pairs, then a short blank recall delay. Family photos are patient-scoped and are never supplied by public packs.
- Missing required content shows the existing supportive unavailable message.

Favourites use patient-scoped offline metadata and the `patient_profile_favourites` sync allowlist. The server validates game keys and memory ownership and applies timestamp ordering. Home prefers an assigned exercise due today, then a favourite with no engagement in three days, then evening calm time. Walkthrough acknowledgements are stored in patient-scoped `meta.walkthroughSeen`; the section header can replay them.
