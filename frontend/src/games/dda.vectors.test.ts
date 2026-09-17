import cases from "../../../shared/dda_cases.json";
import { describe, expect, test } from "vitest";
import { nextDifficulty, sessionLevel, type DifficultyStateData } from "./dda";

describe("shared DDA vectors", () => {
  test.each(cases)("$name", ({ state, session, config, expected }) => {
    const actual = nextDifficulty(state, session, config);
    expect(actual.state.level).toBe(expected.level);
    expect(actual.change.reasonCode).toBe(expected.reasonCode);
    expect(actual.messageKey).toBe(expected.messageKey);
    expect(actual.state.window).toHaveLength(expected.windowLength);
    if ("explanation" in expected)
      expect(actual.change.explanation).toBe(expected.explanation);
  });
});
test("challenge level respects the doctor cap without changing state", () => {
  const state: DifficultyStateData = {
    level: 4,
    window: [],
    lockedByDoctor: false,
    capLevel: 5,
    minLevel: 1,
    maxLevel: 10,
  };
  expect(sessionLevel(state, true)).toBe(5);
  expect(state.level).toBe(4);
  state.capLevel = 4;
  expect(sessionLevel(state, true)).toBe(4);
});
