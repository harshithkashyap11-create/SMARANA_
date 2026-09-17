import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameLayout from '../shared/GameLayout.jsx';
import ScorePanel from '../shared/ScorePanel.jsx';
import FeedbackBanner from '../shared/FeedbackBanner.jsx';
import SessionSummary from '../shared/SessionSummary.jsx';
import { PhaseProgress, usePhaseTimer } from '../shared/GameTimer.jsx';
import { useTranslate } from '../shared/i18n.js';
import { useGameSession } from '../shared/useGameSession.js';
import { FEEDBACK_TONE, GAME_PHASE } from '../shared/gameTypes.js';
import sequenceRecallConfig, { GAME_ID, getLevel } from './config.js';
import { evaluateSequence, generateRound, nextExpectedItem } from './logic.js';

export default function SequenceRecall({
  difficulty = 1,
  roundsPerSession = sequenceRecallConfig.roundsPerSession,
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
  const [presentIndex, setPresentIndex] = useState(0);
  const [isItemVisible, setIsItemVisible] = useState(false);
  const [answer, setAnswer] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [hintItemId, setHintItemId] = useState(null);
  const recallStartRef = useRef(0);

  const startRound = useCallback(() => {
    setRound(generateRound(session.difficulty, rng));
    setAnswer([]);
    setFeedback(null);
    setHintItemId(null);
    setPresentIndex(0);
    setIsItemVisible(false);
    setPhase(GAME_PHASE.PRESENTING);
  }, [rng, session.difficulty]);

  // Show the sequence one object at a time, with a blank gap between objects.
  useEffect(() => {
    if (phase !== GAME_PHASE.PRESENTING || !round) return undefined;

    if (presentIndex >= round.sequence.length) {
      setPhase(round.level.recallDelayMs > 0 ? GAME_PHASE.DELAY : GAME_PHASE.RESPONDING);
      return undefined;
    }

    setIsItemVisible(true);
    const hide = setTimeout(() => setIsItemVisible(false), round.level.displayTimeMs);
    const advance = setTimeout(
      () => setPresentIndex((index) => index + 1),
      round.level.displayTimeMs + round.level.gapMs,
    );
    return () => {
      clearTimeout(hide);
      clearTimeout(advance);
    };
  }, [phase, presentIndex, round]);

  usePhaseTimer({
    durationMs: round?.level.recallDelayMs,
    active: phase === GAME_PHASE.DELAY,
    resetKey: session.roundNumber,
    onComplete: () => setPhase(GAME_PHASE.RESPONDING),
  });

  useEffect(() => {
    if (phase === GAME_PHASE.RESPONDING) recallStartRef.current = Date.now();
  }, [phase]);

  const finishRound = useCallback(async (finalAnswer) => {
    const evaluation = evaluateSequence(round.sequence, finalAnswer);
    const reactionTimeMs = Date.now() - recallStartRef.current;

    setPhase(GAME_PHASE.FEEDBACK);
    if (evaluation.isPerfect) {
      setFeedback({
        tone: FEEDBACK_TONE.SUCCESS,
        icon: '✓',
        message: t('games.sequenceRecall.correct'),
      });
    } else if (evaluation.correctPositions > 0) {
      setFeedback({
        tone: FEEDBACK_TONE.GENTLE,
        message: t('games.sequenceRecall.partial', {
          correct: evaluation.correctPositions,
          total: evaluation.sequenceLength,
        }),
      });
    } else {
      setFeedback({
        tone: FEEDBACK_TONE.GENTLE,
        message: t('games.sequenceRecall.tryAgain'),
      });
    }

    await session.completeRound({
      correct: evaluation.correctPositions,
      total: evaluation.sequenceLength,
      errors: evaluation.errors,
      accuracy: evaluation.accuracy,
      reactionTimeMs,
      extra: {
        sequence_length: evaluation.sequenceLength,
        correct_positions: evaluation.correctPositions,
        distractors: round.level.distractors,
      },
    });
  }, [round, session, t]);

  const handleSelect = useCallback((item) => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    const nextAnswer = [...answer, item];
    setAnswer(nextAnswer);
    setHintItemId(null);
    if (nextAnswer.length >= round.sequence.length) {
      finishRound(nextAnswer);
    }
  }, [answer, finishRound, phase, round]);

  const handleHint = useCallback(() => {
    if (!session.consumeHint()) return;
    const expected = nextExpectedItem(round.sequence, answer);
    setHintItemId(expected?.id ?? null);
    setFeedback({ tone: FEEDBACK_TONE.INFO, message: t('games.sequenceRecall.hint') });
  }, [answer, round, session, t]);

  const handleFinish = useCallback(async () => {
    await session.endSession();
    setPhase(GAME_PHASE.FINISHED);
  }, [session]);

  const handleExit = useCallback(async () => {
    if (phase !== GAME_PHASE.FINISHED) {
      await session.endSession({ earlyExit: true });
    }
    onExit?.();
  }, [onExit, phase, session]);

  const handlePlayAgain = useCallback(() => {
    session.restart();
    setPhase(GAME_PHASE.READY);
    setRound(null);
    setFeedback(null);
  }, [session]);

  const statusMessages = {
    [GAME_PHASE.READY]: t('games.common.tapToBegin'),
    [GAME_PHASE.PRESENTING]: t('games.sequenceRecall.watching'),
    [GAME_PHASE.DELAY]: t('games.common.getReady'),
    [GAME_PHASE.RESPONDING]: t('games.sequenceRecall.recall'),
    [GAME_PHASE.FEEDBACK]: feedback?.message ?? '',
    [GAME_PHASE.FINISHED]: t('games.common.sessionComplete'),
  };

  const currentItem = round?.sequence[presentIndex];

  return (
    <GameLayout
      titleKey="games.sequenceRecall.name"
      instructions={t('games.sequenceRecall.instructions')}
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
      {phase !== GAME_PHASE.FINISHED ? (
        <FeedbackBanner {...(feedback ?? {})} />
      ) : null}
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

    if (phase === GAME_PHASE.PRESENTING) {
      return (
        <section className="sm-showcase">
          <span className="sm-showcase__label">{t('games.common.watchCarefully')}</span>
          <span className="sm-showcase__emoji">
            {isItemVisible && currentItem ? currentItem.emoji : '\u00a0'}
          </span>
          <span className="sm-showcase__label">
            {isItemVisible && currentItem ? t(currentItem.labelKey) : '\u00a0'}
          </span>
        </section>
      );
    }

    if (phase === GAME_PHASE.DELAY) {
      return (
        <section className="sm-showcase">
          <span className="sm-showcase__word">{t('games.common.getReady')}</span>
          <PhaseProgress
            durationMs={round.level.recallDelayMs}
            active
            resetKey={session.roundNumber}
          />
        </section>
      );
    }

    const isReviewing = phase === GAME_PHASE.FEEDBACK;

    return (
      <section className="sm-panel">
        <h2 className="sm-panel__title">
          {isReviewing ? t('games.sequenceRecall.answerSoFar') : t('games.sequenceRecall.recall')}
        </h2>

        <p className="sm-strip">
          {answer.length === 0 ? (
            <span className="sm-strip__placeholder">
              {t('games.common.selectedCount', {
                count: 0,
                needed: round.sequence.length,
              })}
            </span>
          ) : (
            answer.map((item, index) => (
              <span key={`${item.id}-${index}`} aria-label={t(item.labelKey)}>
                {item.emoji}
              </span>
            ))
          )}
        </p>

        <div className="sm-grid" style={{ marginTop: '1.25rem' }}>
          {round.options.map((item) => {
            const used = answer.some((chosen) => chosen.id === item.id);
            const classNames = ['sm-tile'];
            if (used) classNames.push('sm-tile--muted');
            if (hintItemId === item.id) classNames.push('sm-tile--hint');

            return (
              <button
                type="button"
                key={item.id}
                className={classNames.join(' ')}
                onClick={() => handleSelect(item)}
                disabled={used || isReviewing}
              >
                <span className="sm-tile__emoji" aria-hidden="true">{item.emoji}</span>
                <span className="sm-tile__label">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
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
          <button
            type="button"
            className="sm-btn sm-btn--quiet"
            onClick={() => setAnswer((current) => current.slice(0, -1))}
            disabled={answer.length === 0}
          >
            {t('games.common.undo')}
          </button>
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
