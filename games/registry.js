import { COGNITIVE_DOMAINS, DIFFICULTY_MAX, DIFFICULTY_MIN } from './shared/gameTypes.js';

import SequenceRecall from './sequence_recall/SequenceRecall.jsx';
import sequenceRecallConfig from './sequence_recall/config.js';

import MemoryMatch from './memory_match/MemoryMatch.jsx';
import memoryMatchConfig from './memory_match/config.js';

import FindTheChange from './find_the_change/FindTheChange.jsx';
import findTheChangeConfig from './find_the_change/config.js';

import ObjectSorting from './object_sorting/ObjectSorting.jsx';
import objectSortingConfig from './object_sorting/config.js';

import DailyRoutine from './daily_routine/DailyRoutine.jsx';
import dailyRoutineConfig from './daily_routine/config.js';

import WordRecall from './word_recall/WordRecall.jsx';
import wordRecallConfig from './word_recall/config.js';

/**
 * The single source of truth for every cognitive activity in SMARANA.
 *
 * Routing, the games index, Today's Cognitive Session, analytics, DDA profiles,
 * feature flags and domain grouping all read from here. Nothing about a game
 * should be duplicated anywhere else in the app.
 *
 * `supportsVoice` means the game has a voice pathway designed into it today,
 * not that speech is available app-wide. Flip it on per game as STT/TTS lands.
 */
export const GAMES = [
  {
    id: 'sequence_recall',
    nameKey: 'games.sequenceRecall.name',
    descriptionKey: 'games.sequenceRecall.description',
    cognitiveDomain: COGNITIVE_DOMAINS.WORKING_MEMORY,
    component: SequenceRecall,
    config: sequenceRecallConfig,
    icon: 'sequence',
    enabled: true,
    ddaProfile: 'working_memory',
    analyticsKey: 'sequence_recall',
    route: '/games/sequence-recall',
    supportsVoice: false,
    supportsOffline: true,
    minDifficulty: DIFFICULTY_MIN,
    maxDifficulty: DIFFICULTY_MAX,
    estimatedDurationMin: 3,
  },
  {
    id: 'memory_match',
    nameKey: 'games.memoryMatch.name',
    descriptionKey: 'games.memoryMatch.description',
    cognitiveDomain: COGNITIVE_DOMAINS.VISUAL_MEMORY,
    component: MemoryMatch,
    config: memoryMatchConfig,
    icon: 'cards',
    enabled: true,
    ddaProfile: 'visual_memory',
    analyticsKey: 'memory_match',
    route: '/games/memory-match',
    supportsVoice: false,
    supportsOffline: true,
    minDifficulty: DIFFICULTY_MIN,
    maxDifficulty: DIFFICULTY_MAX,
    estimatedDurationMin: 4,
  },
  {
    id: 'find_the_change',
    nameKey: 'games.findTheChange.name',
    descriptionKey: 'games.findTheChange.description',
    cognitiveDomain: COGNITIVE_DOMAINS.VISUAL_ATTENTION,
    component: FindTheChange,
    config: findTheChangeConfig,
    icon: 'search',
    enabled: true,
    ddaProfile: 'visual_attention',
    analyticsKey: 'find_the_change',
    route: '/games/find-the-change',
    supportsVoice: false,
    supportsOffline: true,
    minDifficulty: DIFFICULTY_MIN,
    maxDifficulty: DIFFICULTY_MAX,
    estimatedDurationMin: 3,
  },
  {
    id: 'object_sorting',
    nameKey: 'games.objectSorting.name',
    descriptionKey: 'games.objectSorting.description',
    cognitiveDomain: COGNITIVE_DOMAINS.SEMANTIC_MEMORY,
    component: ObjectSorting,
    config: objectSortingConfig,
    icon: 'sort',
    enabled: true,
    ddaProfile: 'semantic_memory',
    analyticsKey: 'object_sorting',
    route: '/games/object-sorting',
    supportsVoice: false,
    supportsOffline: true,
    minDifficulty: DIFFICULTY_MIN,
    maxDifficulty: DIFFICULTY_MAX,
    estimatedDurationMin: 4,
  },
  {
    id: 'daily_routine',
    nameKey: 'games.dailyRoutine.name',
    descriptionKey: 'games.dailyRoutine.description',
    cognitiveDomain: COGNITIVE_DOMAINS.EXECUTIVE_FUNCTION,
    component: DailyRoutine,
    config: dailyRoutineConfig,
    icon: 'routine',
    enabled: true,
    ddaProfile: 'executive_function',
    analyticsKey: 'daily_routine',
    route: '/games/daily-routine',
    supportsVoice: false,
    supportsOffline: true,
    minDifficulty: DIFFICULTY_MIN,
    maxDifficulty: DIFFICULTY_MAX,
    estimatedDurationMin: 4,
  },
  {
    id: 'word_recall',
    nameKey: 'games.wordRecall.name',
    descriptionKey: 'games.wordRecall.description',
    cognitiveDomain: COGNITIVE_DOMAINS.VERBAL_MEMORY,
    component: WordRecall,
    config: wordRecallConfig,
    icon: 'word',
    enabled: true,
    ddaProfile: 'verbal_memory',
    analyticsKey: 'word_recall',
    route: '/games/word-recall',
    supportsVoice: true,
    supportsOffline: true,
    minDifficulty: DIFFICULTY_MIN,
    maxDifficulty: DIFFICULTY_MAX,
    estimatedDurationMin: 3,
  },
];

export function getEnabledGames(games = GAMES) {
  return games.filter((game) => game.enabled);
}

export function getGameById(id, games = GAMES) {
  return games.find((game) => game.id === id) ?? null;
}

export function getGameByRoute(route, games = GAMES) {
  return games.find((game) => game.route === route) ?? null;
}

export function getGamesByDomain(domain, games = GAMES) {
  return getEnabledGames(games).filter((game) => game.cognitiveDomain === domain);
}

/** Domain -> games, for a grouped games index. */
export function groupGamesByDomain(games = GAMES) {
  return getEnabledGames(games).reduce((groups, game) => {
    const bucket = groups[game.cognitiveDomain] ?? [];
    bucket.push(game);
    return { ...groups, [game.cognitiveDomain]: bucket };
  }, {});
}

/**
 * One game per cognitive domain, shortest first, for "Today's Cognitive
 * Session". Replace the ordering rule once the backend recommends a plan.
 */
export function buildDailySession({ maxGames = 3, games = GAMES } = {}) {
  const seenDomains = new Set();
  return getEnabledGames(games)
    .slice()
    .sort((a, b) => a.estimatedDurationMin - b.estimatedDurationMin)
    .filter((game) => {
      if (seenDomains.has(game.cognitiveDomain)) return false;
      seenDomains.add(game.cognitiveDomain);
      return true;
    })
    .slice(0, maxGames);
}

export default GAMES;
