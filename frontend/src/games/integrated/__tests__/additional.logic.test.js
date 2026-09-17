import { describe, it, expect } from "vitest";
/**
 * Pure-logic tests for games 7-12.
 *
 * Written for Jest/Vitest-compatible globals (describe/it/expect). If games 1-6
 * use a different runner or helper style, move these cases into that suite -
 * the assertions do not depend on the runner beyond `expect`.
 */
import { createRng } from '../shared/rng';
import { clampDifficulty, normalizeAdjustment } from '../shared/useDifficultyController';

import * as visualSearch from '../visual_search/logic';
import * as patternCompletion from '../pattern_completion/logic';
import * as spatialRecall from '../spatial_recall/logic';
import * as attentionTap from '../attention_tap/logic';
import * as association from '../association_game/logic';
import * as personalMemory from '../personal_memory/logic';
// Synthetic fixtures stay in tests; production uses the authenticated capsule provider.
const SAMPLE_MEMORY_ITEMS = [
  { id: 'test-person-a', type: 'person', displayName: 'Example A', relationship: 'friend', note: 'At the garden', location: 'Garden' },
  { id: 'test-person-b', type: 'person', displayName: 'Example B', relationship: 'sibling', location: 'Home' },
  { id: 'test-place-a', type: 'place', displayName: 'Garden', location: 'Garden' },
  { id: 'test-place-b', type: 'place', displayName: 'Home', location: 'Home' },
];
import { getConfig as attentionTapConfig, MIN_GAP_MS, MIN_STIMULUS_MS } from '../attention_tap/config';

const seeded = () => createRng('smarana-test');

describe('difficulty controller helpers', () => {
  it('clamps difficulty to 1-5', () => {
    expect(clampDifficulty(0)).toBe(1);
    expect(clampDifficulty(9)).toBe(5);
    expect(clampDifficulty('3')).toBe(3);
    expect(clampDifficulty(undefined)).toBe(1);
  });

  it('normalises every backend adjustment shape to -1/0/1', () => {
    expect(normalizeAdjustment(1)).toBe(1);
    expect(normalizeAdjustment({ adjustment: -1 })).toBe(-1);
    expect(normalizeAdjustment({ data: { adjustment: 1 } })).toBe(1);
    expect(normalizeAdjustment({ difficulty_delta: 4 })).toBe(0);
    expect(normalizeAdjustment(null)).toBe(0);
    expect(normalizeAdjustment('nonsense')).toBe(0);
  });
});

describe('visual search', () => {
  it('fills the grid and places the requested number of targets', () => {
    const round = visualSearch.generateRound({ difficulty: 4, rng: seeded() });
    expect(round.cells).toHaveLength(round.rows * round.cols);
    expect(round.cells.filter((c) => c.isTarget)).toHaveLength(round.targetCount);
  });

  it('uses only same-family distractors at maximum difficulty', () => {
    const round = visualSearch.generateRound({ difficulty: 5, rng: seeded() });
    const distractorIds = round.cells.filter((c) => !c.isTarget).map((c) => c.itemId);
    const items = visualSearch.flattenItems();
    const targetFamily = items.find((i) => i.id === round.target.id).family;
    distractorIds.forEach((id) => {
      expect(items.find((i) => i.id === id).family).toBe(targetFamily);
    });
  });

  it('counts hits, false positives and misses', () => {
    const round = visualSearch.generateRound({ difficulty: 1, rng: seeded() });
    let state = visualSearch.createRoundState(round);
    const target = round.cells.find((c) => c.isTarget);
    const wrong = round.cells.find((c) => !c.isTarget);
    state = visualSearch.registerTap(state, round, wrong.key, 900);
    state = visualSearch.registerTap(state, round, target.key, 1800);
    const summary = visualSearch.summarizeRound(state);
    expect(summary.hits).toBe(1);
    expect(summary.falsePositives).toBe(1);
    expect(summary.misses).toBe(0);
  });

  it('is deterministic for a fixed seed', () => {
    const a = visualSearch.generateRound({ difficulty: 3, rng: createRng('x') });
    const b = visualSearch.generateRound({ difficulty: 3, rng: createRng('x') });
    expect(a.cells.map((c) => c.itemId)).toEqual(b.cells.map((c) => c.itemId));
  });
});

describe('pattern completion', () => {
  it('always includes the correct answer among the choices', () => {
    [1, 2, 3, 4, 5].forEach((level) => {
      const round = patternCompletion.generatePattern({ difficulty: level, rng: seeded() });
      expect(round.choices.some((c) => patternCompletion.cellsEqual(c, round.answer))).toBe(true);
      expect(patternCompletion.checkAnswer(round, round.answer)).toBe(true);
    });
  });

  it('continues an alternating pattern correctly', () => {
    const round = patternCompletion.generatePattern({ difficulty: 1, rng: seeded(), category: 'alternating' });
    const first = round.sequence[0];
    const expectedIsFirst = round.sequence.length % 2 === 0;
    expect(patternCompletion.cellsEqual(round.answer, expectedIsFirst ? first : round.sequence[1])).toBe(true);
  });

  it('offers the configured number of choices', () => {
    const round = patternCompletion.generatePattern({ difficulty: 5, rng: seeded() });
    expect(round.choices.length).toBeGreaterThanOrEqual(2);
    expect(round.choices.length).toBeLessThanOrEqual(4);
  });
});

describe('spatial recall', () => {
  it('places each object in a distinct cell inside the grid', () => {
    const round = spatialRecall.generateRound({ difficulty: 5, rng: seeded() });
    const cells = round.placements.map((p) => p.cell);
    expect(new Set(cells).size).toBe(cells.length);
    cells.forEach((cell) => expect(cell).toBeLessThan(round.rows * round.cols));
  });

  it('asks about objects that were actually shown', () => {
    const round = spatialRecall.generateRound({ difficulty: 4, rng: seeded() });
    round.recallQueue.forEach((target) => {
      expect(round.placements.some((p) => p.id === target.id && p.cell === target.cell)).toBe(true);
    });
  });

  it('measures distance from the correct cell', () => {
    expect(spatialRecall.gridDistance(0, 3, 3)).toEqual({ manhattan: 1, chebyshev: 1 });
    expect(spatialRecall.gridDistance(0, 8, 3)).toEqual({ manhattan: 4, chebyshev: 2 });
  });

  it('validates a selected location', () => {
    const round = spatialRecall.generateRound({ difficulty: 1, rng: seeded() });
    const target = round.recallQueue[0];
    expect(spatialRecall.validateLocation(round, target, target.cell).correct).toBe(true);
  });
});

describe('attention tap', () => {
  it('never schedules stimuli faster than the safety floor', () => {
    [1, 2, 3, 4, 5].forEach((level) => {
      const config = attentionTapConfig(level);
      expect(config.stimulusMs).toBeGreaterThanOrEqual(MIN_STIMULUS_MS);
      expect(config.gapMs).toBeGreaterThanOrEqual(MIN_GAP_MS);
    });
  });

  it('includes targets and distractors, with monotonic onsets', () => {
    const round = attentionTap.generateStimulusSequence({ difficulty: 3, rng: seeded() });
    expect(round.sequence.some((s) => s.isTarget)).toBe(true);
    expect(round.sequence.some((s) => !s.isTarget)).toBe(true);
    round.sequence.slice(1).forEach((s, i) => expect(s.onsetMs).toBeGreaterThan(round.sequence[i].onsetMs));
  });

  it('scores hits, misses and false alarms', () => {
    const round = attentionTap.generateStimulusSequence({ difficulty: 2, rng: seeded() });
    const targets = round.sequence.filter((s) => s.isTarget);
    const distractor = round.sequence.find((s) => !s.isTarget);
    const taps = [
      { stimulusId: targets[0].id, latencyMs: 600 },
      { stimulusId: distractor.id, latencyMs: 700 },
      { stimulusId: null, latencyMs: 0 },
    ];
    const scored = attentionTap.scoreSequence(round, taps);
    expect(scored.hits).toBe(1);
    expect(scored.misses).toBe(targets.length - 1);
    expect(scored.falseAlarms).toBe(2);
    expect(scored.meanReactionTimeMs).toBe(600);
  });

  it('only introduces the inhibition rule at the highest level', () => {
    expect(attentionTap.generateStimulusSequence({ difficulty: 3, rng: seeded() }).inhibition).toBe(false);
    expect(attentionTap.generateStimulusSequence({ difficulty: 5, rng: seeded() }).inhibition).toBe(true);
  });
});

describe('association game', () => {
  it('builds one question per learned pair with the answer present', () => {
    const session = association.buildSession({ difficulty: 3, rng: seeded() });
    expect(session.rounds).toHaveLength(session.pairs.length);
    session.rounds.forEach((round) => {
      expect(round.choices.some((c) => c.pairId === round.pairId)).toBe(true);
    });
  });

  it('validates the associated answer and records confusions', () => {
    const session = association.buildSession({ difficulty: 2, rng: seeded() });
    const round = session.rounds[0];
    const wrong = round.choices.find((c) => c.pairId !== round.pairId);
    expect(association.validateAnswer(round, round.choices.find((c) => c.pairId === round.pairId))).toBe(true);
    const answer = association.recordAnswer({ round, choice: wrong, responseTimeMs: 1200, hintsUsed: 0 });
    expect(answer.correct).toBe(false);
    expect(answer.confusedWith).toBe(wrong.pairId);
  });

  it('uses cued recall only at higher difficulty', () => {
    const easy = association.buildSession({ difficulty: 1, rng: seeded() });
    const hard = association.buildSession({ difficulty: 5, rng: seeded() });
    expect(easy.rounds.every((r) => r.mode === 'recognition')).toBe(true);
    expect(hard.rounds.every((r) => r.mode === 'cued_recall')).toBe(true);
  });
});

describe('personal memory', () => {
  it('builds a prompt whose choices contain the correct item', () => {
    const prompt = personalMemory.buildPrompt({ items: SAMPLE_MEMORY_ITEMS, difficulty: 2, rng: seeded() });
    expect(prompt.choices.some((c) => c.id === prompt.correctChoiceId)).toBe(true);
  });

  it('gives more hints and fewer choices at the most supportive level', () => {
    const supported = personalMemory.buildPrompt({ items: SAMPLE_MEMORY_ITEMS, difficulty: 1, rng: seeded() });
    const independent = personalMemory.buildPrompt({ items: SAMPLE_MEMORY_ITEMS, difficulty: 5, rng: seeded() });
    expect(supported.choices.length).toBeLessThanOrEqual(independent.choices.length);
    expect(supported.showContext).toBe(true);
    expect(independent.showContext).toBe(false);
  });

  it('orders hints from general to specific', () => {
    const person = SAMPLE_MEMORY_ITEMS.find((i) => i.type === 'person' && i.relationship);
    const hints = personalMemory.buildHintLadder(person, 'person_recognition', 4);
    expect(hints[0].key).toBe('games.personalMemory.hint.familyContext');
    expect(hints[hints.length - 1].key).toBe('games.personalMemory.hint.initial');
  });

  it('asks for more support after consecutive misses', () => {
    const miss = { correct: false, mode: 'person_recognition', itemId: 'a', hintsUsed: 0, responseTimeMs: 1000 };
    expect(personalMemory.shouldIncreaseSupport([miss])).toBe(false);
    expect(personalMemory.shouldIncreaseSupport([miss, miss])).toBe(true);
    expect(personalMemory.shouldIncreaseSupport([miss, { ...miss, correct: true }])).toBe(false);
  });

  it('never reports a raw failure score, only support signals', () => {
    const metrics = personalMemory.buildMetrics({
      difficulty: 3,
      answers: [{ correct: true, mode: 'person_recognition', itemId: 'a', hintsUsed: 1, recalledAfterHint: true, responseTimeMs: 2000 }],
      sessionDurationSec: 60,
      completed: true,
    });
    expect(metrics.meta.recall_after_hint).toBe(1);
    expect(metrics.meta.support_level).toBe(3);
    expect(metrics.game_id).toBe('personal_memory');
  });
});

describe('metric envelope', () => {
  it('is identical in shape across all six games', () => {
    const keys = [
      'game_id',
      'difficulty',
      'accuracy',
      'reaction_time_ms',
      'errors',
      'hints_used',
      'completed',
      'early_exit',
      'session_duration_sec',
      'rounds_completed',
      'timestamp',
      'meta',
    ];
    const payloads = [
      visualSearch.buildMetrics({ difficulty: 2, rounds: [], sessionDurationSec: 10, completed: true }),
      patternCompletion.buildMetrics({ difficulty: 2, rounds: [], sessionDurationSec: 10, completed: true }),
      spatialRecall.buildMetrics({ difficulty: 2, rounds: [], sessionDurationSec: 10, completed: true }),
      attentionTap.buildMetrics({ difficulty: 2, rounds: [], sessionDurationSec: 10, completed: true }),
      association.buildMetrics({ difficulty: 2, answers: [], sessionDurationSec: 10, completed: true }),
      personalMemory.buildMetrics({ difficulty: 2, answers: [], sessionDurationSec: 10, completed: true }),
    ];
    payloads.forEach((payload) => expect(Object.keys(payload).sort()).toEqual(keys.slice().sort()));
  });
});
