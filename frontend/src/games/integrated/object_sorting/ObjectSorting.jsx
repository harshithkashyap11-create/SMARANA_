import React, { useCallback, useRef, useState } from 'react';
import GameLayout from '../shared/GameLayout.jsx';
import ScorePanel from '../shared/ScorePanel.jsx';
import FeedbackBanner from '../shared/FeedbackBanner.jsx';
import SessionSummary from '../shared/SessionSummary.jsx';
import { useTranslate } from '../shared/i18n.js';
import { useGameSession } from '../shared/useGameSession.js';
import { FEEDBACK_TONE, GAME_PHASE } from '../shared/gameTypes.js';
import objectSortingConfig, { GAME_ID, getLevel } from './config.js';
import { generateRound, isCorrectPlacement, summariseSortingRound } from './logic.js';

/**
 * Interaction is tap-to-select then tap-to-place. Drag and drop is deliberately
 * not used: a sustained press-move-release is exactly the gesture that fails
 * for tremor, arthritis and unfamiliarity with touchscreens.
 */
export default function ObjectSorting({
  difficulty = 1,
  roundsPerSession = objectSortingConfig.roundsPerSession,
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
  const [selectedId, setSelectedId] = useState(null);
  const [placements, setPlacements] = useState({});
  const [wrongAttempts, setWrongAttempts] = useState({});
  const [hintCategoryId, setHintCategoryId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const roundStartRef = useRef(0);

  const startRound = useCallback(() => {
    setRound(generateRound(session.difficulty, rng));
    setSelectedId(null);
    setPlacements({});
    setWrongAttempts({});
    setHintCategoryId(null);
    setFeedback(null);
    roundStartRef.current = Date.now();
    setPhase(GAME_PHASE.RESPONDING);
  }, [rng, session.difficulty]);

  const finishRound = useCallback(async (finalWrongAttempts) => {
    const durationMs = Date.now() - roundStartRef.current;
    const incorrectPlacements = Object.values(finalWrongAttempts)
      .reduce((total, count) => total + count, 0);
    const firstAttemptCorrect = round.objects
      .filter((object) => !finalWrongAttempts[object.id]).length;

    const summary = summariseSortingRound({
      objectCount: round.objects.length,
      firstAttemptCorrect,
      incorrectPlacements,
      durationMs,
    });

    setPhase(GAME_PHASE.FEEDBACK);
    setFeedback({
      tone: FEEDBACK_TONE.SUCCESS,
      icon: '✓',
      message: t('games.objectSorting.done'),
    });

    await session.completeRound({
      correct: summary.correct,
      total: summary.total,
      errors: summary.errors,
      accuracy: summary.accuracy,
      reactionTimeMs: summary.averageTimePerObjectMs,
      extra: {
        correct_classifications: summary.correct,
        incorrect_classifications: incorrectPlacements,
        corrections: Object.keys(finalWrongAttempts).length,
        category_count: round.categories.length,
        object_count: round.objects.length,
      },
    });
  }, [round, session, t]);

  const selectedObject = round?.objects.find((object) => object.id === selectedId) ?? null;

  const handleSelectObject = useCallback((object) => {
    if (phase !== GAME_PHASE.RESPONDING) return;
    setHintCategoryId(null);
    setSelectedId((current) => (current === object.id ? null : object.id));
    setFeedback({
      tone: FEEDBACK_TONE.INFO,
      message: t('games.objectSorting.selectCategory', { item: t(object.labelKey) }),
    });
  }, [phase, t]);

  const handleSelectCategory = useCallback((category) => {
    if (phase !== GAME_PHASE.RESPONDING || !selectedObject) return;
    setHintCategoryId(null);

    if (!isCorrectPlacement(selectedObject, category.id)) {
      const nextWrong = {
        ...wrongAttempts,
        [selectedObject.id]: (wrongAttempts[selectedObject.id] ?? 0) + 1,
      };
      setWrongAttempts(nextWrong);
      setFeedback({
        tone: FEEDBACK_TONE.GENTLE,
        message: t('games.objectSorting.incorrect', { item: t(selectedObject.labelKey) }),
      });
      return;
    }

    const nextPlacements = { ...placements, [selectedObject.id]: category.id };
    setPlacements(nextPlacements);
    setSelectedId(null);
    setFeedback({
      tone: FEEDBACK_TONE.SUCCESS,
      icon: '✓',
      message: t('games.objectSorting.correct', {
        item: t(selectedObject.labelKey),
        category: t(category.labelKey),
      }),
    });

    if (Object.keys(nextPlacements).length >= round.objects.length) {
      finishRound(wrongAttempts);
    }
  }, [finishRound, phase, placements, round, selectedObject, t, wrongAttempts]);

  const handleHint = useCallback(() => {
    if (phase !== GAME_PHASE.RESPONDING || !selectedObject) return;
    if (!session.consumeHint()) return;
    setHintCategoryId(selectedObject.category);
    setFeedback({ tone: FEEDBACK_TONE.INFO, message: t('games.objectSorting.hint') });
  }, [phase, selectedObject, session, t]);

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

  const remainingObjects = round
    ? round.objects.filter((object) => !placements[object.id])
    : [];

  const statusMessages = {
    [GAME_PHASE.READY]: t('games.common.tapToBegin'),
    [GAME_PHASE.RESPONDING]: feedback?.message ?? t('games.objectSorting.selectObject'),
    [GAME_PHASE.FEEDBACK]: feedback?.message ?? '',
    [GAME_PHASE.FINISHED]: t('games.common.sessionComplete'),
  };

  return (
    <GameLayout
      titleKey="games.objectSorting.name"
      instructions={t('games.objectSorting.instructions')}
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
          extraItems={round ? [{
            key: 'placed',
            label: t('games.objectSorting.placedCount', {
              count: Object.keys(placements).length,
            }),
            value: `${Object.keys(placements).length} / ${round.objects.length}`,
          }] : []}
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

    return (
      <>
        <section className="sm-panel">
          <h2 className="sm-panel__title">{t('games.objectSorting.tray')}</h2>
          {remainingObjects.length === 0 ? (
            <p className="sm-stage-message">{t('games.objectSorting.done')}</p>
          ) : (
            <div className="sm-grid">
              {remainingObjects.map((object) => (
                <button
                  type="button"
                  key={object.id}
                  className={
                    selectedId === object.id ? 'sm-tile sm-tile--selected' : 'sm-tile'
                  }
                  aria-pressed={selectedId === object.id}
                  onClick={() => handleSelectObject(object)}
                  disabled={phase !== GAME_PHASE.RESPONDING}
                >
                  <span className="sm-tile__emoji" aria-hidden="true">{object.emoji}</span>
                  <span className="sm-tile__label">{t(object.labelKey)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="sm-panel">
          <div className="sm-grid sm-grid--wide">
            {round.categories.map((category) => {
              const contents = round.objects.filter(
                (object) => placements[object.id] === category.id,
              );
              const classNames = ['sm-bin'];
              if (selectedObject) classNames.push('sm-bin--active');
              if (hintCategoryId === category.id) classNames.push('sm-bin--hint');

              return (
                <button
                  type="button"
                  key={category.id}
                  className={classNames.join(' ')}
                  onClick={() => handleSelectCategory(category)}
                  disabled={!selectedObject || phase !== GAME_PHASE.RESPONDING}
                >
                  <span className="sm-bin__title">
                    <span aria-hidden="true">{category.emoji} </span>
                    {t(category.labelKey)}
                  </span>
                  <span className="sm-bin__items">
                    {contents.map((object) => (
                      <span key={object.id} aria-label={t(object.labelKey)}>
                        {object.emoji}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
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
        <button
          type="button"
          className="sm-btn sm-btn--quiet"
          onClick={handleHint}
          disabled={!selectedObject || session.hintsRemaining === 0}
        >
          {t('games.common.hint')}
        </button>
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
