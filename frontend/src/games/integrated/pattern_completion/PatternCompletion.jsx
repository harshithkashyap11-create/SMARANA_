/**
 * Game 8 - Pattern Completion
 * Cognitive domain: reasoning / sequencing / executive processing.
 * Pattern construction and validation live in logic.js.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { GameLayout, useTranslation, submitGameMetrics } from '../shared/gameBindings';
import useDifficultyController from '../shared/useDifficultyController';
import { createRng } from '../shared/rng';
import { GAME_ID, getConfig } from './config';
import { generatePattern, checkAnswer, cellSignature, nextHint, summarizeRound, buildMetrics } from './logic';

const MAX_ATTEMPTS = 3;

/** Renders one pattern cell for all three cell kinds. */
function PatternCell({ cell, t, size = 'normal' }) {
  const label = t(cell.labelKey, { defaultValue: cell.labelKey.split('.').pop() });
  if (cell.kind === 'quantity') {
    return (
      <span className={`sm-pattern-cell sm-pattern-cell--${size}`} aria-label={`${cell.count} ${label}`}>
        <span className="sm-pattern-cell__stack" aria-hidden="true">
          {Array.from({ length: cell.count }).map((_, i) => (
            <span key={i}>{cell.emoji}</span>
          ))}
        </span>
      </span>
    );
  }
  if (cell.kind === 'position') {
    return (
      <span className={`sm-pattern-cell sm-pattern-cell--${size}`} aria-label={`${label} ${cell.index + 1}`}>
        <span className="sm-pattern-cell__slots" aria-hidden="true">
          {Array.from({ length: cell.slots }).map((_, i) => (
            <span key={i} className="sm-pattern-slot">
              {i === cell.index ? cell.emoji : '⬜'}
            </span>
          ))}
        </span>
      </span>
    );
  }
  return (
    <span className={`sm-pattern-cell sm-pattern-cell--${size}`} aria-label={label}>
      <span aria-hidden="true">{cell.emoji}</span>
    </span>
  );
}

export default function PatternCompletion({
  initialDifficulty = 2,
  seed,
  onExit,
  onComplete,
  submitMetrics = submitGameMetrics,
}) {
  const { t } = useTranslation();
  const rngRef = useRef(createRng(seed ?? Date.now()));
  const sessionStartRef = useRef(Date.now());
  const roundStartRef = useRef(Date.now());

  const { difficulty, reportPerformance, syncState } = useDifficultyController({
    gameId: GAME_ID,
    initialDifficulty,
    submitMetrics,
  });
  const config = useMemo(() => getConfig(difficulty), [difficulty]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() => generatePattern({ difficulty: initialDifficulty, rng: rngRef.current, roundIndex: 0 }));
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hint, setHint] = useState(null);
  const [eliminated, setEliminated] = useState([]);
  const [status, setStatus] = useState('playing'); // playing | correct | movedOn | summary
  const [results, setResults] = useState([]);

  const totalRounds = useRef(getConfig(initialDifficulty).roundsPerSession).current;
  const correctCount = results.filter((r) => r.correct).length;

  const closeRound = useCallback(
    (wasCorrect, attemptCount) => {
      const summary = summarizeRound({
        round,
        correct: wasCorrect,
        attempts: attemptCount,
        hintsUsed,
        responseTimeMs: Date.now() - roundStartRef.current,
      });
      const nextResults = [...results, summary];
      setResults(nextResults);
      setStatus(wasCorrect ? 'correct' : 'movedOn');

      const isLast = nextResults.length >= totalRounds;
      if (nextResults.length % config.reportEveryRounds === 0 || isLast) {
        reportPerformance(
          buildMetrics({
            difficulty,
            rounds: nextResults,
            sessionDurationSec: (Date.now() - sessionStartRef.current) / 1000,
            completed: isLast,
          })
        );
      }
    },
    [round, hintsUsed, results, totalRounds, config.reportEveryRounds, reportPerformance, difficulty]
  );

  const handleChoice = useCallback(
    (choice) => {
      if (status !== 'playing') return;
      const attemptCount = attempts + 1;
      setAttempts(attemptCount);
      if (checkAnswer(round, choice)) {
        closeRound(true, attemptCount);
        return;
      }
      setEliminated((prev) => [...prev, cellSignature(choice)]);
      if (attemptCount >= MAX_ATTEMPTS) closeRound(false, attemptCount);
    },
    [status, attempts, round, closeRound]
  );

  const handleHint = useCallback(() => {
    if (hintsUsed >= config.hintsAllowed || status !== 'playing') return;
    const next = nextHint(round, hintsUsed);
    setHintsUsed(hintsUsed + 1);
    setHint(next);
    if (next.type === 'eliminate' && next.choiceId) setEliminated((prev) => [...prev, next.choiceId]);
  }, [hintsUsed, config.hintsAllowed, status, round]);

  const goNext = useCallback(() => {
    if (results.length >= totalRounds) {
      setStatus('summary');
      if (onComplete) {
        onComplete(
          buildMetrics({
            difficulty,
            rounds: results,
            sessionDurationSec: (Date.now() - sessionStartRef.current) / 1000,
            completed: true,
          })
        );
      }
      return;
    }
    const index = roundIndex + 1;
    setRound(generatePattern({ difficulty, rng: rngRef.current, roundIndex: index }));
    setRoundIndex(index);
    setAttempts(0);
    setHintsUsed(0);
    setHint(null);
    setEliminated([]);
    setStatus('playing');
    roundStartRef.current = Date.now();
  }, [results, totalRounds, roundIndex, difficulty, onComplete]);

  const handleExit = useCallback(() => {
    const payload = buildMetrics({
      difficulty,
      rounds: results,
      sessionDurationSec: (Date.now() - sessionStartRef.current) / 1000,
      completed: false,
      earlyExit: true,
    });
    reportPerformance(payload);
    if (onExit) onExit(payload);
  }, [difficulty, results, reportPerformance, onExit]);

  return (
    <GameLayout
      title={t('games.patternCompletion.name')}
      instructions={t('games.patternCompletion.instructions')}
      difficulty={difficulty}
      progress={{ current: Math.min(roundIndex + 1, totalRounds), total: totalRounds }}
      score={{ correct: correctCount, total: results.length }}
      status={syncState}
      onExit={handleExit}
      footer={
        status === 'playing' && config.hintsAllowed > 0 ? (
          <button type="button" className="sm-btn sm-btn--quiet" onClick={handleHint} disabled={hintsUsed >= config.hintsAllowed}>
            {t('games.common.showHint')}
          </button>
        ) : null
      }
    >
      {status !== 'summary' && (
        <div className="sm-panel">
          <p className="sm-prompt">{t('games.patternCompletion.prompt')}</p>

          <div className={`sm-pattern-strip ${round.category === 'quantity' ? 'sm-pattern-strip--stacked' : ''}`} role="list">
            {round.sequence.map((cell, i) => (
              <span className="sm-pattern-item" role="listitem" key={`${cell.id}-${i}`}>
                <PatternCell cell={cell} t={t} />
              </span>
            ))}
            <span className="sm-pattern-item sm-pattern-item--blank" role="listitem" aria-label={t('games.patternCompletion.missingPiece')}>
              <span aria-hidden="true">?</span>
            </span>
          </div>

          {(round.showRuleSupport || (hint && hint.type === 'rule')) && (
            <p className="sm-hint-text" role="note">
              {t(round.ruleKey)}
            </p>
          )}
          {hint && hint.type !== 'rule' && (
            <p className="sm-hint-text" role="note">
              {t(hint.key)}
            </p>
          )}

          <div className="sm-choices" role="group" aria-label={t('games.patternCompletion.choicesLabel')}>
            {round.choices.map((choice) => {
              const sig = cellSignature(choice);
              const isEliminated = eliminated.includes(sig);
              const isAnswer = status !== 'playing' && checkAnswer(round, choice);
              const classes = ['sm-choice'];
              if (isEliminated) classes.push('sm-choice--eliminated');
              if (isAnswer) classes.push('sm-choice--correct');
              return (
                <button
                  key={sig}
                  type="button"
                  className={classes.join(' ')}
                  onClick={() => handleChoice(choice)}
                  disabled={isEliminated || status !== 'playing'}
                >
                  <PatternCell cell={choice} t={t} size="large" />
                </button>
              );
            })}
          </div>

          {status !== 'playing' && (
            <div className="sm-panel sm-panel--centered">
              <p className="sm-feedback__text" role="status" aria-live="polite">
                {status === 'correct' ? t('games.common.thatsRight') : t('games.patternCompletion.hereIsTheAnswer')}
              </p>
              <button type="button" className="sm-btn sm-btn--primary" disabled={syncState === 'sending'} onClick={goNext} autoFocus>
                {results.length >= totalRounds ? t('games.common.seeSummary') : t('games.common.next')}
              </button>
            </div>
          )}
        </div>
      )}

      {status === 'summary' && (
        <div className="sm-panel sm-panel--centered">
          <h2 className="sm-summary__title">{t('games.common.sessionFinished')}</h2>
          <p className="sm-summary__line">{t('games.common.roundsCorrect', { correct: correctCount, total: results.length })}</p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={() => onExit && onExit(null)} autoFocus>
            {t('games.common.done')}
          </button>
        </div>
      )}
    </GameLayout>
  );
}
