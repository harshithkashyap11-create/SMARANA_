/**
 * Game 11 - Association Game
 * Cognitive domain: associative / semantic memory.
 *
 * Learning phase (pairs shown one at a time) -> short pause -> question rounds
 * in either recognition or cued-recall mode. Pair selection, choice generation
 * and scoring live in logic.js.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameLayout, useTranslation, submitGameMetrics } from '../shared/gameBindings';
import useDifficultyController from '../shared/useDifficultyController';
import { createRng } from '../shared/rng';
import { GAME_ID, MODES, getConfig } from './config';
import { buildSession, recordAnswer, validateAnswer, buildMetrics } from './logic';

const PHASE = { INTRO: 'intro', LEARN: 'learn', PAUSE: 'pause', QUESTION: 'question', FEEDBACK: 'feedback', SUMMARY: 'summary' };

export default function AssociationGame({
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

  const [session, setSession] = useState(() => buildSession({ difficulty: initialDifficulty, rng: rngRef.current }));
  const [phase, setPhase] = useState(PHASE.INTRO);
  const [learnIndex, setLearnIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [choicesRevealed, setChoicesRevealed] = useState(false);
  const [lastAnswer, setLastAnswer] = useState(null);

  const label = useCallback(
    (item) => t(item.labelKey, { defaultValue: item.labelKey.split('.').pop() }),
    [t]
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const currentQuestion = session.rounds[questionIndex];

  const startQuestion = useCallback(
    (index) => {
      const question = session.rounds[index];
      setQuestionIndex(index);
      setHintShown(false);
      setChoicesRevealed(!question || question.mode === MODES.RECOGNITION);
      questionStartRef.current = Date.now();
      setPhase(PHASE.QUESTION);
    },
    [session.rounds]
  );

  const advanceLearning = useCallback(() => {
    clearTimers();
    if (learnIndex + 1 < session.pairs.length) {
      setLearnIndex(learnIndex + 1);
      return;
    }
    setPhase(PHASE.PAUSE);
    timersRef.current.push(setTimeout(() => startQuestion(0), session.recallDelayMs));
  }, [clearTimers, learnIndex, session.pairs.length, session.recallDelayMs, startQuestion]);

  // Auto-advance the learning phase, but the patient can always tap Next sooner.
  useEffect(() => {
    if (phase !== PHASE.LEARN) return undefined;
    const timer = setTimeout(advanceLearning, session.learnMsPerPair);
    timersRef.current.push(timer);
    return () => clearTimeout(timer);
  }, [phase, learnIndex, session.learnMsPerPair, advanceLearning]);

  const finishIfDone = useCallback(
    (allAnswers) => {
      const isLast = allAnswers.length >= session.rounds.length;
      if (allAnswers.length % config.reportEveryRounds === 0 || isLast) {
        reportPerformance(
          buildMetrics({
            difficulty,
            answers: allAnswers,
            sessionDurationSec: (Date.now() - sessionStartRef.current) / 1000,
            completed: isLast,
          })
        );
      }
    },
    [session.rounds.length, config.reportEveryRounds, reportPerformance, difficulty]
  );

  const handleChoice = useCallback(
    (choice) => {
      if (phase !== PHASE.QUESTION || !currentQuestion) return;
      const answer = recordAnswer({
        round: currentQuestion,
        choice,
        responseTimeMs: Date.now() - questionStartRef.current,
        hintsUsed: hintShown ? 1 : 0,
      });
      const allAnswers = [...answers, answer];
      setAnswers(allAnswers);
      setLastAnswer(answer);
      setPhase(PHASE.FEEDBACK);
      finishIfDone(allAnswers);
    },
    [phase, currentQuestion, hintShown, answers, finishIfDone]
  );

  const goNext = useCallback(() => {
    if (questionIndex + 1 < session.rounds.length) {
      startQuestion(questionIndex + 1);
      return;
    }
    setPhase(PHASE.SUMMARY);
    if (onComplete) {
      onComplete(
        buildMetrics({
          difficulty,
          answers,
          sessionDurationSec: (Date.now() - sessionStartRef.current) / 1000,
          completed: true,
        })
      );
    }
  }, [questionIndex, session.rounds.length, startQuestion, onComplete, difficulty, answers]);

  const startAgainAtNewDifficulty = useCallback(() => {
    clearTimers();
    setSession(buildSession({ difficulty, rng: rngRef.current }));
    setLearnIndex(0);
    setQuestionIndex(0);
    setAnswers([]);
    setHintsUsed(0);
    setPhase(PHASE.INTRO);
  }, [clearTimers, difficulty]);

  const handleHint = useCallback(() => {
    if (hintsUsed >= config.hintsAllowed || hintShown) return;
    setHintsUsed(hintsUsed + 1);
    setHintShown(true);
    setChoicesRevealed(true);
  }, [hintsUsed, config.hintsAllowed, hintShown]);

  const handleExit = useCallback(() => {
    clearTimers();
    const payload = buildMetrics({
      difficulty,
      answers,
      sessionDurationSec: (Date.now() - sessionStartRef.current) / 1000,
      completed: false,
      earlyExit: true,
    });
    reportPerformance(payload);
    if (onExit) onExit(payload);
  }, [clearTimers, difficulty, answers, reportPerformance, onExit]);

  const correctCount = answers.filter((a) => a.correct).length;
  const learnPair = session.pairs[learnIndex];

  return (
    <GameLayout
      title={t('games.associationGame.name')}
      instructions={t('games.associationGame.instructions')}
      difficulty={difficulty}
      progress={{ current: Math.min(questionIndex + 1, session.rounds.length), total: session.rounds.length }}
      score={{ correct: correctCount, total: answers.length }}
      status={syncState}
      onExit={handleExit}
      footer={
        phase === PHASE.QUESTION && config.hintsAllowed > 0 ? (
          <button type="button" className="sm-btn sm-btn--quiet" onClick={handleHint} disabled={hintShown || hintsUsed >= config.hintsAllowed}>
            {t('games.common.showHint')}
          </button>
        ) : null
      }
    >
      {phase === PHASE.INTRO && (
        <div className="sm-panel sm-panel--centered">
          <p className="sm-prompt">{t('games.associationGame.introPrompt', { count: session.pairs.length })}</p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={() => setPhase(PHASE.LEARN)} autoFocus>
            {t('games.common.imReady')}
          </button>
        </div>
      )}

      {phase === PHASE.LEARN && learnPair && (
        <div className="sm-panel sm-panel--centered">
          <p className="sm-prompt">{t('games.associationGame.learnPrompt')}</p>
          <div className="sm-pair" role="group" aria-label={`${label(learnPair.cue)} - ${label(learnPair.answer)}`}>
            <span className="sm-pair__side">
              <span className="sm-pair__emoji" aria-hidden="true">{learnPair.cue.emoji}</span>
              <span className="sm-pair__label">{label(learnPair.cue)}</span>
            </span>
            <span className="sm-pair__link" aria-hidden="true">→</span>
            <span className="sm-pair__side">
              <span className="sm-pair__emoji" aria-hidden="true">{learnPair.answer.emoji}</span>
              <span className="sm-pair__label">{label(learnPair.answer)}</span>
            </span>
          </div>
          <p className="sm-hint-text">{t('games.associationGame.learnProgress', { current: learnIndex + 1, total: session.pairs.length })}</p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={advanceLearning}>
            {t('games.common.next')}
          </button>
        </div>
      )}

      {phase === PHASE.PAUSE && (
        <div className="sm-panel sm-panel--centered">
          <p className="sm-prompt" aria-live="polite">{t('games.associationGame.pausePrompt')}</p>
        </div>
      )}

      {(phase === PHASE.QUESTION || phase === PHASE.FEEDBACK) && currentQuestion && (
        <div className="sm-panel">
          <p className="sm-prompt">{t('games.associationGame.questionPrompt', { item: label(currentQuestion.cue) })}</p>
          <div className="sm-pair sm-pair--question">
            <span className="sm-pair__side">
              <span className="sm-pair__emoji" aria-hidden="true">{currentQuestion.cue.emoji}</span>
              <span className="sm-pair__label">{label(currentQuestion.cue)}</span>
            </span>
            <span className="sm-pair__link" aria-hidden="true">→</span>
            <span className="sm-pair__side sm-pair__side--unknown" aria-hidden="true">?</span>
          </div>

          {hintShown && (
            <p className="sm-hint-text" role="note">
              {t(currentQuestion.hint.key, { letter: label(currentQuestion.answer).charAt(0) })}
            </p>
          )}

          {!choicesRevealed ? (
            <div className="sm-panel sm-panel--centered">
              <p className="sm-hint-text">{t('games.associationGame.thinkFirst')}</p>
              <button type="button" className="sm-btn sm-btn--primary" onClick={() => setChoicesRevealed(true)} autoFocus>
                {t('games.associationGame.showChoices')}
              </button>
            </div>
          ) : (
            <div className="sm-choices" role="group" aria-label={t('games.associationGame.choicesLabel')}>
              {currentQuestion.choices.map((choice) => {
                const isCorrect = validateAnswer(currentQuestion, choice);
                const classes = ['sm-choice'];
                if (phase === PHASE.FEEDBACK) {
                  if (isCorrect) classes.push('sm-choice--correct');
                  else if (lastAnswer && lastAnswer.chosenPairId === choice.pairId) classes.push('sm-choice--wrong');
                }
                return (
                  <button
                    key={choice.pairId}
                    type="button"
                    className={classes.join(' ')}
                    onClick={() => handleChoice(choice)}
                    disabled={phase === PHASE.FEEDBACK}
                  >
                    <span className="sm-choice__emoji" aria-hidden="true">{choice.emoji}</span>
                    <span className="sm-choice__label">{label(choice)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {phase === PHASE.FEEDBACK && (
            <div className="sm-panel sm-panel--centered">
              <p className="sm-feedback__text" role="status" aria-live="polite">
                {lastAnswer && lastAnswer.correct
                  ? t('games.common.thatsRight')
                  : t('games.associationGame.theAnswerWas', { item: label(currentQuestion.answer) })}
              </p>
              <button type="button" className="sm-btn sm-btn--primary" disabled={syncState === 'sending'} onClick={goNext} autoFocus>
                {questionIndex + 1 < session.rounds.length ? t('games.common.next') : t('games.common.seeSummary')}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === PHASE.SUMMARY && (
        <div className="sm-panel sm-panel--centered">
          <h2 className="sm-summary__title">{t('games.common.sessionFinished')}</h2>
          <p className="sm-summary__line">{t('games.common.roundsCorrect', { correct: correctCount, total: answers.length })}</p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={startAgainAtNewDifficulty}>
            {t('games.common.playAgain')}
          </button>
          <button type="button" className="sm-btn sm-btn--quiet" onClick={() => onExit && onExit(null)}>
            {t('games.common.done')}
          </button>
        </div>
      )}
    </GameLayout>
  );
}
