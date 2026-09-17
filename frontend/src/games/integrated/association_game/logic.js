/**
 * Association Game - pure selection, choice generation and scoring.
 */
import { createRng, shuffle } from '../shared/rng';
import { buildStandardMetrics, mean, safeRatio } from '../shared/metricsShape';
import { GAME_ID, MODES, PAIR_BANK, getConfig } from './config';

export function selectAssociations({ count, rng, bank = PAIR_BANK }) {
  return shuffle(rng, bank).slice(0, Math.min(count, bank.length));
}

/**
 * Wrong answers are other pairs' answers. Similarity controls whether they come
 * from the same semantic category as the correct answer.
 */
export function generateChoices({ pair, pool, choiceCount, similarity, rng }) {
  const others = pool.filter((p) => p.id !== pair.id);
  const sameCategory = others.filter((p) => p.category === pair.category);
  const otherCategory = others.filter((p) => p.category !== pair.category);
  let ordered;
  if (similarity === 'near') ordered = [...shuffle(rng, sameCategory), ...shuffle(rng, otherCategory)];
  else if (similarity === 'far') ordered = [...shuffle(rng, otherCategory), ...shuffle(rng, sameCategory)];
  else ordered = shuffle(rng, others);

  const distractors = ordered.slice(0, Math.max(1, choiceCount - 1)).map((p) => ({ ...p.answer, pairId: p.id }));
  return shuffle(rng, [{ ...pair.answer, pairId: pair.id }, ...distractors]);
}

/** Cued recall gives the patient a first-letter style cue before the choices. */
export function buildCue(pair) {
  return { type: 'initial', labelKey: pair.answer.labelKey, key: 'games.associationGame.hint.startsWith' };
}

export function buildSession({ difficulty, rng = createRng(), bank = PAIR_BANK } = {}) {
  const config = getConfig(difficulty);
  const pairs = selectAssociations({ count: config.pairCount, rng, bank });
  const cuedCount = Math.round(pairs.length * config.cuedRecallRatio);
  const modes = shuffle(rng, [
    ...Array.from({ length: cuedCount }, () => MODES.CUED_RECALL),
    ...Array.from({ length: pairs.length - cuedCount }, () => MODES.RECOGNITION),
  ]);

  const rounds = shuffle(rng, pairs).map((pair, index) => ({
    id: `${GAME_ID}-q${index}`,
    index,
    pairId: pair.id,
    cue: pair.cue,
    answer: pair.answer,
    mode: modes[index] || config.mode,
    choices: generateChoices({ pair, pool: pairs, choiceCount: config.choiceCount, similarity: config.distractorSimilarity, rng }),
    hint: buildCue(pair),
  }));

  return {
    id: `${GAME_ID}-s${Math.floor(rng() * 100000)}`,
    difficulty: config.level,
    learnMsPerPair: config.learnMsPerPair,
    learnDurationMs: config.learnMsPerPair * pairs.length,
    recallDelayMs: config.recallDelayMs,
    hintsAllowed: config.hintsAllowed,
    pairs,
    rounds,
  };
}

export function validateAnswer(round, choice) {
  return choice.pairId === round.pairId;
}

export function recordAnswer({ round, choice, responseTimeMs, hintsUsed }) {
  const correct = validateAnswer(round, choice);
  return {
    roundId: round.id,
    pairId: round.pairId,
    mode: round.mode,
    correct,
    chosenPairId: choice.pairId,
    confusedWith: correct ? null : choice.pairId,
    responseTimeMs,
    hintsUsed,
  };
}

export function buildMetrics({ difficulty, answers, sessionDurationSec, completed, earlyExit = false }) {
  const correct = answers.filter((a) => a.correct).length;
  const confusionPairs = answers
    .filter((a) => a.confusedWith)
    .map((a) => ({ shown: a.pairId, chosen: a.confusedWith }));
  const byMode = answers.reduce((acc, a) => {
    acc[a.mode] = acc[a.mode] || { asked: 0, correct: 0 };
    acc[a.mode].asked += 1;
    if (a.correct) acc[a.mode].correct += 1;
    return acc;
  }, {});

  return buildStandardMetrics({
    gameId: GAME_ID,
    difficulty,
    accuracy: safeRatio(correct, answers.length),
    reactionTimeMs: mean(answers.map((a) => a.responseTimeMs)),
    errors: answers.length - correct,
    hintsUsed: answers.reduce((a, r) => a + r.hintsUsed, 0),
    completed,
    earlyExit,
    sessionDurationSec,
    roundsCompleted: answers.length,
    meta: {
      associations_remembered: correct,
      incorrect_associations: answers.length - correct,
      confusion_pairs: confusionPairs,
      mode_breakdown: byMode,
    },
  });
}
