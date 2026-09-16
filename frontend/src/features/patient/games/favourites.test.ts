import { describe, it, expect } from "vitest";
import { suggestActivity } from "./favourites";
describe("suggestions", () => {
  const now = new Date(2026, 8, 16, 19);
  const saved = { kind: "game" as const, id: "word_pairs" };
  it("prefers an assigned exercise", () =>
    expect(
      suggestActivity(
        now,
        [{ id: "memory_match", due: "2026-09-16" }],
        [saved],
        [],
      ),
    ).toEqual({ kind: "game", id: "memory_match" }));
  it("suggests a favourite after three days", () =>
    expect(
      suggestActivity(
        now,
        [],
        [saved],
        [
          {
            kind: "game",
            id: saved.id,
            at: new Date(now.getTime() - 3 * 86400000).toISOString(),
          },
        ],
      ),
    ).toEqual(saved));
  it("avoids a recently played favourite", () =>
    expect(
      suggestActivity(
        now,
        [],
        [saved],
        [{ kind: "game", id: saved.id, at: now.toISOString() }],
      ),
    ).toEqual({ kind: "game", id: "calm" }));
  it("has no evening fallback in the morning", () =>
    expect(suggestActivity(new Date(2026, 8, 16, 9), [], [], [])).toBeNull());
});
