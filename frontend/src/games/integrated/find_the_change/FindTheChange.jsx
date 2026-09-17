import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameLayout from '../shared/GameLayout.jsx';
import ScorePanel from '../shared/ScorePanel.jsx';
import FeedbackBanner from '../shared/FeedbackBanner.jsx';
import SessionSummary from '../shared/SessionSummary.jsx';
import { PhaseProgress, usePhaseTimer } from '../shared/GameTimer.jsx';
import { useTranslate } from '../shared/i18n.js';
import { useGameSession } from '../shared/useGameSession.js';
import { FEEDBACK_TONE, GAME_PHASE } from '../shared/gameTypes.js';
import findTheChangeConfig, { GAME_ID, getLevel } from './config.js';
import { evaluateSelections, generateScenes, nextUnfoundAnswer } from './logic.js';

export default function FindTheChange({
  difficulty = 1,
  roundsPerSession = findTheChangeConfig.roundsPerSession,
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [hintId, setHintId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const responseStartRef = useRef(0);

  const startRound = useCallback(() => {
    setRound(generateScenes(session.difficulty, rng));
    setSelectedIds([]);
    setHintId(null);
    setFeedback(null);
    setPhase(GAME_PHASE.PRESENTING);
  }, [rng, session.difficulty]);

  usePhaseTimer({
    durationMs: round?.level.observeMs,
    active: phase === GAME_PHASE.PRESENTING,
    resetKey: session.roundNumber,
    onComplete: () => setPhase(GAME_PHASE.DELAY),
  });

  usePhaseTimer({
    durationMs: round?.level.delayMs,
    active: phase === GAME_PHASE.DELAY,
    resetKey: session.roundNumber,
    onComplete: () => setPhase(GAME_PHASE.RESPONDING),
  });

  useEffect(() => {
    if (phase === GAME_PHASE.RESPONDING) responseStartRef.current = Date.now();
  }, [phase]);

  const toggleSelection = useCallback((itemId) => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    setHintId(null);
    setSelectedIds((current) => {
      if (current.includes(itemId)) return current.filter((id) => id !== itemId);
      if (current.length >= round.level.changeCount) return current;
      return [...current, itemId];
    });
  }, [phase, round]);

  const handleConfirm = useCallback(async () => {
    const result = evaluateSelections(selectedIds, round.answerIds);
    const reactionTimeMs = Date.now() - responseStartRef.current;

    setPhase(GAME_PHASE.FEEDBACK);

    if (result.isPerfect) {
      setFeedback({
        tone: FEEDBACK_TONE.SUCCESS,
        icon: '✓',
        message: t('games.findTheChange.correct'),
      });
    } else if (result.correct > 0) {
      setFeedback({
        tone: FEEDBACK_TONE.GENTLE,
        message: t('games.findTheChange.partial', {
          correct: result.correct,
          total: result.total,
        }),
      });
    } else {
      setFeedback({ tone: FEEDBACK_TONE.GENTLE, message: t('games.findTheChange.tryAgain') });
    }

    await session.completeRound({
      correct: result.correct,
      total: result.total,
      errors: result.errors,
      accuracy: result.accuracy,
      reactionTimeMs,
      extra: {
        changes_identified: result.correct,
        false_selections: result.falseSelections.length,
        missed_changes: result.missedIds.length,
        change_types: round.changes.map((change) => change.type),
        object_count: round.level.objectCount,
      },
    });
  }, [round, selectedIds, session, t]);

  const handleHint = useCallback(() => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    if (!session.consumeHint()) return;
    setHintId(nextUnfoundAnswer(round.answerIds, selectedIds));
    setFeedback({ tone: FEEDBACK_TONE.INFO, message: t('games.findTheChange.hint') });
  }, [phase, round, selectedIds, session, t]);

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

  const question = round && round.level.changeCount > 1
    ? t('games.findTheChange.chooseMany', { count: round.level.changeCount })
    : t('games.findTheChange.chooseOne');

  const statusMessages = {
    [GAME_PHASE.READY]: t('games.common.tapToBegin'),
    [GAME_PHASE.PRESENTING]: t('games.findTheChange.observe'),
    [GAME_PHASE.DELAY]: t('games.common.getReady'),
    [GAME_PHASE.RESPONDING]: question,
    [GAME_PHASE.FEEDBACK]: feedback?.message ?? '',
    [GAME_PHASE.FINISHED]: t('games.common.sessionComplete'),
  };

  return (
    <GameLayout
      titleKey="games.findTheChange.name"
      instructions={t('games.findTheChange.instructions')}
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

  function renderScene(items, labelKey) {
    return (
      <section className="sm-panel">
        <h2 className="sm-panel__title">{t(labelKey)}</h2>
        <ul className="sm-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((item, index) => (
            <li className="sm-tile" key={`${item.id}-${index}`}>
              <span className="sm-tile__emoji" aria-hidden="true">{item.emoji}</span>
              <span className="sm-tile__label">{t(item.labelKey)}</span>
            </li>
          ))}
        </ul>
      </section>
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
      return (
        <>
          <p className="sm-stage-message">{t('games.findTheChange.observe')}</p>
          {renderScene(round.before, 'games.findTheChange.sceneBefore')}
          <PhaseProgress durationMs={round.level.observeMs} active resetKey={session.roundNumber} />
        </>
      );
    }

    if (phase === GAME_PHASE.DELAY) {
      return (
        <section className="sm-showcase">
          <span className="sm-showcase__word">{t('games.common.getReady')}</span>
          <PhaseProgress durationMs={round.level.delayMs} active resetKey={session.roundNumber} />
        </section>
      );
    }

    const isReviewing = phase === GAME_PHASE.FEEDBACK;

    return (
      <>
        {renderScene(round.after, 'games.findTheChange.sceneAfter')}

        <section className="sm-panel">
          <h2 className="sm-panel__title">{t('games.findTheChange.question')}</h2>
          <p>{question}</p>
          <div className="sm-grid" style={{ marginTop: '1.25rem' }}>
            {round.before.map((item) => {
              const selected = selectedIds.includes(item.id);
              const classNames = ['sm-tile'];
              if (selected) classNames.push('sm-tile--selected');
              if (hintId === item.id) classNames.push('sm-tile--hint');
              if (isReviewing && round.answerIds.includes(item.id)) {
                classNames.push('sm-tile--correct');
              }

              return (
                <button
                  type="button"
                  key={item.id}
                  className={classNames.join(' ')}
                  aria-pressed={selected}
                  onClick={() => toggleSelection(item.id)}
                  disabled={isReviewing}
                >
                  <span className="sm-tile__emoji" aria-hidden="true">{item.emoji}</span>
                  <span className="sm-tile__label">{t(item.labelKey)}</span>
                </button>
              );
            })}
          </div>
          <p style={{ marginTop: '1rem' }}>
            {t('games.common.selectedCount', {
              count: selectedIds.length,
              needed: round.level.changeCount,
            })}
          </p>
        </section>
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
            onClick={handleConfirm}
            disabled={selectedIds.length !== round.level.changeCount}
          >
            {t('games.common.confirm')}
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
