import { describe, expect, test } from "vitest";
import { defaultPack } from "../../content/packs";
import type { ResumeState } from "../../db/repo/games";
import { demoTap } from "../modules/demo_tap";
import { buildRoundAtIndex, recordAnswer } from "./sessionCore";

const resume = (): ResumeState => ({
  gameKey: "demo_tap",
  patientId: "patient",
  seed: "fixed-session-seed",
  level: 1,
  roundIndex: 0,
  startedAt: "2026-09-14T10:00:00Z",
  metrics: {
    correct: 0,
    mistakes: 0,
    hintsUsed: 1,
    reactionTimes: [],
    rawEvents: [],
  },
});

describe("game session core", () => {
  test("runs scripted rounds and accumulates accuracy, reaction time, mistakes and hints", () => {
    let state = resume();
    for (const [correct, reactionMs] of [
      [true, 600],
      [false, 1200],
      [true, 900],
    ] as const) {
      const round = buildRoundAtIndex(demoTap, state, defaultPack);
      state = recordAnswer(
        demoTap,
        round,
        state,
        { value: correct ? round.expected : 99 },
        reactionMs,
      );
    }
    expect(state.roundIndex).toBe(3);
    expect(state.metrics).toMatchObject({
      correct: 2,
      mistakes: 1,
      hintsUsed: 1,
    });
    expect(
      state.metrics.reactionTimes.reduce((sum, value) => sum + value, 0) /
        state.metrics.reactionTimes.length,
    ).toBe(900);
    expect(state.metrics.correct / state.roundIndex).toBeCloseTo(2 / 3);
  });

  test("a restored snapshot regenerates the same current round from the same seed", () => {
    const beforeUnmount = { ...resume(), roundIndex: 2 };
    const serialized = JSON.stringify(beforeUnmount);
    const afterMount = JSON.parse(serialized) as ResumeState;
    expect(buildRoundAtIndex(demoTap, afterMount, defaultPack)).toEqual(
      buildRoundAtIndex(demoTap, beforeUnmount, defaultPack),
    );
  });
});
