import SequenceRecall from "./integrated/sequence_recall/SequenceRecall.jsx";
import MemoryMatch from "./integrated/memory_match/MemoryMatch.jsx";
import FindTheChange from "./integrated/find_the_change/FindTheChange.jsx";
import ObjectSorting from "./integrated/object_sorting/ObjectSorting.jsx";
import DailyRoutine from "./integrated/daily_routine/DailyRoutine.jsx";
import WordRecall from "./integrated/word_recall/WordRecall.jsx";
import VisualSearch from "./integrated/visual_search/VisualSearch.jsx";
import PatternCompletion from "./integrated/pattern_completion/PatternCompletion.jsx";
import SpatialRecall from "./integrated/spatial_recall/SpatialRecall.jsx";
import AttentionTap from "./integrated/attention_tap/AttentionTap.jsx";
import AssociationGame from "./integrated/association_game/AssociationGame.jsx";
import PersonalMemory from "./integrated/personal_memory/PersonalMemory.jsx";
import type { ComponentType } from "react";
import type { GameModule } from "./engine/types";
import type { IntegratedGameProps } from "./integratedProps";
import contract from "../../../shared/games.json";
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

const legacyModules = [
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

export interface GameEntry {
  key: string;
  name: string;
  nameKey: string;
  descriptionKey: string;
  domains: string[];
  icon: string;
  estimatedDurationMin: number;
  enabled: boolean;
  minDifficulty: number;
  maxDifficulty: number;
  route: string;
  supportsVoice: boolean;
  supportsOffline: boolean;
  ddaProfile: string;
  analyticsKey: string;
  component?: ComponentType<IntegratedGameProps>;
  module?: GameModule;
}
const entries: GameEntry[] = [
  {
    key: "sequence_recall",
    name: "Sequence Recall",
    nameKey: "games.sequenceRecall.name",
    descriptionKey: "games.sequenceRecall.instructions",
    domains: ["memory"],
    icon: "🧩",
    component: SequenceRecall,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/sequence_recall",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "sequence_recall",
  },
  {
    key: "memory_match",
    name: "Memory Match",
    nameKey: "games.memoryMatch.name",
    descriptionKey: "games.memoryMatch.instructions",
    domains: ["memory"],
    icon: "🃏",
    component: MemoryMatch,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/memory_match",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "memory_match",
  },
  {
    key: "find_the_change",
    name: "Find the Change",
    nameKey: "games.findTheChange.name",
    descriptionKey: "games.findTheChange.instructions",
    domains: ["attention"],
    icon: "🔍",
    component: FindTheChange,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/find_the_change",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "find_the_change",
  },
  {
    key: "object_sorting",
    name: "Object Sorting",
    nameKey: "games.objectSorting.name",
    descriptionKey: "games.objectSorting.instructions",
    domains: ["reasoning"],
    icon: "🧺",
    component: ObjectSorting,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/object_sorting",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "object_sorting",
  },
  {
    key: "daily_routine",
    name: "Daily Routine Builder",
    nameKey: "games.dailyRoutine.name",
    descriptionKey: "games.dailyRoutine.instructions",
    domains: ["reasoning"],
    icon: "☀️",
    component: DailyRoutine,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/daily_routine",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "daily_routine",
  },
  {
    key: "word_recall",
    name: "Word Recall",
    nameKey: "games.wordRecall.name",
    descriptionKey: "games.wordRecall.instructions",
    domains: ["memory"],
    icon: "📖",
    component: WordRecall,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/word_recall",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "word_recall",
  },
  {
    key: "visual_search",
    name: "Visual Search",
    nameKey: "games.visualSearch.name",
    descriptionKey: "games.visualSearch.instructions",
    domains: ["attention"],
    icon: "👀",
    component: VisualSearch,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/visual_search",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "visual_search",
  },
  {
    key: "pattern_completion",
    name: "Pattern Completion",
    nameKey: "games.patternCompletion.name",
    descriptionKey: "games.patternCompletion.instructions",
    domains: ["reasoning"],
    icon: "🔷",
    component: PatternCompletion,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/pattern_completion",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "pattern_completion",
  },
  {
    key: "spatial_recall",
    name: "Spatial Recall",
    nameKey: "games.spatialRecall.name",
    descriptionKey: "games.spatialRecall.instructions",
    domains: ["visuospatial"],
    icon: "📍",
    component: SpatialRecall,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/spatial_recall",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "spatial_recall",
  },
  {
    key: "attention_tap",
    name: "Attention Tap",
    nameKey: "games.attentionTap.name",
    descriptionKey: "games.attentionTap.description",
    domains: ["attention"],
    icon: "👆",
    component: AttentionTap,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/attention_tap",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "attention_tap",
  },
  {
    key: "association_game",
    name: "Association Game",
    nameKey: "games.associationGame.name",
    descriptionKey: "games.associationGame.instructions",
    domains: ["associative"],
    icon: "🔗",
    component: AssociationGame,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/association_game",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "association_game",
  },
  {
    key: "personal_memory",
    name: "Personal Memory Recall",
    nameKey: "games.personalMemory.name",
    descriptionKey: "games.personalMemory.instructions",
    domains: ["personal"],
    icon: "🖼️",
    component: PersonalMemory,
    estimatedDurationMin: 3,
    enabled: true,
    minDifficulty: 1,
    maxDifficulty: 5,
    route: "/patient/games/personal_memory",
    supportsVoice: true,
    supportsOffline: true,
    ddaProfile: "conservative",
    analyticsKey: "personal_memory",
  },
  ...legacyModules
    .filter(
      (module) =>
        ![
          "sequence_recall",
          "memory_match",
          "find_the_change",
          "object_sorting",
          "daily_routine",
          "word_recall",
          "visual_search",
          "pattern_completion",
          "spatial_recall",
          "attention_tap",
          "association_game",
          "personal_memory",
        ].includes(module.key),
    )
    .map((module) => ({
      key: module.key,
      name: module.name,
      nameKey: `gameCatalog.${module.key}.name`,
      descriptionKey: `gameCatalog.${module.key}.description`,
      domains: module.domains,
      icon: "🌿",
      estimatedDurationMin: 3,
      enabled: true,
      minDifficulty: 1,
      maxDifficulty: 10,
      route: `/patient/games/${module.key}`,
      supportsVoice: true,
      supportsOffline: true,
      ddaProfile: "conservative",
      analyticsKey: module.key,
      module: module as unknown as GameModule,
    })),
];
export const gameCatalog = entries.map((entry) => {
  const game = contract.find((item) => item.id === entry.key);
  if (!game) throw new Error(`Missing shared game contract: ${entry.key}`);
  return {
    ...entry,
    name: game.displayName,
    route: game.route,
    enabled: game.enabled,
  };
});
// Preserve the twelve-module legacy engine API; the playable UI catalog includes
// the integrated components and does not duplicate catalog keys.
export const games = [...legacyModules];
export const gameByKey = (key: string) =>
  legacyModules.find((module) => module.key === key);
export const catalogByKey = (key: string) =>
  gameCatalog.find((entry) => entry.key === key && entry.enabled);
