import { expect, test } from "vitest";
import { defaultPack, packFromRemote } from "./packs";
import demoPacks from "./demo-packs.json";
import { games } from "../games/registry";
import { createSeededRng } from "../games/engine/types";
import { buildMemoryRound } from "../games/modules/memory_match";
import { buildSequenceRound } from "../games/modules/sequence_recall";
import { buildDailySequenceRound } from "../games/modules/daily_life_sequencing";
for (const game of games.filter((game) => game.key !== "who_is_this"))
  test(`${game.key} builds playable rounds at all levels from each original pack`, () => {
    const first = packFromRemote(demoPacks.AS),
      second = packFromRemote(demoPacks.ML);
    for (let level = 1; level <= 10; level++) {
      expect(
        game.buildRound(level, createSeededRng("same-seed"), first),
      ).toBeTruthy();
      expect(
        game.buildRound(level, createSeededRng("same-seed"), second),
      ).toBeTruthy();
    }
    // Regional asset identities/steps/notes influence the rounds with the same RNG.
    if (game.key !== "tea_garden_attention")
      expect(
        game.buildRound(10, createSeededRng("same-seed"), first),
      ).not.toEqual(game.buildRound(10, createSeededRng("same-seed"), second));
  });
test("level 10 memory and sequence rounds have enough distinct assets", () => {
  const pack = packFromRemote(demoPacks.AS);
  expect(
    buildMemoryRound(10, createSeededRng("level10"), [
      ...pack.dishes,
      ...pack.festivals,
    ]).cards,
  ).toHaveLength(20);
  expect(
    buildSequenceRound(10, createSeededRng("level10"), pack.sequenceItems)
      .items,
  ).toHaveLength(8);
  expect(
    buildDailySequenceRound(10, createSeededRng("level10"), pack).steps,
  ).toHaveLength(7);
  expect(defaultPack.activities[0]?.steps).toHaveLength(7);
});

test("sparse remote packs can complete memory rounds instead of waiting for nonexistent pairs", () => {
  const pack = packFromRemote({
    version: "sparse",
    items: {
      dish: [
        {
          id: "one",
          title: "Rice",
          image_url: null,
          audio_url: null,
          tags: {},
        },
      ],
    },
  });
  const round = buildMemoryRound(10, createSeededRng("sparse"), [
    ...pack.dishes,
    ...pack.festivals,
  ]);
  expect(round.cards).toHaveLength(round.pairCount * 2);
  expect(new Set(round.cards.map((card) => card.id)).size).toBe(
    round.pairCount,
  );
});
