import { memoryMatch } from "./modules/memory_match";
import { sequenceRecall } from "./modules/sequence_recall";
import { objectSorting } from "./modules/object_sorting";
import { teaGardenAttention } from "./modules/tea_garden_attention";
import { bihuRhythmRecall } from "./modules/bihu_rhythm_recall";
import { dailyLifeSequencing } from "./modules/daily_life_sequencing";
import { familiarPlaceRecall } from "./modules/familiar_place_recall";

export const games = [
  memoryMatch,
  sequenceRecall,
  objectSorting,
  teaGardenAttention,
  bihuRhythmRecall,
  dailyLifeSequencing,
  familiarPlaceRecall,
] as const;
export const gameByKey = (key: string) =>
  games.find((game) => game.key === key);
