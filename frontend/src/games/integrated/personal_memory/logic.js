/**
 * Personal Memory Recall - pure prompt building, hint progression and scoring.
 * Nothing here knows where the memory items came from.
 */
import { createRng, pick, shuffle } from '../shared/rng';
import { buildStandardMetrics, mean, safeRatio } from '../shared/metricsShape';
import { CONSECUTIVE_MISSES_BEFORE_MORE_SUPPORT, GAME_ID, MODES, getConfig } from './config';
import { MEMORY_ITEM_TYPES } from './sampleData';

export function isPerson(item) {
  return item.type === MEMORY_ITEM_TYPES.PERSON;
}

/** Which modes are actually possible given the content the caregiver approved. */
export function availableModes(items, configModes) {
  const hasPeople = items.some(isPerson);
  const hasPlaces = items.some((i) => !isPerson(i));
  const hasRelationships = items.some((i) => isPerson(i) && i.relationship);
  const supported = configModes.filter((mode) => {
    if (mode === MODES.PLACE_RECOGNITION) return hasPlaces;
    if (mode === MODES.RELATIONSHIP_RECALL) return hasRelationships;
    return hasPeople;
  });
  return supported.length ? supported : hasPlaces ? [MODES.PLACE_RECOGNITION] : hasPeople ? [MODES.PERSON_RECOGNITION] : [];
}

function candidatesForMode(items, mode) {
  if (mode === MODES.PLACE_RECOGNITION) return items.filter((i) => !isPerson(i));
  if (mode === MODES.RELATIONSHIP_RECALL) return items.filter((i) => isPerson(i) && i.relationship);
  return items.filter(isPerson);
}

/** Name choices are other real names from the same capsule - never invented ones. */
export function buildNameChoices({ item, items, choiceCount, rng }) {
  const sameType = items.filter((i) => i.id !== item.id && i.type === item.type);
  const others = shuffle(rng, sameType.length ? sameType : items.filter((i) => i.id !== item.id));
  const distractors = others.slice(0, Math.max(1, choiceCount - 1)).map((i) => ({ id: i.id, label: i.displayName }));
  return shuffle(rng, [{ id: item.id, label: item.displayName }, ...distractors]);
}

export function buildRelationshipChoices({ item, items, choiceCount, rng }) {
  const pool = Array.from(
    new Set(items.filter((i) => isPerson(i) && i.relationship && i.relationship !== item.relationship).map((i) => i.relationship))
  );
  const distractors = shuffle(rng, pool)
    .slice(0, Math.max(1, choiceCount - 1))
    .map((relationship) => ({ id: `rel-${relationship}`, label: relationship }));
  return shuffle(rng, [{ id: `rel-${item.relationship}`, label: item.relationship, correct: true }, ...distractors]);
}

/**
 * Hint ladder, weakest cue first. Hints are offered warmly and never counted
 * against the patient in the accuracy figure.
 */
export function buildHintLadder(item, mode, maxHints) {
  const hints = [];
  if (isPerson(item)) {
    hints.push({ key: 'games.personalMemory.hint.familyContext', params: {} });
    if (item.relationship && mode !== MODES.RELATIONSHIP_RECALL) {
      hints.push({ key: 'games.personalMemory.hint.relationship', params: { relationship: item.relationship } });
    }
    if (item.note) hints.push({ key: 'games.personalMemory.hint.note', params: { note: item.note } });
    hints.push({ key: 'games.personalMemory.hint.initial', params: { letter: (item.displayName || '?').charAt(0) } });
  } else {
    if (item.location) hints.push({ key: 'games.personalMemory.hint.location', params: { location: item.location } });
    if (item.note) hints.push({ key: 'games.personalMemory.hint.note', params: { note: item.note } });
    hints.push({ key: 'games.personalMemory.hint.initial', params: { letter: (item.displayName || '?').charAt(0) } });
  }
  return hints.slice(0, Math.max(1, maxHints));
}

/**
 * Build one prompt. `history` lets the generator avoid repeating the item that
 * was just asked about.
 */
export function buildPrompt({ items = [], difficulty, rng = createRng(), roundIndex = 0, history = [] } = {}) {
  const config = getConfig(difficulty);
  const modes = availableModes(items, config.modes);
  if (!items.length || !modes.length) return null;

  const lastItemId = history.length ? history[history.length - 1].itemId : null;
  let mode = pick(rng, modes);
  let candidates = candidatesForMode(items, mode).filter((i) => i.id !== lastItemId);
  if (!candidates.length) {
    mode = modes.find((m) => candidatesForMode(items, m).length) || modes[0];
    candidates = candidatesForMode(items, mode);
  }
  const item = pick(rng, candidates);

  const isRelationship = mode === MODES.RELATIONSHIP_RECALL;
  const choices = isRelationship
    ? buildRelationshipChoices({ item, items, choiceCount: config.choiceCount, rng })
    : buildNameChoices({ item, items, choiceCount: config.choiceCount, rng });

  const questionKey = isRelationship
    ? 'games.personalMemory.question.relationship'
    : isPerson(item)
    ? 'games.personalMemory.question.whoIsThis'
    : 'games.personalMemory.question.whereIsThis';

  return {
    id: `${GAME_ID}-r${roundIndex}`,
    roundIndex,
    difficulty: config.level,
    mode,
    itemId: item.id,
    item,
    questionKey,
    choices,
    correctChoiceId: isRelationship ? `rel-${item.relationship}` : item.id,
    hints: buildHintLadder(item, mode, config.hintsAvailable),
    showContext: config.showContext,
    showRelationshipOnCard: config.showRelationshipOnCard,
    revealChoicesImmediately: mode !== MODES.CUED_RECALL,
    autoHintAfterMs: config.autoHintAfterMs,
    recallDelayMs: config.recallDelayMs,
  };
}

export function validateRecognition(prompt, choice) {
  return choice.id === prompt.correctChoiceId;
}

export function recordAnswer({ prompt, choice, responseTimeMs, hintsUsed }) {
  const correct = validateRecognition(prompt, choice);
  return {
    roundId: prompt.id,
    itemId: prompt.itemId,
    mode: prompt.mode,
    correct,
    hintsUsed,
    recalledAfterHint: correct && hintsUsed > 0,
    responseTimeMs,
  };
}

/** Per-item view used to spot which memories need more support next time. */
export function itemSupportSummary(answers) {
  return answers.reduce((acc, a) => {
    const entry = acc[a.itemId] || { asked: 0, recalled: 0, hints: 0 };
    entry.asked += 1;
    if (a.correct) entry.recalled += 1;
    entry.hints += a.hintsUsed;
    acc[a.itemId] = entry;
    return acc;
  }, {});
}

/** True when the game itself should offer more support, independent of the DDA. */
export function shouldIncreaseSupport(answers, threshold = CONSECUTIVE_MISSES_BEFORE_MORE_SUPPORT) {
  if (answers.length < threshold) return false;
  return answers.slice(-threshold).every((a) => !a.correct);
}

export function buildMetrics({ difficulty, answers, sessionDurationSec, completed, earlyExit = false }) {
  const recognition = answers.filter((a) => a.mode !== MODES.RELATIONSHIP_RECALL);
  const relationship = answers.filter((a) => a.mode === MODES.RELATIONSHIP_RECALL);
  const correct = answers.filter((a) => a.correct).length;
  const perItem = itemSupportSummary(answers);

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
      recognition_accuracy: Number(safeRatio(recognition.filter((a) => a.correct).length, recognition.length).toFixed(4)),
      relationship_accuracy: Number(safeRatio(relationship.filter((a) => a.correct).length, relationship.length).toFixed(4)),
      hints_required: answers.reduce((a, r) => a + r.hintsUsed, 0),
      recall_after_hint: answers.filter((a) => a.recalledAfterHint).length,
      items_needing_more_support: Object.entries(perItem)
        .filter(([, v]) => v.recalled < v.asked)
        .map(([id]) => id),
      per_item_support: perItem,
      support_level: difficulty,
    },
  });
}
