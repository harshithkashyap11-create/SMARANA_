/**
 * Game 7 - Visual Search
 * Cognitive domain: selective attention / visual scanning / processing speed.
 *
 * All round generation, scoring and metric shaping lives in logic.js.
 * This component only renders phases and collects taps.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameLayout, useTranslation, submitGameMetrics } from '../shared/gameBindings';
import useDifficultyController from '../shared/useDifficultyController';
import { createRng } from '../shared/rng';
import { GAME_ID, getConfig } from './config';
import { generateRound, createRoundState, registerTap, applyHint, summarizeRound, buildMetrics } from './logic';

const PHASE = { TARGET: 'target', SEARCH: 'search', FEEDBACK: 'feedback', SUMMARY: 'summary' };

export default function VisualSearch({
  initialDifficulty = 2,
  seed,
  onExit,
  onComplete,
  submitMetrics = submitGameMetrics,
}) {
  const { t } = useTranslation();
  const rngRef = useRef(createRng(seed ?? Date.now()));
  const sessionStartRef = useRef(Date.now());
  const roundStartRef = useRef(0);
  const timeoutRef = useRef(null);
  const hintTimerRef = useRef(null);

  const { difficulty, reportPerformance, syncState } = useDifficultyController({
    gameId: GAME_ID,
    initialDifficulty,
    submitMetrics,
  });

  const config = useMemo(() => getConfig(difficulty), [difficulty]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() => generateRound({ difficulty: initialDifficulty, rng: rngRef.current, roundIndex: 0 }));
  const [roundState, setRoundState] = useState(() => createRoundState(round));
  const roundStateRef = useRef(roundState);
  roundStateRef.current = roundState;
  const [phase, setPhase] = useState(PHASE.TARGET);
  const [results, setResults] = useState([]);
  const [hintKey, setHintKey] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const totalRounds = useRef(getConfig(initialDifficulty).roundsPerSession).current;

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  useEffect(() => () => { clearTimer(); clearTimeout(hintTimerRef.current); }, []);

  const finishRound = useCallback(
    (state, { timedOut = false } = {}) => {
      clearTimer();
      const summary = summarizeRound(state, { timedOut });
      const nextResults = [...results, summary];
      setResults(nextResults);
      setFeedback(timedOut ? 'timeout' : summary.misses === 0 && summary.falsePositives === 0 ? 'perfect' : 'partial');
      setPhase(PHASE.FEEDBACK);

      const isLast = nextResults.length >= totalRounds;
      const shouldReport = nextResults.length % config.reportEveryRounds === 0 || isLast;
      if (shouldReport) {
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
    [results, totalRounds, config.reportEveryRounds, reportPerformance, difficulty]
  );

  const handleTap = useCallback(
    (cellKey) => {
      if (phase !== PHASE.SEARCH) return;
      const elapsed = Date.now() - roundStartRef.current;
      const next = registerTap(roundState, round, cellKey, elapsed);
      if (next === roundState) return;
      setRoundState(next);
      setHintKey(null);
      if (next.resolved) finishRound(next);
    },
    [phase, roundState, round, finishRound]
  );

  const startSearch = useCallback(() => {
    roundStartRef.current = Date.now();
    setPhase(PHASE.SEARCH);
    if (round.responseWindowMs) {
      clearTimer();
      timeoutRef.current = setTimeout(() => {
        finishRound(roundStateRef.current, { timedOut: true });
      }, round.responseWindowMs);
    }
  }, [round, finishRound]);

  const nextRound = useCallback(() => {
    if (results.length >= totalRounds) {
      setPhase(PHASE.SUMMARY);
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
    const generated = generateRound({ difficulty, rng: rngRef.current, roundIndex: index });
    setRoundIndex(index);
    setRound(generated);
    setRoundState(createRoundState(generated));
    setHintKey(null);
    setFeedback(null);
    setPhase(PHASE.TARGET);
  }, [results, totalRounds, roundIndex, difficulty, onComplete]);

  const showHint = useCallback(() => {
    if (roundState.hintsUsed >= config.hintsAllowed) return;
    const remaining = round.cells.find((c) => c.isTarget && !roundState.tapped.includes(c.key));
    if (!remaining) return;
    setHintKey(remaining.key);
    setRoundState(applyHint(roundState));
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintKey(null), 2500);
  }, [roundState, config.hintsAllowed, round]);

  const handleExit = useCallback(() => {
    clearTimer();
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

  const correctRounds = results.filter((r) => r.misses === 0 && r.falsePositives === 0).length;
  const targetName = t(round.target.labelKey, { defaultValue: round.target.labelKey.split('.').pop() });

  return (
    <GameLayout
      title={t('games.visualSearch.name')}
      instructions={t('games.visualSearch.instructions')}
      difficulty={difficulty}
      progress={{ current: Math.min(roundIndex + 1, totalRounds), total: totalRounds }}
      score={{ correct: correctRounds, total: results.length }}
      status={syncState}
      onExit={handleExit}
      footer={
        phase === PHASE.SEARCH && config.hintsAllowed > 0 ? (
          <button
            type="button"
            className="sm-btn sm-btn--quiet"
            onClick={showHint}
            disabled={roundState.hintsUsed >= config.hintsAllowed}
          >
            {t('games.common.showHint')}
          </button>
        ) : null
      }
    >
      {phase === PHASE.TARGET && (
        <div className="sm-panel sm-panel--centered">
          <p className="sm-prompt">{t('games.visualSearch.findThis', { item: targetName })}</p>
          <div className="sm-target" aria-label={targetName} role="img">
            {round.target.emoji}
          </div>
          <button type="button" className="sm-btn sm-btn--primary" onClick={startSearch} autoFocus>
            {t('games.common.imReady')}
          </button>
        </div>
      )}

      {phase === PHASE.SEARCH && (
        <div className="sm-panel">
          <p className="sm-prompt" aria-live="polite">
            {round.targetCount > 1
              ? t('games.visualSearch.findManyPrompt', { item: targetName, count: round.targetCount })
              : t('games.visualSearch.findPrompt', { item: targetName })}
            <span className="sm-prompt__icon" role="img" aria-hidden="true">
              {round.target.emoji}
            </span>
          </p>
          <div
            className="sm-grid"
            role="group"
            aria-label={t('games.visualSearch.gridLabel')}
            style={{ gridTemplateColumns: `repeat(${round.cols}, minmax(0, 1fr))` }}
          >
            {round.cells.map((cell) => {
              const tapped = roundState.tapped.includes(cell.key);
              const classes = ['sm-cell'];
              if (tapped) classes.push(cell.isTarget ? 'sm-cell--correct' : 'sm-cell--wrong');
              if (hintKey === cell.key) classes.push('sm-cell--hint');
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={classes.join(' ')}
                  onClick={() => handleTap(cell.key)}
                  disabled={tapped}
                  aria-label={t(cell.labelKey, { defaultValue: cell.labelKey.split('.').pop() })}
                  aria-pressed={tapped}
                >
                  <span aria-hidden="true">{cell.emoji}</span>
                </button>
              );
            })}
          </div>
          {round.targetCount > 1 && (
            <p className="sm-hint-text">
              {t('games.visualSearch.foundSoFar', { found: roundState.hits, total: round.targetCount })}
            </p>
          )}
        </div>
      )}

      {phase === PHASE.FEEDBACK && (
        <div className="sm-panel sm-panel--centered">
          <div className="sm-feedback" role="status" aria-live="polite">
            <span className="sm-feedback__icon" role="img" aria-hidden="true">
              {feedback === 'perfect' ? '🌿' : '🌤️'}
            </span>
            <p className="sm-feedback__text">
              {feedback === 'perfect'
                ? t('games.common.wellDone')
                : feedback === 'timeout'
                ? t('games.common.letsTryNext')
                : t('games.common.goodEffort')}
            </p>
          </div>
          <button type="button" className="sm-btn sm-btn--primary" disabled={syncState === 'sending'} onClick={nextRound} autoFocus>
            {results.length >= totalRounds ? t('games.common.seeSummary') : t('games.common.next')}
          </button>
        </div>
      )}

      {phase === PHASE.SUMMARY && (
        <div className="sm-panel sm-panel--centered">
          <h2 className="sm-summary__title">{t('games.common.sessionFinished')}</h2>
          <p className="sm-summary__line">
            {t('games.common.roundsCorrect', { correct: correctRounds, total: results.length })}
          </p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={() => onExit && onExit(null)} autoFocus>
            {t('games.common.done')}
          </button>
        </div>
      )}
    </GameLayout>
  );
}
