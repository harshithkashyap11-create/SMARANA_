import { memoryMatch } from "./modules/memory_match";
import { sequenceRecall } from "./modules/sequence_recall";

export const games = [memoryMatch, sequenceRecall] as const;
export const gameByKey = (key: string) =>
  games.find((game) => game.key === key);
