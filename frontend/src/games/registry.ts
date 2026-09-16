import { whoIsThis } from "./modules/who_is_this";
import { wordPairs } from "./modules/word_pairs";
import { festivalCalendar } from "./modules/festival_calendar";
import { soundMatch } from "./modules/sound_match";
import { spotTheChange } from "./modules/spot_the_change";
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
  whoIsThis,
  wordPairs,
  festivalCalendar,
  soundMatch,
  spotTheChange,

] as const;
export const gameByKey = (key: string) =>
  games.find((game) => game.key === key);
