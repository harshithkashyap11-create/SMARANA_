import { expect, it } from "vitest";
import { games } from "./registry";
import { createSeededRng, type GameModule } from "./engine/types";
import { defaultPack, type ContentPack } from "../content/packs";

const pack: ContentPack = {
  ...defaultPack,
  family: [
    {
      id: "one",
      title: "Priya",
      relationship: "Daughter",
      imageUrl: "/demo.jpg",
    },
    { id: "two", title: "Rao", relationship: "Father", imageUrl: "/demo2.jpg" },
  ],
  words: defaultPack.sequenceItems,
  sounds: [
    { id: "bell", title: "Bell", imageUrl: "/bell.jpg", audioUrl: "/bell.wav" },
    { id: "bird", title: "Bird", imageUrl: "/bird.jpg", audioUrl: "/bird.wav" },
  ],
  festivals: [
    {
      id: "spring",
      title: "Spring festival",
      imageUrl: "/spring.jpg",
      tags: { season: "Spring", month: "April", state: "Assam" },
    },
    {
      id: "winter",
      title: "Winter festival",
      imageUrl: "/winter.jpg",
      tags: { season: "Winter", month: "January", state: "Meghalaya" },
    },
  ],
  routineScenes: defaultPack.routineScenes.map((scene) => ({
    ...scene,
    tags: {
      variants: [
        {
          imageUrl: "/change.jpg",
          differences: [{ id: "bird", title: "Bird", imageUrl: "" }],
        },
      ],
    },
  })),
};

it("registers twelve unique games", () => {
  expect(games).toHaveLength(12);
  expect(new Set(games.map((game) => game.key)).size).toBe(12);
});
for (const module of games) {
  const game = module as GameModule;
  for (let level = 1; level <= 10; level++) {
    it(`${game.key}: level ${level} builds reproducible rounds and has a usable round count`, () => {
      const round = game.buildRound(
        level,
        createSeededRng("catalog-review"),
        pack,
      );
      expect(round).toEqual(
        game.buildRound(level, createSeededRng("catalog-review"), pack),
      );
      expect(round).toBeTruthy();
      expect(game.roundsForLevel(level)).toBeGreaterThan(0);
      expect(Number.isInteger(game.roundsForLevel(level))).toBe(true);
      expect(game.Render).toBeTypeOf("function");
    });
  }
}
