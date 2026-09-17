import { COGNITIVE_DOMAINS } from '../shared/gameTypes.js';
import { clampDifficulty } from '../shared/gameMetrics.js';

export const GAME_ID = 'word_recall';

export const RECALL_MODES = {
  /** One question per word, a small set of choices each time. */
  RECOGNITION: 'recognition',
  /** All words at once: choose every word you saw from a larger grid. */
  MULTI_SELECT: 'multi_select',
  /** Reserved for the voice release — free recall spoken aloud. */
  FREE: 'free',
};

/**
 * Familiar, concrete, everyday nouns. similarityGroup lets higher levels draw
 * semantically close words, which is where intrusion errors show up.
 */
export const WORD_POOL = [
  { id: 'mango', labelKey: 'games.words.mango', similarityGroup: 'food' },
  { id: 'basket', labelKey: 'games.words.basket', similarityGroup: 'household' },
  { id: 'chair', labelKey: 'games.words.chair', similarityGroup: 'household' },
  { id: 'river', labelKey: 'games.words.river', similarityGroup: 'nature' },
  { id: 'clock', labelKey: 'games.words.clock', similarityGroup: 'household' },
  { id: 'spoon', labelKey: 'games.words.spoon', similarityGroup: 'household' },
  { id: 'bus', labelKey: 'games.words.bus', similarityGroup: 'travel' },
  { id: 'flower', labelKey: 'games.words.flower', similarityGroup: 'nature' },
  { id: 'letter', labelKey: 'games.words.letter', similarityGroup: 'objects' },
  { id: 'rain', labelKey: 'games.words.rain', similarityGroup: 'nature' },
  { id: 'garden', labelKey: 'games.words.garden', similarityGroup: 'nature' },
  { id: 'mirror', labelKey: 'games.words.mirror', similarityGroup: 'household' },
  { id: 'teacher', labelKey: 'games.words.teacher', similarityGroup: 'people' },
  { id: 'window', labelKey: 'games.words.window', similarityGroup: 'household' },
  { id: 'cow', labelKey: 'games.words.cow', similarityGroup: 'animals' },
  { id: 'blanket', labelKey: 'games.words.blanket', similarityGroup: 'household' },
  { id: 'bridge', labelKey: 'games.words.bridge', similarityGroup: 'travel' },
  { id: 'market', labelKey: 'games.words.market', similarityGroup: 'places' },
  { id: 'lantern', labelKey: 'games.words.lantern', similarityGroup: 'objects' },
  { id: 'neighbour', labelKey: 'games.words.neighbour', similarityGroup: 'people' },
];

/**
 * Levels 1-3 are recognition (easier: the word is on screen to be recognised).
 * Levels 4-5 switch to multi-select, which is closer to free recall because
 * nothing tells the patient how many of the visible words are the right ones
 * until they count them.
 */
export const DIFFICULTY_LEVELS = [
  {
    level: 1, wordCount: 3, presentationMs: 2500, recallDelayMs: 1500,
    mode: RECALL_MODES.RECOGNITION, choicesPerTrial: 3, distractorCount: 0,
    useSimilarWords: false, hintsPerRound: 2,
  },
  {
    level: 2, wordCount: 4, presentationMs: 2200, recallDelayMs: 2500,
    mode: RECALL_MODES.RECOGNITION, choicesPerTrial: 4, distractorCount: 0,
    useSimilarWords: false, hintsPerRound: 2,
  },
  {
    level: 3, wordCount: 4, presentationMs: 2000, recallDelayMs: 4000,
    mode: RECALL_MODES.RECOGNITION, choicesPerTrial: 4, distractorCount: 0,
    useSimilarWords: true, hintsPerRound: 1,
  },
  {
    level: 4, wordCount: 5, presentationMs: 1800, recallDelayMs: 5000,
    mode: RECALL_MODES.MULTI_SELECT, choicesPerTrial: 0, distractorCount: 4,
    useSimilarWords: true, hintsPerRound: 1,
  },
  {
    level: 5, wordCount: 6, presentationMs: 1600, recallDelayMs: 6000,
    mode: RECALL_MODES.MULTI_SELECT, choicesPerTrial: 0, distractorCount: 6,
    useSimilarWords: true, hintsPerRound: 1,
  },
];

export function getLevel(difficulty) {
  return DIFFICULTY_LEVELS[clampDifficulty(difficulty) - 1];
}

export const wordRecallConfig = {
  gameId: GAME_ID,
  cognitiveDomain: COGNITIVE_DOMAINS.VERBAL_MEMORY,
  roundsPerSession: 4,
  levels: DIFFICULTY_LEVELS,
  words: WORD_POOL,
  getLevel,
};

export default wordRecallConfig;
