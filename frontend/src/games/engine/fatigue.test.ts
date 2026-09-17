import { describe, expect, test } from "vitest";
import { detectFatigue, type FatigueEvent } from "./fatigue";

const event = (correct: boolean, reactionMs = 700): FatigueEvent => ({
  correct,
  reactionMs,
});
const base = {
  startedAt: "2026-09-14T10:00:00Z",
  now: "2026-09-14T10:05:00Z",
};

describe("fatigue detection", () => {
  test.each([
    [
      "four consecutive mistakes",
      [event(false), event(false), event(false), event(false)],
      "consecutive_mistakes",
    ],
    [
      "two reactions over twice the earlier running mean",
      [event(true, 500), event(true, 1_001), event(true, 1_600)],
      "slow_reactions",
    ],
    [
      "three rapid taps",
      [event(true, 299), event(true, 250), event(true, 100)],
      "rapid_taps",
    ],
  ] as const)("flags %s", (_name, events, reason) => {
    expect(detectFatigue({ ...base, events })).toContain(reason);
  });

  test("flags play beyond the configured session cap", () => {
    expect(
      detectFatigue({
        ...base,
        events: [],
        now: "2026-09-14T10:05:01Z",
        sessionCapMinutes: 5,
      }),
    ).toContain("session_cap");
  });

  test("does not flag values exactly on strict rule boundaries", () => {
    expect(
      detectFatigue({
        ...base,
        events: [event(true, 500), event(true, 1_000), event(true, 1_500)],
        now: "2026-09-14T10:05:00Z",
        sessionCapMinutes: 5,
      }),
    ).toEqual([]);
  });
});
