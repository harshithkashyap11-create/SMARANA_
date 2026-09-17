import React, { useCallback, useRef, useState } from 'react';
import GameLayout from '../shared/GameLayout.jsx';
import ScorePanel from '../shared/ScorePanel.jsx';
import FeedbackBanner from '../shared/FeedbackBanner.jsx';
import SessionSummary from '../shared/SessionSummary.jsx';
import { useTranslate } from '../shared/i18n.js';
import { useGameSession } from '../shared/useGameSession.js';
import { FEEDBACK_TONE, GAME_PHASE } from '../shared/gameTypes.js';
import dailyRoutineConfig, { GAME_ID, getLevel } from './config.js';
import {
  buildRound,
  evaluateOrder,
  findStep,
  moveWithinSlots,
  nextExpectedStep,
} from './logic.js';

/**
 * Ordering is done by tapping: pick a step, tap the position. Placed steps can
 * also be nudged with up/down buttons or taken back, so a patient can correct
 * a choice without ever holding and dragging.
 */
export default function DailyRoutine({
  difficulty = 1,
  roundsPerSession = dailyRoutineConfig.roundsPerSession,
  ddaClient,
  onExit,
  onSessionEnd,
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
  const [slots, setSlots] = useState([]);
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [hintStepId, setHintStepId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const roundStartRef = useRef(0);

  const startRound = useCallback(() => {
    const nextRound = buildRound(session.difficulty, rng);
    setRound(nextRound);
    setSlots(nextRound.slots);
    setSelectedStepId(null);
    setAttempts(0);
    setHintStepId(null);
    setFeedback(null);
    setEvaluation(null);
    roundStartRef.current = Date.now();
    setPhase(GAME_PHASE.RESPONDING);
  }, [rng, session.difficulty]);

  const traySteps = round
    ? [...round.steps, ...round.distractors].filter((step) => !slots.includes(step.id))
    : [];

  const handleSelectStep = useCallback((step) => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    setHintStepId(null);
    setSelectedStepId((current) => (current === step.id ? null : step.id));
  }, [phase]);

  const handleSlotTap = useCallback((index) => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    setHintStepId(null);
    setAttempts((count) => count + 1);

    setSlots((current) => {
      const next = [...current];
      const occupant = next[index];

      // The chosen step always comes from the tray, so any step already in this
      // slot is simply released and reappears in the tray.
      if (selectedStepId) {
        next[index] = selectedStepId;
        return next;
      }

      if (occupant) next[index] = null;
      return next;
    });

    if (selectedStepId) setSelectedStepId(null);
  }, [phase, selectedStepId]);

  const handleMove = useCallback((index, direction) => {
    setAttempts((count) => count + 1);
    setSlots((current) => moveWithinSlots(current, index, index + direction));
  }, []);

  const handleCheck = useCallback(async () => {
    const result = evaluateOrder(slots, round.correctOrder);
    const reactionTimeMs = Date.now() - roundStartRef.current;

    setEvaluation(result);
    setPhase(GAME_PHASE.FEEDBACK);
    if (result.isPerfect) {
      setFeedback({
        tone: FEEDBACK_TONE.SUCCESS,
        icon: '✓',
        message: t('games.dailyRoutine.correct'),
      });
    } else if (result.correctPositions > 0) {
      setFeedback({
        tone: FEEDBACK_TONE.GENTLE,
        message: t('games.dailyRoutine.partial', {
          correct: result.correctPositions,
          total: result.total,
        }),
      });
    } else {
      setFeedback({ tone: FEEDBACK_TONE.GENTLE, message: t('games.dailyRoutine.tryAgain') });
    }

    await session.completeRound({
      correct: result.correctPositions,
      total: result.total,
      errors: result.misplaced + result.distractorsPlaced,
      accuracy: result.accuracy,
      reactionTimeMs,
      extra: {
        scenario_id: round.scenario.id,
        correct_positions: result.correctPositions,
        misplaced_steps: result.misplaced,
        distractors_placed: result.distractorsPlaced,
        reorder_attempts: attempts,
        pre_placed: round.prePlacedCount,
      },
    });
  }, [attempts, round, session, slots, t]);

  const handleHint = useCallback(() => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    if (!session.consumeHint()) return;
    const expected = nextExpectedStep(slots, round.correctOrder);
    setHintStepId(expected?.stepId ?? null);
    setFeedback({ tone: FEEDBACK_TONE.INFO, message: t('games.dailyRoutine.hint') });
  }, [phase, round, session, slots, t]);

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

  const allSlotsFilled = slots.length > 0 && slots.every(Boolean);

  const statusMessages = {
    [GAME_PHASE.READY]: t('games.common.tapToBegin'),
    [GAME_PHASE.RESPONDING]: t('games.dailyRoutine.instructions'),
    [GAME_PHASE.FEEDBACK]: feedback?.message ?? '',
    [GAME_PHASE.FINISHED]: t('games.common.sessionComplete'),
  };

  return (
    <GameLayout
      titleKey="games.dailyRoutine.name"
      instructions={t('games.dailyRoutine.instructions')}
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

    const isReviewing = phase === GAME_PHASE.FEEDBACK;

    return (
      <>
        <section className="sm-panel">
          <h2 className="sm-panel__title">
            {t('games.dailyRoutine.scenarioPrompt', {
              scenario: t(round.scenario.nameKey),
            })}
          </h2>

          <ol className="sm-slots">
            {slots.map((stepId, index) => {
              const step = stepId ? findStep(round, stepId) : null;
              const isCorrectHere = isReviewing
                && round.correctOrder[index] === stepId;
              const classNames = ['sm-slot'];
              if (!step) classNames.push('sm-slot--empty');
              if (!step && selectedStepId) classNames.push('sm-slot--active');
              if (isCorrectHere) classNames.push('sm-slot--correct');

              return (
                <li className={classNames.join(' ')} key={`slot-${index}`}>
                  <span className="sm-slot__number" aria-hidden="true">{index + 1}</span>
                  <button
                    type="button"
                    className="sm-slot__body"
                    onClick={() => handleSlotTap(index)}
                    disabled={isReviewing}
                    aria-label={
                      step
                        ? `${t('games.dailyRoutine.stepSlot', { number: index + 1 })}: ${t(step.labelKey)}`
                        : `${t('games.dailyRoutine.stepSlot', { number: index + 1 })}: ${t('games.dailyRoutine.emptySlot')}`
                    }
                  >
                    {step ? (
                      <>
                        <span className="sm-slot__emoji" aria-hidden="true">{step.emoji}</span>
                        <span>{t(step.labelKey)}</span>
                      </>
                    ) : (
                      <span>{t('games.dailyRoutine.emptySlot')}</span>
                    )}
                  </button>

                  {step && !isReviewing ? (
                    <span className="sm-slot__actions">
                      <button
                        type="button"
                        className="sm-icon-btn"
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0}
                        aria-label={t('games.dailyRoutine.moveUp')}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="sm-icon-btn"
                        onClick={() => handleMove(index, 1)}
                        disabled={index === slots.length - 1}
                        aria-label={t('games.dailyRoutine.moveDown')}
                      >
                        ↓
                      </button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="sm-panel">
          <h2 className="sm-panel__title">{t('games.dailyRoutine.stepsAvailable')}</h2>
          {traySteps.length === 0 ? (
            <p>{t('games.common.yourTurn')}</p>
          ) : (
            <div className="sm-grid sm-grid--wide">
              {traySteps.map((step) => {
                const classNames = ['sm-tile'];
                if (selectedStepId === step.id) classNames.push('sm-tile--selected');
                if (hintStepId === step.id) classNames.push('sm-tile--hint');

                return (
                  <button
                    type="button"
                    key={step.id}
                    className={classNames.join(' ')}
                    aria-pressed={selectedStepId === step.id}
                    onClick={() => handleSelectStep(step)}
                    disabled={isReviewing}
                  >
                    <span className="sm-tile__emoji" aria-hidden="true">{step.emoji}</span>
                    <span className="sm-tile__label">{t(step.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {isReviewing && evaluation && !evaluation.isPerfect ? (
          <section className="sm-panel">
            <h2 className="sm-panel__title">{t('games.dailyRoutine.correct')}</h2>
            <ol className="sm-slots">
              {round.correctOrder.map((stepId, index) => {
                const step = findStep(round, stepId);
                return (
                  <li className="sm-slot sm-slot--correct" key={`answer-${stepId}`}>
                    <span className="sm-slot__number" aria-hidden="true">{index + 1}</span>
                    <span className="sm-slot__body" style={{ cursor: 'default' }}>
                      <span className="sm-slot__emoji" aria-hidden="true">{step.emoji}</span>
                      <span>{t(step.labelKey)}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </>
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
          <button
            type="button"
            className="sm-btn sm-btn--wide"
            onClick={handleCheck}
            disabled={!allSlotsFilled}
          >
            {t('games.dailyRoutine.check')}
          </button>
          <button
            type="button"
            className="sm-btn sm-btn--quiet"
            data-voice-hint onClick={handleHint}
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
