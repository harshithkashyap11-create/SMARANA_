import React, { useCallback, useEffect, useRef, useState } from 'react';
import GameLayout from '../shared/GameLayout.jsx';
import ScorePanel from '../shared/ScorePanel.jsx';
import FeedbackBanner from '../shared/FeedbackBanner.jsx';
import SessionSummary from '../shared/SessionSummary.jsx';
import { PhaseProgress, usePhaseTimer } from '../shared/GameTimer.jsx';
import { useTranslate } from '../shared/i18n.js';
import { useGameSession } from '../shared/useGameSession.js';
import { FEEDBACK_TONE, GAME_PHASE } from '../shared/gameTypes.js';
import memoryMatchConfig, { GAME_ID, getLevel } from './config.js';
import { buildDeck, findHintPair, isMatch, summariseMatchRound } from './logic.js';

const HINT_REVEAL_MS = 1400;

export default function MemoryMatch({
  difficulty = 1,
  roundsPerSession = memoryMatchConfig.roundsPerSession,
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
  const [deck, setDeck] = useState(null);
  const [flipped, setFlipped] = useState([]);
  const [matchedItemIds, setMatchedItemIds] = useState([]);
  const [hintCardIds, setHintCardIds] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [mismatches, setMismatches] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const roundStartRef = useRef(0);
  const timeoutsRef = useRef([]);

  const schedule = useCallback((callback, delay) => {
    const id = setTimeout(callback, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const startRound = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setDeck(buildDeck(session.difficulty, rng));
    setFlipped([]);
    setMatchedItemIds([]);
    setHintCardIds([]);
    setIsLocked(false);
    setMoves(0);
    setMismatches(0);
    setFeedback(null);
    setPhase(GAME_PHASE.PRESENTING);
  }, [rng, session.difficulty]);

  usePhaseTimer({
    durationMs: deck?.level.previewMs,
    active: phase === GAME_PHASE.PRESENTING,
    resetKey: session.roundNumber,
    onComplete: () => {
      roundStartRef.current = Date.now();
      setPhase(GAME_PHASE.RESPONDING);
    },
  });

  const finishRound = useCallback(async (totalMoves, totalMismatches) => {
    const durationMs = Date.now() - roundStartRef.current;
    const summary = summariseMatchRound({
      pairCount: deck.pairCount,
      moves: totalMoves,
      mismatches: totalMismatches,
      durationMs,
    });

    setPhase(GAME_PHASE.FEEDBACK);
    setFeedback({
      tone: FEEDBACK_TONE.SUCCESS,
      icon: '✓',
      message: t('games.memoryMatch.allMatched'),
    });

    await session.completeRound({
      correct: deck.pairCount,
      total: totalMoves,
      errors: summary.errors,
      accuracy: summary.accuracy,
      reactionTimeMs: summary.averageDecisionMs,
      extra: {
        matches: deck.pairCount,
        incorrect_attempts: totalMismatches,
        total_moves: totalMoves,
        completion_time_ms: durationMs,
        average_decision_ms: summary.averageDecisionMs,
        card_count: deck.level.cardCount,
      },
    });
  }, [deck, session, t]);

  const handleCardClick = useCallback((card) => {
    if (phase !== GAME_PHASE.RESPONDING || isLocked) return;
    if (matchedItemIds.includes(card.itemId)) return;
    if (flipped.some((flippedCard) => flippedCard.cardId === card.cardId)) return;

    const nextFlipped = [...flipped, card];
    setFlipped(nextFlipped);
    setHintCardIds([]);
    if (nextFlipped.length < 2) return;

    const [first, second] = nextFlipped;
    const nextMoves = moves + 1;
    setMoves(nextMoves);

    if (isMatch(first, second)) {
      const nextMatched = [...matchedItemIds, first.itemId];
      setMatchedItemIds(nextMatched);
      setFlipped([]);

      if (nextMatched.length >= deck.pairCount) {
        finishRound(nextMoves, mismatches);
      } else {
        setFeedback({
          tone: FEEDBACK_TONE.SUCCESS,
          icon: '✓',
          message: t('games.memoryMatch.matchFound'),
        });
      }
      return;
    }

    const nextMismatches = mismatches + 1;
    setMismatches(nextMismatches);
    setIsLocked(true);
    setFeedback({ tone: FEEDBACK_TONE.GENTLE, message: t('games.memoryMatch.noMatch') });
    schedule(() => {
      setFlipped([]);
      setIsLocked(false);
    }, deck.level.mismatchDelayMs);
  }, [deck, finishRound, flipped, isLocked, matchedItemIds, mismatches, moves, phase, schedule, t]);

  const handleHint = useCallback(() => {
    if (phase !== GAME_PHASE.RESPONDING || isLocked) return;
    if (!session.consumeHint()) return;
    const pair = findHintPair(deck.cards, matchedItemIds);
    setHintCardIds(pair);
    setFeedback({ tone: FEEDBACK_TONE.INFO, message: t('games.memoryMatch.hint') });
    schedule(() => setHintCardIds([]), HINT_REVEAL_MS);
  }, [deck, isLocked, matchedItemIds, phase, schedule, session, t]);

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
    setDeck(null);
    setFeedback(null);
    setPhase(GAME_PHASE.READY);
  }, [session]);

  const isCardFaceUp = (card) => (
    phase === GAME_PHASE.PRESENTING
    || phase === GAME_PHASE.FEEDBACK
    || matchedItemIds.includes(card.itemId)
    || flipped.some((flippedCard) => flippedCard.cardId === card.cardId)
    || hintCardIds.includes(card.cardId)
  );

  const statusMessages = {
    [GAME_PHASE.READY]: t('games.common.tapToBegin'),
    [GAME_PHASE.PRESENTING]: t('games.memoryMatch.preview'),
    [GAME_PHASE.RESPONDING]: feedback?.message ?? t('games.memoryMatch.instructions'),
    [GAME_PHASE.FEEDBACK]: feedback?.message ?? '',
    [GAME_PHASE.FINISHED]: t('games.common.sessionComplete'),
  };

  return (
    <GameLayout
      titleKey="games.memoryMatch.name"
      instructions={t('games.memoryMatch.instructions')}
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
          extraItems={deck ? [{
            key: 'pairs',
            label: t('games.memoryMatch.pairsFound'),
            value: `${matchedItemIds.length} / ${deck.pairCount}`,
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
      <section className="sm-panel">
        {phase === GAME_PHASE.PRESENTING ? (
          <>
            <p className="sm-stage-message">{t('games.memoryMatch.preview')}</p>
            <PhaseProgress
              durationMs={deck.level.previewMs}
              active
              resetKey={session.roundNumber}
            />
          </>
        ) : null}

        <div
          className="sm-cards"
          style={{
            gridTemplateColumns: `repeat(${deck.level.columns}, minmax(0, 1fr))`,
            marginTop: '1.25rem',
          }}
        >
          {deck.cards.map((card, index) => {
            const faceUp = isCardFaceUp(card);
            const matched = matchedItemIds.includes(card.itemId);
            const classNames = ['sm-card'];
            if (faceUp) classNames.push('sm-card--up');
            if (matched) classNames.push('sm-card--matched');

            return (
              <button
                type="button"
                key={card.cardId}
                className={classNames.join(' ')}
                onClick={() => handleCardClick(card)}
                disabled={matched || phase !== GAME_PHASE.RESPONDING}
                aria-label={
                  faceUp
                    ? t('games.memoryMatch.cardMatched', {
                      index: index + 1,
                      item: t(card.labelKey),
                    })
                    : t('games.memoryMatch.cardLabel', { index: index + 1 })
                }
              >
                {faceUp
                  ? <span aria-hidden="true">{card.emoji}</span>
                  : <span className="sm-card__back" aria-hidden="true" />}
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
        <button
          type="button"
          className="sm-btn sm-btn--quiet"
          data-voice-hint onClick={handleHint}
          disabled={session.hintsRemaining === 0}
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
