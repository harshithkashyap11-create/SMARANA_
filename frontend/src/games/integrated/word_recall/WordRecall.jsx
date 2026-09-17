import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameLayout from '../shared/GameLayout.jsx';
import ScorePanel from '../shared/ScorePanel.jsx';
import FeedbackBanner from '../shared/FeedbackBanner.jsx';
import SessionSummary from '../shared/SessionSummary.jsx';
import { PhaseProgress, usePhaseTimer } from '../shared/GameTimer.jsx';
import { useTranslate } from '../shared/i18n.js';
import { useGameSession } from '../shared/useGameSession.js';
import { FEEDBACK_TONE, GAME_PHASE } from '../shared/gameTypes.js';
import wordRecallConfig, { GAME_ID, RECALL_MODES, getLevel } from './config.js';
import {
  evaluateMultiSelect,
  evaluateRecognition,
  generateRound,
  nextUnselectedTarget,
} from './logic.js';

/**
 * Voice readiness: the component accepts an optional `speak(text)` callback and
 * calls it as each word is presented. Passing nothing keeps the game silent and
 * requires no microphone or speech permission, which is the first release.
 * When STT lands, a third mode (RECALL_MODES.FREE) plugs into the same round
 * object and the same evaluation functions.
 */
export default function WordRecall({
  difficulty = 1,
  roundsPerSession = wordRecallConfig.roundsPerSession,
  ddaClient,
  onExit,
  onSessionEnd,
  speak,
  rng,
}) {
  const t = useTranslate();
  const session = useGameSession({
    gameId: GAME_ID,
    initialDifficulty: difficulty,
    roundsPerSession,
    hintsPerRound: (level) => getLevel(level).hintsPerRound,
    ddaClient,
    onSessionEnd,
  });

  const [phase, setPhase] = useState(GAME_PHASE.READY);
  const [round, setRound] = useState(null);
  const [presentIndex, setPresentIndex] = useState(0);
  const [trialIndex, setTrialIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [hintId, setHintId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const responseStartRef = useRef(0);

  const startRound = useCallback(() => {
    setRound(generateRound(session.difficulty, rng));
    setPresentIndex(0);
    setTrialIndex(0);
    setAnswers([]);
    setSelectedIds([]);
    setHintId(null);
    setFeedback(null);
    setPhase(GAME_PHASE.PRESENTING);
  }, [rng, session.difficulty]);

  // Present the words one at a time so each one gets its own encoding window.
  useEffect(() => {
    if (phase !== GAME_PHASE.PRESENTING || !round) return undefined;

    if (presentIndex >= round.targets.length) {
      setPhase(GAME_PHASE.DELAY);
      return undefined;
    }

    const word = round.targets[presentIndex];
    speak?.(t(word.labelKey));
    const id = setTimeout(
      () => setPresentIndex((index) => index + 1),
      round.level.presentationMs,
    );
    return () => clearTimeout(id);
  }, [phase, presentIndex, round, speak, t]);

  usePhaseTimer({
    durationMs: round?.level.recallDelayMs,
    active: phase === GAME_PHASE.DELAY,
    resetKey: session.roundNumber,
    onComplete: () => setPhase(GAME_PHASE.RESPONDING),
  });

  useEffect(() => {
    if (phase === GAME_PHASE.RESPONDING) responseStartRef.current = Date.now();
  }, [phase]);

  const finishRound = useCallback(async (result) => {
    const reactionTimeMs = Date.now() - responseStartRef.current;
    setPhase(GAME_PHASE.FEEDBACK);

    if (result.isPerfect) {
      setFeedback({
        tone: FEEDBACK_TONE.SUCCESS,
        icon: '✓',
        message: t('games.wordRecall.correct'),
      });
    } else {
      setFeedback({
        tone: FEEDBACK_TONE.GENTLE,
        message: t('games.wordRecall.partial', {
          correct: result.correct,
          total: result.total,
        }),
      });
    }

    await session.completeRound({
      correct: result.correct,
      total: result.total,
      errors: result.errors,
      accuracy: result.accuracy,
      reactionTimeMs,
      extra: {
        mode: round.mode,
        words_remembered: result.correct,
        incorrect_selections: result.incorrect,
        omissions: result.omissions,
        intrusions: result.intrusions,
        word_count: round.targets.length,
        recall_delay_ms: round.level.recallDelayMs,
      },
    });
  }, [round, session, t]);

  const handleRecognitionAnswer = useCallback((choiceId) => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    const trial = round.trials[trialIndex];
    const nextAnswers = [...answers, { targetId: trial.targetId, answerId: choiceId }];
    setAnswers(nextAnswers);
    setHintId(null);

    if (nextAnswers.length >= round.trials.length) {
      finishRound(evaluateRecognition(nextAnswers));
      return;
    }
    setTrialIndex((index) => index + 1);
  }, [answers, finishRound, phase, round, trialIndex]);

  const toggleSelection = useCallback((wordId) => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    setHintId(null);
    setSelectedIds((current) => (
      current.includes(wordId)
        ? current.filter((id) => id !== wordId)
        : [...current, wordId]
    ));
  }, [phase]);

  const handleConfirm = useCallback(() => {
    finishRound(evaluateMultiSelect(selectedIds, round.targetIds));
  }, [finishRound, round, selectedIds]);

  const handleHint = useCallback(() => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    if (!session.consumeHint()) return;

    if (round.mode === RECALL_MODES.MULTI_SELECT) {
      setHintId(nextUnselectedTarget(round.targetIds, selectedIds));
    } else {
      setHintId(round.trials[trialIndex]?.targetId ?? null);
    }
    setFeedback({ tone: FEEDBACK_TONE.INFO, message: t('games.wordRecall.hint') });
  }, [phase, round, selectedIds, session, t, trialIndex]);

  const handleFinish = useCallback(async () => {
    await session.endSession();
    setPhase(GAME_PHASE.FINISHED);
  }, [session]);

  const handleExit = useCallback(async () => {
    if (phase !== GAME_PHASE.FINISHED) await session.endSession({ earlyExit: true });
    onExit?.();
  }, [onExit, phase, session]);

  const handlePlayAgain = useCallback(() => {
    session.restart();
    setRound(null);
    setFeedback(null);
    setPhase(GAME_PHASE.READY);
  }, [session]);

  const question = round && round.mode === RECALL_MODES.MULTI_SELECT
    ? t('games.wordRecall.multiSelectQuestion', { count: round.targets.length })
    : t('games.wordRecall.recognitionQuestion');

  const statusMessages = {
    [GAME_PHASE.READY]: t('games.common.tapToBegin'),
    [GAME_PHASE.PRESENTING]: t('games.wordRecall.instructions'),
    [GAME_PHASE.DELAY]: t('games.wordRecall.pause'),
    [GAME_PHASE.RESPONDING]: question,
    [GAME_PHASE.FEEDBACK]: feedback?.message ?? '',
    [GAME_PHASE.FINISHED]: t('games.common.sessionComplete'),
  };

  return (
    <GameLayout
      titleKey="games.wordRecall.name"
      instructions={t('games.wordRecall.instructions')}
      difficulty={session.difficulty}
      roundNumber={session.roundNumber}
      totalRounds={roundsPerSession}
      onExit={handleExit}
      statusMessage={statusMessages[phase]}
      aside={phase !== GAME_PHASE.FINISHED ? (
        <ScorePanel
          roundNumber={session.rounds.length}
          totalRounds={roundsPerSession}
          correct={session.stats.correct}
          mistakes={session.stats.mistakes}
          hints={session.stats.hints}
        />
      ) : null}
      footer={renderFooter()}
    >
      {renderStage()}
      {phase !== GAME_PHASE.FINISHED ? <FeedbackBanner {...(feedback ?? {})} /> : null}
    </GameLayout>
  );

  function renderChoices(choices, onChoose, selectable) {
    return (
      <div className="sm-grid sm-grid--wide">
        {choices.map((word) => {
          const selected = selectedIds.includes(word.id);
          const classNames = ['sm-tile'];
          if (selectable && selected) classNames.push('sm-tile--selected');
          if (hintId === word.id) classNames.push('sm-tile--hint');

          return (
            <button
              type="button"
              key={word.id}
              className={classNames.join(' ')}
              aria-pressed={selectable ? selected : undefined}
              onClick={() => onChoose(word.id)}
              disabled={phase !== GAME_PHASE.RESPONDING}
            >
              <span className="sm-tile__label" style={{ fontSize: '1.375rem' }}>
                {t(word.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderStage() {
    if (phase === GAME_PHASE.FINISHED) {
      return (
        <SessionSummary
          stats={session.stats}
          roundsPerSession={roundsPerSession}
          pendingSyncCount={session.pendingSyncCount}
          onPlayAgain={handlePlayAgain}
          onExit={onExit ? handleExit : undefined}
        />
      );
    }

    if (phase === GAME_PHASE.READY) {
      return (
        <section className="sm-panel">
          <p className="sm-stage-message">{t('games.common.tapToBegin')}</p>
        </section>
      );
    }

    if (phase === GAME_PHASE.PRESENTING) {
      const word = round.targets[presentIndex];
      return (
        <section className="sm-showcase">
          <span className="sm-showcase__label">{t('games.wordRecall.remember')}</span>
          <span className="sm-showcase__word">{word ? t(word.labelKey) : '\u00a0'}</span>
          <span className="sm-showcase__label">
            {`${Math.min(presentIndex + 1, round.targets.length)} / ${round.targets.length}`}
          </span>
        </section>
      );
    }

    if (phase === GAME_PHASE.DELAY) {
      return (
        <section className="sm-showcase">
          <span className="sm-showcase__word">{t('games.wordRecall.pause')}</span>
          <PhaseProgress
            durationMs={round.level.recallDelayMs}
            active
            resetKey={session.roundNumber}
          />
        </section>
      );
    }

    if (round.mode === RECALL_MODES.MULTI_SELECT) {
      return (
        <section className="sm-panel">
          <h2 className="sm-panel__title">{question}</h2>
          {renderChoices(round.choices, toggleSelection, true)}
          <p style={{ marginTop: '1rem' }}>
            {t('games.common.selectedCount', {
              count: selectedIds.length,
              needed: round.targets.length,
            })}
          </p>
        </section>
      );
    }

    const trial = round.trials[Math.min(trialIndex, round.trials.length - 1)];
    return (
      <section className="sm-panel">
        <h2 className="sm-panel__title">{question}</h2>
        <p>
          {t('games.common.roundProgress', {
            current: trialIndex + 1,
            total: round.trials.length,
          })}
        </p>
        {renderChoices(trial.choices, handleRecognitionAnswer, false)}
      </section>
    );
  }

  function renderFooter() {
    if (phase === GAME_PHASE.READY) {
      return (
        <button type="button" className="sm-btn sm-btn--wide" onClick={startRound}>
          {t('games.common.startRound')}
        </button>
      );
    }

    if (phase === GAME_PHASE.RESPONDING) {
      return (
        <>
          {round.mode === RECALL_MODES.MULTI_SELECT ? (
            <button
              type="button"
              className="sm-btn sm-btn--wide"
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
            >
              {t('games.common.confirm')}
            </button>
          ) : null}
          <button
            type="button"
            className="sm-btn sm-btn--quiet"
            onClick={handleHint}
            disabled={session.hintsRemaining === 0}
          >
            {t('games.common.hint')}
          </button>
        </>
      );
    }

    if (phase === GAME_PHASE.FEEDBACK) {
      return session.isSessionComplete ? (
        <button
          type="button"
          className="sm-btn sm-btn--wide"
          onClick={handleFinish}
          disabled={session.isSubmitting}
        >
          {t('games.common.finish')}
        </button>
      ) : (
        <button
          type="button"
          className="sm-btn sm-btn--wide"
          onClick={startRound}
          disabled={session.isSubmitting}
        >
          {t('games.common.nextRound')}
        </button>
      );
    }

    return null;
  }
}
