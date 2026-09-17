import { describe, expect, it } from "vitest";
import { gameCatalog } from "./registry";
import { selectDailyGames } from "./dailySession";
describe("daily cognitive selection", () => {
  it("covers distinct domains with four enabled games and favours unplayed games", () => {
    const initial = selectDailyGames(gameCatalog, [], "2026-09-17");
    expect(initial).toHaveLength(4);
    expect(new Set(initial.flatMap((game) => game.domains)).size).toBe(4);
    const history = initial.map((game) => ({ gameKey: game.key, endedAt: "2026-09-17T09:00:00Z" }));
    const next = selectDailyGames(gameCatalog, history, "2026-09-17");
    expect(next.every((game) => !initial.includes(game))).toBe(true);
  });
  it("excludes disabled games and handles an empty catalog", () => {
    expect(selectDailyGames(gameCatalog.map((game) => ({ ...game, enabled: false })), [])).toEqual([]);
    expect(selectDailyGames([], [])).toEqual([]);
  });
});
