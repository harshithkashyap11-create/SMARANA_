/**
 * Pattern Completion - pure, deterministic pattern generation and scoring.
 * Pass createRng('seed') for reproducible unit tests.
 */
import { createRng, pick, shuffle } from '../shared/rng';
import { buildStandardMetrics, mean, safeRatio } from '../shared/metricsShape';
import { CATEGORIES, GAME_ID, QUANTITY_ITEMS, SYMBOL_SETS, getConfig } from './config';

/* ------------------------------------------------------------------ cells */

export function symbolCell(symbol) {
  return { kind: 'symbol', id: symbol.id, emoji: symbol.emoji, labelKey: symbol.labelKey };
}

export function quantityCell(item, count) {
  return { kind: 'quantity', id: `${item.id}x${count}`, emoji: item.emoji, count, labelKey: item.labelKey };
}

export function positionCell(index, slots, symbol) {
  return { kind: 'position', id: `pos${index}of${slots}`, index, slots, emoji: symbol.emoji, labelKey: symbol.labelKey };
}

export function cellSignature(cell) {
  if (!cell) return '';
  if (cell.kind === 'quantity') return `q:${cell.id}`;
  if (cell.kind === 'position') return `p:${cell.index}/${cell.slots}`;
  return `s:${cell.id}`;
}

export function cellsEqual(a, b) {
  return cellSignature(a) === cellSignature(b);
}

/* ------------------------------------------------------------- generators */

function buildCyclic(alphabet, length, cycleLength) {
  const cells = [];
  for (let i = 0; i < length + 1; i += 1) cells.push(symbolCell(alphabet[i % cycleLength]));
  return cells;
}

function generateAlternating(rng, length) {
  const set = pick(rng, [SYMBOL_SETS.colours, SYMBOL_SETS.everyday]);
  const alphabet = shuffle(rng, set).slice(0, 2);
  const cells = buildCyclic(alphabet, length, 2);
  return { cells, alphabet, ruleKey: 'games.patternCompletion.rule.alternating' };
}

function generateRepeatingGroup(rng, length) {
  const set = pick(rng, [SYMBOL_SETS.shapes, SYMBOL_SETS.everyday, SYMBOL_SETS.colours]);
  const alphabet = shuffle(rng, set).slice(0, 2);
  // Group of three: A A B repeated.
  const group = [alphabet[0], alphabet[0], alphabet[1]];
  const cells = [];
  for (let i = 0; i < length + 1; i += 1) cells.push(symbolCell(group[i % group.length]));
  return { cells, alphabet, ruleKey: 'games.patternCompletion.rule.repeatingGroup' };
}

function generateQuantity(rng, length) {
  const item = pick(rng, QUANTITY_ITEMS);
  const steps = Math.min(5, Math.max(4, Math.ceil(length / 1.5)));
  const ascending = rng() > 0.25;
  const cells = [];
  for (let i = 0; i < steps; i += 1) {
    const count = ascending ? i + 1 : steps - i;
    cells.push(quantityCell(item, count));
  }
  return {
    cells,
    alphabet: [item],
    ruleKey: ascending ? 'games.patternCompletion.rule.quantityUp' : 'games.patternCompletion.rule.quantityDown',
  };
}

function generateShapeProgression(rng, length) {
  const alphabet = shuffle(rng, SYMBOL_SETS.shapes).slice(0, 3);
  const cells = buildCyclic(alphabet, length, 3);
  return { cells, alphabet, ruleKey: 'games.patternCompletion.rule.shapeCycle' };
}

function generateColourProgression(rng, length) {
  const alphabet = shuffle(rng, SYMBOL_SETS.colours).slice(0, 3);
  const cells = buildCyclic(alphabet, length, 3);
  return { cells, alphabet, ruleKey: 'games.patternCompletion.rule.colourCycle' };
}

function generatePositional(rng, length) {
  const slots = 3;
  const symbol = pick(rng, SYMBOL_SETS.colours);
  const steps = Math.min(6, Math.max(4, length - 1));
  const cells = [];
  for (let i = 0; i < steps; i += 1) cells.push(positionCell(i % slots, slots, symbol));
  return { cells, alphabet: [symbol], ruleKey: 'games.patternCompletion.rule.positional' };
}

const GENERATORS = {
  [CATEGORIES.ALTERNATING]: generateAlternating,
  [CATEGORIES.REPEATING_GROUP]: generateRepeatingGroup,
  [CATEGORIES.QUANTITY]: generateQuantity,
  [CATEGORIES.SHAPE_PROGRESSION]: generateShapeProgression,
  [CATEGORIES.COLOUR_PROGRESSION]: generateColourProgression,
  [CATEGORIES.POSITIONAL]: generatePositional,
};

/* --------------------------------------------------------------- choices */

export function generateChoices({ answer, alphabet, category, choiceCount, similarity, rng }) {
  const pool = [];
  const push = (cell) => {
    if (cell && !cellsEqual(cell, answer) && !pool.some((c) => cellsEqual(c, cell))) pool.push(cell);
  };

  if (category === CATEGORIES.QUANTITY) {
    const item = alphabet[0];
    const near = [answer.count - 1, answer.count + 1, answer.count + 2, answer.count - 2];
    const far = [answer.count + 3, 1, 6];
    (similarity === 'high' ? near.concat(far) : far.concat(near)).forEach((count) => {
      if (count >= 1 && count <= 8) push(quantityCell(item, count));
    });
  } else if (category === CATEGORIES.POSITIONAL) {
    for (let i = 0; i < answer.slots; i += 1) push(positionCell(i, answer.slots, { emoji: answer.emoji, labelKey: answer.labelKey }));
  } else {
    const sameSet = Object.values(SYMBOL_SETS).find((set) => set.some((s) => s.id === answer.id)) || [];
    const familyFirst = similarity === 'high';
    const primary = familyFirst ? sameSet : alphabet;
    const secondary = familyFirst ? alphabet : sameSet;
    shuffle(rng, primary).forEach((s) => push(symbolCell(s)));
    shuffle(rng, secondary).forEach((s) => push(symbolCell(s)));
    Object.values(SYMBOL_SETS)
      .flat()
      .forEach((s) => push(symbolCell(s)));
  }

  const distractors = pool.slice(0, Math.max(1, choiceCount - 1));
  return shuffle(rng, [answer, ...distractors]);
}

/* ---------------------------------------------------------------- rounds */

export function generatePattern({ difficulty, rng = createRng(), roundIndex = 0, category } = {}) {
  const config = getConfig(difficulty);
  const chosenCategory = category || pick(rng, config.categories);
  const generator = GENERATORS[chosenCategory] || generateAlternating;
  const { cells, alphabet, ruleKey } = generator(rng, config.patternLength);

  const answer = cells[cells.length - 1];
  const sequence = cells.slice(0, cells.length - 1);
  const choices = generateChoices({
    answer,
    alphabet,
    category: chosenCategory,
    choiceCount: config.choiceCount,
    similarity: config.similarity,
    rng,
  });

  return {
    id: `${GAME_ID}-r${roundIndex}`,
    roundIndex,
    difficulty: config.level,
    category: chosenCategory,
    sequence,
    answer,
    choices,
    ruleKey,
    showRuleSupport: config.showRuleSupport,
    hintsAllowed: config.hintsAllowed,
  };
}

export function checkAnswer(round, choice) {
  return cellsEqual(round.answer, choice);
}

/** Hint ladder: 1 = restate the rule, 2 = remove a wrong choice, 3 = point at the repeat. */
export function nextHint(round, hintsUsed) {
  if (hintsUsed === 0) return { type: 'rule', key: round.ruleKey };
  if (hintsUsed === 1) {
    const wrong = round.choices.find((c) => !cellsEqual(c, round.answer));
    return { type: 'eliminate', choiceId: wrong ? cellSignature(wrong) : null, key: 'games.patternCompletion.hint.eliminate' };
  }
  return { type: 'point', key: 'games.patternCompletion.hint.lookBack' };
}

export function summarizeRound({ round, correct, attempts, hintsUsed, responseTimeMs }) {
  return {
    roundId: round.id,
    category: round.category,
    correct,
    attempts,
    hintsUsed,
    responseTimeMs,
  };
}

export function buildMetrics({ difficulty, rounds, sessionDurationSec, completed, earlyExit = false }) {
  const correct = rounds.filter((r) => r.correct).length;
  const attempts = rounds.reduce((a, r) => a + r.attempts, 0);
  const byCategory = rounds.reduce((acc, r) => {
    acc[r.category] = acc[r.category] || { seen: 0, correct: 0 };
    acc[r.category].seen += 1;
    if (r.correct) acc[r.category].correct += 1;
    return acc;
  }, {});

  return buildStandardMetrics({
    gameId: GAME_ID,
    difficulty,
    accuracy: safeRatio(correct, rounds.length),
    reactionTimeMs: mean(rounds.map((r) => r.responseTimeMs)),
    errors: Math.max(0, attempts - correct),
    hintsUsed: rounds.reduce((a, r) => a + r.hintsUsed, 0),
    completed,
    earlyExit,
    sessionDurationSec,
    roundsCompleted: rounds.length,
    meta: {
      correct_answers: correct,
      incorrect_answers: Math.max(0, attempts - correct),
      total_attempts: attempts,
      category_breakdown: byCategory,
    },
  });
}
