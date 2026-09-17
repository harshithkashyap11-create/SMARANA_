/**
 * Association Game - difficulty configuration and the semantic pair bank.
 * Pairs are everyday, culturally neutral and easy to picture.
 */
export const GAME_ID = 'association_game';
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export const MODES = { RECOGNITION: 'recognition', CUED_RECALL: 'cued_recall' };

/**
 * category is used to control distractor similarity: at high difficulty the
 * wrong answers are drawn from the same category as the right one.
 */
export const PAIR_BANK = [
  { id: 'key-door', category: 'home', cue: { emoji: '🔑', labelKey: 'items.key' }, answer: { emoji: '🚪', labelKey: 'items.door' } },
  { id: 'cup-tea', category: 'home', cue: { emoji: '☕', labelKey: 'items.cup' }, answer: { emoji: '🫖', labelKey: 'items.teapot' } },
  { id: 'shoe-foot', category: 'body', cue: { emoji: '👟', labelKey: 'items.shoe' }, answer: { emoji: '🦶', labelKey: 'items.foot' } },
  { id: 'bird-nest', category: 'nature', cue: { emoji: '🐦', labelKey: 'items.bird' }, answer: { emoji: '🪺', labelKey: 'items.nest' } },
  { id: 'pen-paper', category: 'home', cue: { emoji: '🖊️', labelKey: 'items.pen' }, answer: { emoji: '📄', labelKey: 'items.paper' } },
  { id: 'rain-umbrella', category: 'weather', cue: { emoji: '🌧️', labelKey: 'items.rain' }, answer: { emoji: '🌂', labelKey: 'items.umbrella' } },
  { id: 'needle-thread', category: 'home', cue: { emoji: '🪡', labelKey: 'items.needle' }, answer: { emoji: '🧵', labelKey: 'items.thread' } },
  { id: 'fish-water', category: 'nature', cue: { emoji: '🐟', labelKey: 'items.fish' }, answer: { emoji: '💧', labelKey: 'items.water' } },
  { id: 'lock-chain', category: 'home', cue: { emoji: '🔒', labelKey: 'items.lock' }, answer: { emoji: '⛓️', labelKey: 'items.chain' } },
  { id: 'sun-day', category: 'weather', cue: { emoji: '☀️', labelKey: 'items.sun' }, answer: { emoji: '🌅', labelKey: 'items.daytime' } },
  { id: 'cow-milk', category: 'nature', cue: { emoji: '🐄', labelKey: 'items.cow' }, answer: { emoji: '🥛', labelKey: 'items.milk' } },
  { id: 'hand-glove', category: 'body', cue: { emoji: '✋', labelKey: 'items.hand' }, answer: { emoji: '🧤', labelKey: 'items.glove' } },
];

export const DIFFICULTY_LEVELS = {
  1: { pairCount: 3, choiceCount: 2, learnMsPerPair: 5000, recallDelayMs: 800, mode: MODES.RECOGNITION, cuedRecallRatio: 0, distractorSimilarity: 'far', hintsAllowed: 3, reportEveryRounds: 1 },
  2: { pairCount: 4, choiceCount: 3, learnMsPerPair: 4500, recallDelayMs: 1200, mode: MODES.RECOGNITION, cuedRecallRatio: 0, distractorSimilarity: 'far', hintsAllowed: 3, reportEveryRounds: 1 },
  3: { pairCount: 5, choiceCount: 3, learnMsPerPair: 4000, recallDelayMs: 2000, mode: MODES.RECOGNITION, cuedRecallRatio: 0.25, distractorSimilarity: 'mixed', hintsAllowed: 2, reportEveryRounds: 1 },
  4: { pairCount: 5, choiceCount: 4, learnMsPerPair: 3500, recallDelayMs: 3000, mode: MODES.RECOGNITION, cuedRecallRatio: 0.6, distractorSimilarity: 'near', hintsAllowed: 2, reportEveryRounds: 1 },
  5: { pairCount: 6, choiceCount: 4, learnMsPerPair: 3000, recallDelayMs: 4000, mode: MODES.CUED_RECALL, cuedRecallRatio: 1, distractorSimilarity: 'near', hintsAllowed: 1, reportEveryRounds: 1 },
};

export function getConfig(level) {
  const clamped = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(Number(level)) || MIN_DIFFICULTY));
  return { ...DIFFICULTY_LEVELS[clamped], level: clamped };
}
