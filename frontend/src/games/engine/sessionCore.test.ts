import { describe, expect, test } from "vitest";
import { defaultPack } from "../../content/packs";
import type { ResumeState } from "../../db/repo/games";
import { demoTap } from "../modules/demo_tap";
import { buildRoundAtIndex, recordAnswer } from "./sessionCore";
import { detectFatigue } from "./fatigue";
import { nextDifficulty, type DifficultyStateData } from "../dda";

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
    answers: [],
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

  test("accepting a fatigue break produces a DDA hold", () => {
    let state = resume();
    for (let index = 0; index < 4; index += 1) {
      const round = buildRoundAtIndex(demoTap, state, defaultPack);
      state = recordAnswer(demoTap, round, state, { value: 99 }, 700);
    }
    const flags = detectFatigue({
      events: state.metrics.answers,
      startedAt: state.startedAt,
      now: "2026-09-14T10:01:00Z",
    });
    const difficulty: DifficultyStateData = {
      level: 3,
      window: [],
      lockedByDoctor: false,
      capLevel: null,
      minLevel: 1,
      maxLevel: 10,
    };
    const result = nextDifficulty(difficulty, {
      level: 3,
      accuracy: 0,
      meanReactionMs: 700,
      mistakes: 4,
      hintsUsed: 0,
      rounds: 4,
      completed: false,
      challengeMode: false,
      guestMode: false,
      fatigueFlagged: flags.length > 0,
    });
    expect(flags).toContain("consecutive_mistakes");
    expect(result.change).toMatchObject({
      fromLevel: 3,
      toLevel: 3,
      reasonCode: "fatigue_hold",
    });
  });
});
