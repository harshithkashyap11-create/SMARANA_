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
