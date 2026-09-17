import { pickOne, sample, shuffle } from '../shared/random.js';
import { computeAccuracy } from '../shared/gameMetrics.js';
import { RECALL_MODES, WORD_POOL, getLevel } from './config.js';

function groupBySimilarity(pool, minSize = 2) {
  const groups = new Map();
  pool.forEach((word) => {
    const bucket = groups.get(word.similarityGroup) ?? [];
    bucket.push(word);
    groups.set(word.similarityGroup, bucket);
  });
  return [...groups.values()].filter((words) => words.length >= minSize);
}

export function selectTargets(count, rng = Math.random, pool = WORD_POOL, useSimilarWords = false) {
  if (!useSimilarWords) return sample(pool, count, rng);

  const seedGroup = pickOne(groupBySimilarity(pool), rng) ?? [];
  const fromGroup = sample(seedGroup, Math.min(count, seedGroup.length), rng);
  const chosenIds = fromGroup.map((word) => word.id);
  const remainder = sample(
    pool.filter((word) => !chosenIds.includes(word.id)),
    count - fromGroup.length,
    rng,
  );
  return [...fromGroup, ...remainder];
}

/**
 * Recognition levels produce one trial per target word; multi-select levels
 * produce a single grid holding every target plus distractors.
 */
export function generateRound(difficulty, rng = Math.random, pool = WORD_POOL) {
  const level = getLevel(difficulty);
  const targets = selectTargets(level.wordCount, rng, pool, level.useSimilarWords);
  const targetIds = targets.map((word) => word.id);
  const distractorPool = pool.filter((word) => !targetIds.includes(word.id));

  if (level.mode === RECALL_MODES.MULTI_SELECT) {
    const distractors = sample(distractorPool, level.distractorCount, rng);
    return {
      level,
      mode: level.mode,
      targets,
      targetIds,
      choices: shuffle([...targets, ...distractors], rng),
      trials: [],
    };
  }

  const usedDistractorIds = [];
  const trials = targets.map((target) => {
    const available = distractorPool.filter(
      (word) => !usedDistractorIds.includes(word.id),
    );
    const distractors = sample(available, Math.max(0, level.choicesPerTrial - 1), rng);
    usedDistractorIds.push(...distractors.map((word) => word.id));
    return {
      targetId: target.id,
      choices: shuffle([target, ...distractors], rng),
    };
  });

  return { level, mode: level.mode, targets, targetIds, choices: [], trials };
}

/** @param {Array<{targetId: string, answerId: string|null}>} answers */
export function evaluateRecognition(answers) {
  const correct = answers.filter((answer) => answer.answerId === answer.targetId).length;
  const incorrect = answers.filter(
    (answer) => answer.answerId && answer.answerId !== answer.targetId,
  ).length;
  const omissions = answers.filter((answer) => !answer.answerId).length;

  return {
    correct,
    total: answers.length,
    incorrect,
    omissions,
    intrusions: incorrect,
    errors: incorrect + omissions,
    accuracy: computeAccuracy(correct, answers.length),
    isPerfect: correct === answers.length,
  };
}

export function evaluateMultiSelect(selectedIds, targetIds) {
  const remembered = selectedIds.filter((id) => targetIds.includes(id));
  const intrusions = selectedIds.filter((id) => !targetIds.includes(id));
  const omissions = targetIds.filter((id) => !selectedIds.includes(id));

  return {
    correct: remembered.length,
    total: targetIds.length,
    incorrect: intrusions.length,
    intrusions: intrusions.length,
    omissions: omissions.length,
    errors: intrusions.length + omissions.length,
    accuracy: computeAccuracy(remembered.length, targetIds.length),
    isPerfect: remembered.length === targetIds.length && intrusions.length === 0,
  };
}

/** First target the patient has not yet chosen — drives the hint. */
export function nextUnselectedTarget(targetIds, selectedIds) {
  return targetIds.find((id) => !selectedIds.includes(id)) ?? null;
}
