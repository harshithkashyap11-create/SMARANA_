import { expect, it, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { defaultPack, type ContentPack } from "../../../content/packs";
import { createSeededRng } from "../../engine/types";
import { whoIsThis } from "../who_is_this";
import { wordPairs } from "../word_pairs";
import { spotTheChange } from "../spot_the_change";
import { festivalCalendar } from "../festival_calendar";
import { soundMatch } from "../sound_match";
const pack: ContentPack = {
  ...defaultPack,
  family: [
    { id: "p", title: "Priya", relationship: "Daughter", imageUrl: "/p.jpg" },
    { id: "s", title: "Sam", relationship: "Son", imageUrl: "/s.jpg" },
  ],
  words: defaultPack.sequenceItems,
  festivals: [
    {
      id: "a",
      title: "A",
      imageUrl: "/a",
      tags: { season: "Spring", month: "April", state: "Assam" },
    },
    {
      id: "b",
      title: "B",
      imageUrl: "/b",
      tags: { season: "Winter", month: "January", state: "Bengal" },
    },
  ],
  sounds: [
    { id: "a", title: "Bell", imageUrl: "/a", audioUrl: "/a.wav" },
    { id: "b", title: "Bird", imageUrl: "/b", audioUrl: "/b.wav" },
  ],
  routineScenes: [
    {
      ...defaultPack.routineScenes[0]!,
      tags: {
        variants: [
          {
            imageUrl: "/changed",
            differences: [{ id: "bird", title: "Bird", imageUrl: "" }],
          },
        ],
      },
    },
  ],
};
for (const game of [
  whoIsThis,
  wordPairs,
  spotTheChange,
  festivalCalendar,
  soundMatch,
])
  void it(`${game.key} builds deterministic rounds and scores answers`, () => {
    const round = game.buildRound(6, createSeededRng("test"), pack);
    expect(round).toEqual(game.buildRound(6, createSeededRng("test"), pack));
    expect(game.score(round, { value: round.expected }).correct).toBe(true);
    expect(game.score(round, { value: ["unknown"] }).correct).toBe(false);
  });
it("asks relationships from level five", () => {
  expect(
    whoIsThis
      .buildRound(5, createSeededRng("a"), pack)
      .choices.map((item) => item.title),
  ).toContain("Daughter");
});
it("hides word pairs after the preview delay", () => {
  vi.useFakeTimers();
  const round = wordPairs.buildRound(1, createSeededRng("a"), pack);
  const view = render(
    <wordPairs.Render round={round} onAnswer={vi.fn()} onHint={vi.fn()} />,
  );
  expect(view.queryByText(round.choices[0]!.title)).toBeNull();
  act(() => {
    vi.advanceTimersByTime(round.previewMs! + round.delay!);
  });
  expect(view.getByText(round.choices[0]!.title)).toBeTruthy();
  vi.useRealTimers();
});
it("uses two sounds at level six and counts replay as a hint", () => {
  const play = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    "Audio",
    class {
      play = play;
      pause = vi.fn();
      onended = null;
      onerror = null;
    },
  );
  const round = soundMatch.buildRound(6, createSeededRng("a"), pack);
  expect(round.expected).toHaveLength(2);
  const hint = vi.fn();
  const view = render(
    <soundMatch.Render round={round} onAnswer={vi.fn()} onHint={hint} />,
  );
  fireEvent.click(view.getByText("newGames.replaySound"));
  expect(hint).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});

it("increases word pairs and recall delay with level", () => {
  const words = Array.from({ length: 16 }, (_, index) => ({
    id: String(index),
    title: `Word ${index}`,
    imageUrl: "",
  }));
  const content = { ...pack, words };
  const easy = wordPairs.buildRound(1, createSeededRng("level"), content);
  const hard = wordPairs.buildRound(10, createSeededRng("level"), content);
  expect(easy.preview).toHaveLength(3);
  expect(hard.preview).toHaveLength(8);
  expect(hard.delay).toBeGreaterThan(easy.delay!);
});
it("requires sound order and rejects duplicate answers", () => {
  const round = soundMatch.buildRound(6, createSeededRng("order"), pack);
  expect(
    soundMatch.score(round, { value: [...round.expected].reverse() }).correct,
  ).toBe(false);
  expect(
    soundMatch.score(round, { value: [round.expected[0], round.expected[0]] })
      .correct,
  ).toBe(false);
});
it("selects one to four scene differences by level", () => {
  const differences = Array.from({ length: 4 }, (_, index) => ({
    id: String(index),
    title: `Change ${index}`,
    imageUrl: "",
  }));
  const content = {
    ...pack,
    routineScenes: [
      {
        ...pack.routineScenes[0]!,
        tags: {
          variants: [1, 2, 3, 4].map((count) => ({
            imageUrl: `/scene-${count}`,
            differences: differences.slice(0, count),
          })),
        },
      },
    ],
  };
  expect(
    spotTheChange.buildRound(1, createSeededRng("change"), content).expected,
  ).toHaveLength(1);
  expect(
    spotTheChange.buildRound(10, createSeededRng("change"), content).expected,
  ).toHaveLength(4);
});
