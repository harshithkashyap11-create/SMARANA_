import { describe, it, expect } from "vitest";
/**
 * Core-logic tests.
 *
 * Written with globals (describe / it / expect) so they run under Jest as-is,
 * or under Vitest with `test: { globals: true }` in vite.config.
 * Nothing here touches React, the DOM or the network.
 */

import { createRng } from '../shared/random.js';
import {
  applyAdjustment,
  buildGameMetrics,
  clampDifficulty,
  computeAccuracy,
  createRoundResult,
} from '../shared/gameMetrics.js';

import { generateRound as generateSequenceRound, evaluateSequence } from '../sequence_recall/logic.js';
import { buildDeck, isMatch, summariseMatchRound } from '../memory_match/logic.js';
import { generateScenes, evaluateSelections } from '../find_the_change/logic.js';
import { generateRound as generateSortingRound, distribute, isCorrectPlacement } from '../object_sorting/logic.js';
import { buildRound as buildRoutineRound, evaluateOrder } from '../daily_routine/logic.js';
import { generateRound as generateWordRound, evaluateMultiSelect, evaluateRecognition } from '../word_recall/logic.js';
import { RECALL_MODES } from '../word_recall/config.js';

const rng = () => createRng(42);

describe('difficulty clamping', () => {
  it('keeps difficulty inside 1..5', () => {
    expect(clampDifficulty(0)).toBe(1);
    expect(clampDifficulty(9)).toBe(5);
    expect(clampDifficulty('3')).toBe(3);
    expect(clampDifficulty(undefined)).toBe(1);
  });

  it('applies only valid DDA adjustments', () => {
    expect(applyAdjustment(3, 1)).toBe(4);
    expect(applyAdjustment(3, -1)).toBe(2);
    expect(applyAdjustment(5, 1)).toBe(5);
    expect(applyAdjustment(1, -1)).toBe(1);
    expect(applyAdjustment(3, 7)).toBe(3);
    expect(applyAdjustment(3, null)).toBe(3);
  });
});

describe('metrics', () => {
  it('computes bounded accuracy', () => {
    expect(computeAccuracy(2, 4)).toBe(0.5);
    expect(computeAccuracy(0, 0)).toBe(0);
    expect(computeAccuracy(5, 4)).toBe(1);
  });

  it('builds the standard metrics event', () => {
    const rounds = [
      createRoundResult({ round: 1, difficulty: 2, correct: 3, total: 4, errors: 1, reactionTimeMs: 2000 }),
      createRoundResult({ round: 2, difficulty: 2, correct: 4, total: 4, errors: 0, reactionTimeMs: 3000, hintsUsed: 1 }),
    ];
    const startedAt = Date.now() - 60_000;
    const metrics = buildGameMetrics({
      gameId: 'sequence_recall',
      rounds,
      difficulty: 2,
      startedAt,
      completed: true,
    });

    expect(metrics.game_id).toBe('sequence_recall');
    expect(metrics.difficulty).toBe(2);
    expect(metrics.accuracy).toBeCloseTo(0.875, 3);
    expect(metrics.reaction_time_ms).toBe(2500);
    expect(metrics.errors).toBe(1);
    expect(metrics.hints_used).toBe(1);
    expect(metrics.rounds_completed).toBe(2);
    expect(metrics.session_duration_sec).toBeGreaterThanOrEqual(59);
    expect(typeof metrics.timestamp).toBe('string');
  });
});

describe('sequence recall', () => {
  it('generates a sequence of the level length with distractors in the options', () => {
    const round = generateSequenceRound(3, rng());
    expect(round.sequence).toHaveLength(5);
    expect(round.options).toHaveLength(6);
    round.sequence.forEach((item) => {
      expect(round.options.some((option) => option.id === item.id)).toBe(true);
    });
  });

  it('scores position by position and counts extra taps as errors', () => {
    const sequence = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(evaluateSequence(sequence, [{ id: 'a' }, { id: 'b' }, { id: 'c' }])).toMatchObject({
      correctPositions: 3,
      errors: 0,
      isPerfect: true,
    });
    expect(evaluateSequence(sequence, [{ id: 'a' }, { id: 'c' }, { id: 'b' }])).toMatchObject({
      correctPositions: 1,
      errors: 2,
      isPerfect: false,
    });
  });
});

describe('memory match', () => {
  it('builds a full deck of pairs', () => {
    const deck = buildDeck(3, rng());
    expect(deck.cards).toHaveLength(8);
    expect(deck.pairCount).toBe(4);
    const itemIds = deck.cards.map((card) => card.itemId);
    new Set(itemIds).forEach((itemId) => {
      expect(itemIds.filter((id) => id === itemId)).toHaveLength(2);
    });
  });

  it('matches two different cards of the same item only', () => {
    const [first, second] = buildDeck(1, rng()).cards;
    expect(isMatch(first, first)).toBe(false);
    expect(isMatch(first, { ...first, cardId: 'other' })).toBe(true);
    expect(isMatch(first, { ...second, itemId: 'different' })).toBe(false);
  });

  it('scores a flawless board as full accuracy', () => {
    const summary = summariseMatchRound({
      pairCount: 4, moves: 4, mismatches: 0, durationMs: 20000,
    });
    expect(summary.accuracy).toBe(1);
    expect(summary.averageDecisionMs).toBe(5000);
  });
});

describe('find the change', () => {
  it('produces the requested number of changes with an answer key', () => {
    const scene = generateScenes(4, rng());
    expect(scene.before).toHaveLength(8);
    expect(scene.changes).toHaveLength(2);
    expect(scene.answerIds).toHaveLength(2);
    scene.answerIds.forEach((id) => {
      expect(scene.before.some((item) => item.id === id)).toBe(true);
    });
  });

  it('separates correct, false and missed selections', () => {
    const result = evaluateSelections(['a', 'x'], ['a', 'b']);
    expect(result.correct).toBe(1);
    expect(result.falseSelections).toEqual(['x']);
    expect(result.missedIds).toEqual(['b']);
    expect(result.errors).toBe(2);
    expect(result.isPerfect).toBe(false);
  });
});

describe('object sorting', () => {
  it('spreads objects evenly across categories', () => {
    expect(distribute(8, 3)).toEqual([3, 3, 2]);
    const round = generateSortingRound(3, rng());
    expect(round.objects).toHaveLength(8);
    expect(round.categories.length).toBeGreaterThanOrEqual(3);
  });

  it('validates placements against the object category', () => {
    const object = { id: 'apple', category: 'food' };
    expect(isCorrectPlacement(object, 'food')).toBe(true);
    expect(isCorrectPlacement(object, 'tools')).toBe(false);
    expect(isCorrectPlacement(null, 'food')).toBe(false);
  });
});

describe('daily routine', () => {
  it('builds a scenario with the right number of steps and distractors', () => {
    const round = buildRoutineRound(5, rng());
    expect(round.steps).toHaveLength(5);
    expect(round.correctOrder).toHaveLength(5);
    expect(round.tray).toHaveLength(7);
  });

  it('pre-places the first step at level 1', () => {
    const round = buildRoutineRound(1, rng());
    expect(round.slots[0]).toBe(round.correctOrder[0]);
    expect(round.tray).toHaveLength(2);
  });

  it('scores order position by position', () => {
    expect(evaluateOrder(['a', 'b', 'c'], ['a', 'b', 'c'])).toMatchObject({
      correctPositions: 3, misplaced: 0, isPerfect: true,
    });
    expect(evaluateOrder(['b', 'a', 'c'], ['a', 'b', 'c'])).toMatchObject({
      correctPositions: 1, misplaced: 2, isPerfect: false,
    });
  });
});

describe('word recall', () => {
  it('builds recognition trials with one target each', () => {
    const round = generateWordRound(2, rng());
    expect(round.mode).toBe(RECALL_MODES.RECOGNITION);
    expect(round.targets).toHaveLength(4);
    expect(round.trials).toHaveLength(4);
    round.trials.forEach((trial) => {
      expect(trial.choices).toHaveLength(4);
      expect(trial.choices.some((choice) => choice.id === trial.targetId)).toBe(true);
    });
  });

  it('builds a multi-select grid of targets plus distractors', () => {
    const round = generateWordRound(5, rng());
    expect(round.mode).toBe(RECALL_MODES.MULTI_SELECT);
    expect(round.choices).toHaveLength(12);
  });

  it('counts intrusions and omissions', () => {
    const result = evaluateMultiSelect(['a', 'z'], ['a', 'b']);
    expect(result.correct).toBe(1);
    expect(result.intrusions).toBe(1);
    expect(result.omissions).toBe(1);
    expect(result.isPerfect).toBe(false);

    const recognition = evaluateRecognition([
      { targetId: 'a', answerId: 'a' },
      { targetId: 'b', answerId: 'c' },
    ]);
    expect(recognition.correct).toBe(1);
    expect(recognition.intrusions).toBe(1);
    expect(recognition.accuracy).toBe(0.5);
  });
});
