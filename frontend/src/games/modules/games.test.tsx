import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { defaultPack } from "../../content/packs";
import { createSeededRng } from "../engine/types";
import {
  buildMemoryRound,
  gridFor,
  memoryMatch,
  MemoryMatchRound,
  previewMsFor,
} from "./memory_match";
import {
  buildSequenceRound,
  sequenceLengthFor,
  SequenceRecallRound,
  sequenceRecall,
  setSizeFor,
} from "./sequence_recall";
import {
  buildSortingRound,
  categoryCountFor,
  itemCountFor,
  objectSorting,
  ObjectSortingRound,
} from "./object_sorting";
import {
  buildAttentionRound,
  targetCountFor,
  teaGardenAttention,
} from "./tea_garden_attention";
import {
  BihuRhythmRound,
  buildRhythmRound,
  patternLengthFor,
  type RhythmAudio,
} from "./bihu_rhythm_recall";
import {
  buildDailySequenceRound,
  dailyLifeSequencing,
  stepCountFor,
} from "./daily_life_sequencing";

test("memory match generation is deterministic and follows level knobs", () => {
  expect(
    buildMemoryRound(8, createSeededRng("same"), [
      ...defaultPack.dishes,
      ...defaultPack.festivals,
    ]),
  ).toEqual(
    buildMemoryRound(8, createSeededRng("same"), [
      ...defaultPack.dishes,
      ...defaultPack.festivals,
    ]),
  );
  expect(gridFor(1)).toEqual([2, 2]);
  expect(gridFor(5)).toEqual([3, 4]);
  expect(gridFor(10)).toEqual([4, 5]);
  expect(previewMsFor(1)).toBe(4000);
  expect(previewMsFor(10)).toBe(1000);
  expect(memoryMatch.score({} as never, { value: true }).correct).toBe(true);
});
test("memory match renders cards and its hint", () => {
  const round = buildMemoryRound(1, createSeededRng("render"), [
    ...defaultPack.dishes,
    ...defaultPack.festivals,
  ]);
  const hint = vi.fn();
  render(<MemoryMatchRound round={round} onAnswer={vi.fn()} onHint={hint} />);
  expect(screen.getAllByRole("button")).toHaveLength(round.cards.length + 1);
  fireEvent.click(screen.getByRole("button", { name: /show me/i }));
  expect(hint).toHaveBeenCalledOnce();
});
test("sequence generation is deterministic and follows level knobs", () => {
  expect(
    buildSequenceRound(8, createSeededRng("same"), defaultPack.sequenceItems),
  ).toEqual(
    buildSequenceRound(8, createSeededRng("same"), defaultPack.sequenceItems),
  );
  expect(sequenceLengthFor(1)).toBe(2);
  expect(sequenceLengthFor(10)).toBe(8);
  expect(setSizeFor(1)).toBe(3);
  expect(setSizeFor(10)).toBe(8);
  const round = buildSequenceRound(
    5,
    createSeededRng("score"),
    defaultPack.sequenceItems,
  );
  expect(sequenceRecall.score(round, { value: round.sequence }).correct).toBe(
    true,
  );
  expect(sequenceRecall.score(round, { value: [] }).correct).toBe(false);
});
test("sequence recall offers a replay hint", () => {
  const round = buildSequenceRound(
    1,
    createSeededRng("render"),
    defaultPack.sequenceItems,
  );
  const hint = vi.fn();
  render(
    <SequenceRecallRound round={round} onAnswer={vi.fn()} onHint={hint} />,
  );
  fireEvent.click(screen.getByRole("button", { name: /show me/i }));
  expect(hint).toHaveBeenCalledOnce();
});

test("object sorting is playable at levels 1 and 8 with high-level distractors", () => {
  const low = buildSortingRound(1, createSeededRng("low"), defaultPack);
  const high = buildSortingRound(8, createSeededRng("high"), defaultPack);
  expect(categoryCountFor(1)).toBe(2);
  expect(categoryCountFor(8)).toBe(4);
  expect(itemCountFor(1)).toBe(4);
  expect(high.items.some((item) => item.distractor)).toBe(true);
  const onAnswer = vi.fn();
  render(
    <ObjectSortingRound round={low} onAnswer={onAnswer} onHint={vi.fn()} />,
  );
  for (const item of low.items) {
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(item.title) }),
    );
    fireEvent.click(screen.getByRole("button", { name: item.category }));
  }
  expect(onAnswer).toHaveBeenCalledOnce();
  expect(objectSorting.score(low, { value: true }).correct).toBe(true);
});

test("tea garden levels change targets, density, and the soft time arc", () => {
  const low = buildAttentionRound(1, createSeededRng("low"), defaultPack);
  const high = buildAttentionRound(8, createSeededRng("high"), defaultPack);
  expect(targetCountFor(1)).toBe(2);
  expect(targetCountFor(8)).toBe(5);
  expect(low.timeLimitMs).toBeUndefined();
  expect(high.timeLimitMs).toBeGreaterThan(0);
  expect(high.objects.length).toBeGreaterThan(low.objects.length);
  expect(teaGardenAttention.score(high, { value: true }).correct).toBe(true);
});

test("rhythm uses visual cues below level 7 and accepts a fake audio player", () => {
  vi.useFakeTimers();
  const low = buildRhythmRound(1, createSeededRng("low"), defaultPack);
  const high = buildRhythmRound(8, createSeededRng("high"), defaultPack);
  expect(patternLengthFor(1)).toBe(3);
  expect(patternLengthFor(8)).toBe(6);
  expect(low.visual).toBe(true);
  expect(high.visual).toBe(false);
  const play = vi.fn();
  const audio: RhythmAudio = { play };
  const view = render(
    <BihuRhythmRound
      round={low}
      onAnswer={vi.fn()}
      onHint={vi.fn()}
      audio={audio}
    />,
  );
  expect(play).toHaveBeenCalled();
  view.unmount();
  vi.useRealTimers();
});

test("daily sequencing is playable at levels 1 and 8 and gives partial credit", () => {
  const low = buildDailySequenceRound(1, createSeededRng("low"), defaultPack);
  const high = buildDailySequenceRound(8, createSeededRng("high"), defaultPack);
  expect(stepCountFor(1)).toBe(3);
  expect(stepCountFor(8)).toBe(6);
  expect(low.steps).toHaveLength(3);
  expect(high.steps).toHaveLength(6);
  expect(
    dailyLifeSequencing.score(low, { value: low.correctOrder }).correct,
  ).toBe(true);
  expect(
    dailyLifeSequencing.score(low, { value: [low.correctOrder[0]] }).partial,
  ).toBeCloseTo(1 / 3);
});
