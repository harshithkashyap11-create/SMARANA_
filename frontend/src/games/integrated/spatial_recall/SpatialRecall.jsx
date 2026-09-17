/**
 * Game 9 - Spatial Recall
 * Cognitive domain: visuospatial working memory / location recall.
 *
 * Phases: observe -> short pause -> recall (one question per recall target).
 * Placement, distance and scoring live in logic.js.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameLayout, useTranslation, submitGameMetrics } from '../shared/gameBindings';
import useDifficultyController from '../shared/useDifficultyController';
import { createRng } from '../shared/rng';
import { GAME_ID, getConfig } from './config';
import { generateRound, validateLocation, locationHint, cellCoords, summarizeRound, buildMetrics } from './logic';

const PHASE = { READY: 'ready', OBSERVE: 'observe', PAUSE: 'pause', RECALL: 'recall', FEEDBACK: 'feedback', SUMMARY: 'summary' };

export default function SpatialRecall({
  initialDifficulty = 2,
  seed,
  onExit,
  onComplete,
  submitMetrics = submitGameMetrics,
}) {
  const { t } = useTranslation();
  const rngRef = useRef(createRng(seed ?? Date.now()));
  const sessionStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const timersRef = useRef([]);

  const { difficulty, reportPerformance, syncState } = useDifficultyController({
    gameId: GAME_ID,
    initialDifficulty,
    submitMetrics,
  });
  const config = useMemo(() => getConfig(difficulty), [difficulty]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() => generateRound({ difficulty: initialDifficulty, rng: rngRef.current, roundIndex: 0 }));
  const [phase, setPhase] = useState(PHASE.READY);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintRow, setHintRow] = useState(null);
  const [lastAnswer, setLastAnswer] = useState(null);
  const [results, setResults] = useState([]);

  const totalRounds = useRef(getConfig(initialDifficulty).roundsPerSession).current;
  const currentTarget = round.recallQueue[questionIndex];

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  useEffect(() => clearTimers, []);

  const beginRecall = useCallback(() => {
    clearTimers();
    setPhase(PHASE.PAUSE);
    timersRef.current.push(
      setTimeout(() => {
        questionStartRef.current = Date.now();
        setPhase(PHASE.RECALL);
      }, round.recallDelayMs)
    );
  }, [round.recallDelayMs]);

  const startObservation = useCallback(() => {
    clearTimers();
    setPhase(PHASE.OBSERVE);
    timersRef.current.push(setTimeout(beginRecall, round.observationMs));
  }, [round.observationMs, beginRecall]);

  const finishRound = useCallback(
    (allAnswers) => {
      const summary = summarizeRound({ round, answers: allAnswers, hintsUsed });
      const nextResults = [...results, summary];
      setResults(nextResults);
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

  const handleCellSelect = useCallback(
    (cell) => {
      if (phase !== PHASE.RECALL || !currentTarget) return;
      const result = validateLocation(round, currentTarget, cell);
      const answer = {
        objectId: currentTarget.id,
        selectedCell: cell,
        correctCell: currentTarget.cell,
        ...result,
        responseTimeMs: Date.now() - questionStartRef.current,
      };
      const allAnswers = [...answers, answer];
      setAnswers(allAnswers);
      setLastAnswer(answer);
      setHintRow(null);
      setPhase(PHASE.FEEDBACK);
      if (allAnswers.length >= round.recallQueue.length) finishRound(allAnswers);
    },
    [phase, currentTarget, round, answers, finishRound]
  );

  const continueAfterFeedback = useCallback(() => {
    if (answers.length < round.recallQueue.length) {
      setQuestionIndex(questionIndex + 1);
      questionStartRef.current = Date.now();
      setPhase(PHASE.RECALL);
      return;
    }
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
    setRound(generateRound({ difficulty, rng: rngRef.current, roundIndex: index }));
    setRoundIndex(index);
    setQuestionIndex(0);
    setAnswers([]);
    setHintsUsed(0);
    setLastAnswer(null);
    setPhase(PHASE.READY);
  }, [answers.length, round.recallQueue.length, questionIndex, results, totalRounds, roundIndex, difficulty, onComplete]);

  const handleHint = useCallback(() => {
    if (phase !== PHASE.RECALL || hintsUsed >= config.hintsAllowed || !currentTarget) return;
    setHintsUsed(hintsUsed + 1);
    setHintRow(locationHint(round, currentTarget).row);
  }, [phase, hintsUsed, config.hintsAllowed, currentTarget, round]);

  const handleExit = useCallback(() => {
    clearTimers();
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

  const objectAt = (cell) => round.placements.find((p) => p.cell === cell);
  const showObjects = phase === PHASE.OBSERVE;
  const correctRounds = results.reduce((a, r) => a + r.correct, 0);
  const askedTotal = results.reduce((a, r) => a + r.asked, 0);
  const targetName = currentTarget
    ? t(currentTarget.labelKey, { defaultValue: currentTarget.labelKey.split('.').pop() })
    : '';

  return (
    <GameLayout
      title={t('games.spatialRecall.name')}
      instructions={t('games.spatialRecall.instructions')}
      difficulty={difficulty}
      progress={{ current: Math.min(roundIndex + 1, totalRounds), total: totalRounds }}
      score={{ correct: correctRounds, total: askedTotal }}
      status={syncState}
      onExit={handleExit}
      footer={
        phase === PHASE.RECALL && config.hintsAllowed > 0 ? (
          <button type="button" className="sm-btn sm-btn--quiet" onClick={handleHint} disabled={hintsUsed >= config.hintsAllowed}>
            {t('games.common.showHint')}
          </button>
        ) : phase === PHASE.OBSERVE ? (
          <button type="button" className="sm-btn sm-btn--quiet" onClick={beginRecall}>
            {t('games.spatialRecall.iveLooked')}
          </button>
        ) : null
      }
    >
      {phase === PHASE.SUMMARY ? (
        <div className="sm-panel sm-panel--centered">
          <h2 className="sm-summary__title">{t('games.common.sessionFinished')}</h2>
          <p className="sm-summary__line">{t('games.common.roundsCorrect', { correct: correctRounds, total: askedTotal })}</p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={() => onExit && onExit(null)} autoFocus>
            {t('games.common.done')}
          </button>
        </div>
      ) : (
        <div className="sm-panel">
          <p className="sm-prompt" aria-live="polite">
            {phase === PHASE.READY && t('games.spatialRecall.readyPrompt')}
            {phase === PHASE.OBSERVE && t('games.spatialRecall.observePrompt')}
            {phase === PHASE.PAUSE && t('games.spatialRecall.pausePrompt')}
            {phase === PHASE.RECALL && t('games.spatialRecall.wherePrompt', { item: targetName })}
            {phase === PHASE.FEEDBACK &&
              (lastAnswer && lastAnswer.correct ? t('games.common.thatsRight') : t('games.spatialRecall.itWasHere'))}
            {phase === PHASE.RECALL && currentTarget && (
              <span className="sm-prompt__icon" role="img" aria-hidden="true">
                {currentTarget.emoji}
              </span>
            )}
          </p>

          <div
            className="sm-grid"
            role="group"
            aria-label={t('games.spatialRecall.gridLabel')}
            style={{ gridTemplateColumns: `repeat(${round.cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: round.rows * round.cols }, (_, cell) => {
              const placed = objectAt(cell);
              const { row } = cellCoords(cell, round.cols);
              const classes = ['sm-cell'];
              const interactive = phase === PHASE.RECALL;
              if (hintRow === row && interactive) classes.push('sm-cell--hint');
              if (phase === PHASE.FEEDBACK && lastAnswer) {
                if (cell === lastAnswer.correctCell) classes.push('sm-cell--correct');
                else if (cell === lastAnswer.selectedCell) classes.push('sm-cell--wrong');
              }
              const label = placed && showObjects
                ? t(placed.labelKey, { defaultValue: placed.labelKey.split('.').pop() })
                : t('games.spatialRecall.cellLabel', { row: row + 1, column: (cell % round.cols) + 1 });
              return (
                <button
                  key={cell}
                  type="button"
                  className={classes.join(' ')}
                  onClick={() => handleCellSelect(cell)}
                  disabled={!interactive}
                  aria-label={label}
                >
                  <span aria-hidden="true">
                    {showObjects && placed ? placed.emoji : ''}
                    {phase === PHASE.FEEDBACK && lastAnswer && cell === lastAnswer.correctCell
                      ? round.placements.find((p) => p.cell === cell).emoji
                      : ''}
                  </span>
                </button>
              );
            })}
          </div>

          {phase === PHASE.READY && (
            <button type="button" className="sm-btn sm-btn--primary" onClick={startObservation} autoFocus>
              {t('games.common.imReady')}
            </button>
          )}
          {phase === PHASE.FEEDBACK && (
            <button type="button" className="sm-btn sm-btn--primary" onClick={continueAfterFeedback} autoFocus>
              {results.length >= totalRounds && answers.length >= round.recallQueue.length
                ? t('games.common.seeSummary')
                : t('games.common.next')}
            </button>
          )}
        </div>
      )}
    </GameLayout>
  );
}
