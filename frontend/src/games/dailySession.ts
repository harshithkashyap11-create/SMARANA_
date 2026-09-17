import type { GameEntry } from "./registry";
interface History { gameKey: string; endedAt: string; guestMode?: boolean }
/** Rotate daily, favour less recently played games, and cover different domains. */
export function selectDailyGames(catalog: GameEntry[], history: History[], date = new Date().toISOString().slice(0, 10), count = 4): GameEntry[] {
  const available = catalog.filter((game) => game.enabled && game.component);
  const offset = [...date].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rotated = available.map((_, index) => available[(index + offset) % available.length]!);
  const last = (key: string) => Math.max(0, ...history.filter((row) => row.gameKey === key && !row.guestMode).map((row) => Date.parse(row.endedAt)));
  rotated.sort((a, b) => last(a.key) - last(b.key));
  const selected: GameEntry[] = [];
  const domains = new Set<string>();
  for (const game of rotated) {
    if (selected.length >= count) break;
    if (game.domains.some((domain) => !domains.has(domain))) {
      selected.push(game); game.domains.forEach((domain) => domains.add(domain));
    }
  }
  for (const game of rotated) {
    if (selected.length >= count) break;
    if (!selected.includes(game)) selected.push(game);
  }
  return selected;
}
