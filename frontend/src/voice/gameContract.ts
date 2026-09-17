import contract from "../../../shared/games.json";
export const voiceGames = contract.filter((game) => game.enabled);
export const gameKeysAllowed = new Set(voiceGames.map((game) => game.id));
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const aliases = voiceGames
  .flatMap((game) =>
    game.voiceAliases.map((alias) => ({ game, alias: normalize(alias) })),
  )
  .sort((a, b) => b.alias.length - a.alias.length);
/** Exact token-boundary aliases, longest first; no guessing unknown games. */
export function recognizeGame(text: string) {
  const normalized = ` ${normalize(text)} `;
  const matches = aliases.filter((item) =>
    normalized.includes(` ${item.alias} `),
  );
  const longest = matches[0];
  if (!longest) return undefined;
  // A shorter contained alias must not steal Personal Memory, etc. Multiple
  // disjoint requested games are ambiguous, not an arbitrary first selection.
  if (
    matches.some(
      (item) =>
        item.game.id !== longest.game.id && !longest.alias.includes(item.alias),
    )
  )
    return undefined;
  return longest.game;
}
