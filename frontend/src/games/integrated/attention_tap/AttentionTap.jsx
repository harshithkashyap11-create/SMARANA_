/**
 * Game 10 - Attention Tap
 * Cognitive domain: sustained attention, target detection, gentle inhibition.
 *
 * One large stimulus at a time, with a blank gap between stimuli. Nothing
 * flashes and nothing moves; the tap area is the full play panel.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameLayout, useTranslation, submitGameMetrics } from '../shared/gameBindings';
import useDifficultyController from '../shared/useDifficultyController';
import { createRng } from '../shared/rng';
import { GAME_ID, getConfig } from './config';
import { generateStimulusSequence, scoreSequence, buildMetrics } from './logic';

const PHASE = { READY: 'ready', PLAYING: 'playing', BETWEEN: 'between', SUMMARY: 'summary' };

export default function AttentionTap({
  initialDifficulty = 2,
  seed,
  onExit,
  onComplete,
  submitMetrics = submitGameMetrics,
}) {
  const { t } = useTranslation();
  const rngRef = useRef(createRng(seed ?? Date.now()));
  const sessionStartRef = useRef(Date.now());
  const timersRef = useRef([]);
  const tapsRef = useRef([]);
  const onsetRef = useRef(0);
  const currentRef = useRef(null);

  const { difficulty, reportPerformance, syncState } = useDifficultyController({
    gameId: GAME_ID,
    initialDifficulty,
    submitMetrics,
  });
  const config = useMemo(() => getConfig(difficulty), [difficulty]);

  const [roundIndex, setRoundIndex] = useState(0);
  const [round, setRound] = useState(() =>
    generateStimulusSequence({ difficulty: initialDifficulty, rng: rngRef.current, roundIndex: 0 })
  );
  const [phase, setPhase] = useState(PHASE.READY);
  const [visibleStimulus, setVisibleStimulus] = useState(null);
  const [tapFlash, setTapFlash] = useState(false);
  const [results, setResults] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  const totalRounds = useRef(getConfig(initialDifficulty).roundsPerSession).current;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const endRound = useCallback(() => {
    clearTimers();
    setVisibleStimulus(null);
    currentRef.current = null;
    const scored = scoreSequence(round, tapsRef.current);
    const nextResults = [...results, scored];
    setResults(nextResults);
    setLastResult(scored);
    setPhase(PHASE.BETWEEN);

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
  }, [clearTimers, round, results, totalRounds, config.reportEveryRounds, reportPerformance, difficulty]);

  const playFrom = useCallback(
    (index) => {
      if (index >= round.sequence.length) {
        timersRef.current.push(setTimeout(endRound, round.gapMs));
        return;
      }
      const stimulus = round.sequence[index];
      onsetRef.current = Date.now();
      currentRef.current = stimulus;
      setVisibleStimulus(stimulus);
      timersRef.current.push(
        setTimeout(() => {
          setVisibleStimulus(null);
          currentRef.current = null;
          timersRef.current.push(setTimeout(() => playFrom(index + 1), round.gapMs));
        }, stimulus.durationMs)
      );
    },
    [round, endRound]
  );

  const startRound = useCallback(() => {
    tapsRef.current = [];
    clearTimers();
    setPhase(PHASE.PLAYING);
    timersRef.current.push(setTimeout(() => playFrom(0), 900));
  }, [clearTimers, playFrom]);

  const handleTap = useCallback(() => {
    if (phase !== PHASE.PLAYING) return;
    const stimulus = currentRef.current;
    tapsRef.current.push({
      stimulusId: stimulus ? stimulus.id : null,
      latencyMs: stimulus ? Date.now() - onsetRef.current : 0,
    });
    setTapFlash(true);
    timersRef.current.push(setTimeout(() => setTapFlash(false), 220));
  }, [phase]);

  const handleKeyTap = useCallback(
    (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        handleTap();
      }
    },
    [handleTap]
  );

  const goNext = useCallback(() => {
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
    setRound(generateStimulusSequence({ difficulty, rng: rngRef.current, roundIndex: index }));
    setRoundIndex(index);
    setPhase(PHASE.READY);
  }, [results, totalRounds, roundIndex, difficulty, onComplete]);

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
  }, [clearTimers, difficulty, results, reportPerformance, onExit]);

  const totalHits = results.reduce((a, r) => a + r.hits, 0);
  const totalTargets = results.reduce((a, r) => a + r.targets, 0);
  const targetName = t(round.targetKey);

  return (
    <GameLayout
      title={t('games.attentionTap.name')}
      instructions={t('games.attentionTap.instructions', { target: targetName })}
      difficulty={difficulty}
      progress={{ current: Math.min(roundIndex + 1, totalRounds), total: totalRounds }}
      score={{ correct: totalHits, total: totalTargets }}
      status={syncState}
      onExit={handleExit}
    >
      {phase === PHASE.READY && (
        <div className="sm-panel sm-panel--centered">
          <p className="sm-prompt">{t('games.attentionTap.rulePrompt', { target: targetName })}</p>
          <div className="sm-target" role="img" aria-label={targetName}>
            {round.targetEmoji}
          </div>
          {round.inhibition && round.inhibitionRuleKey && (
            <p className="sm-hint-text" role="note">
              {t(round.inhibitionRuleKey)}{' '}
              <span role="img" aria-hidden="true">
                {round.inhibitorEmoji}
              </span>
            </p>
          )}
          <button type="button" className="sm-btn sm-btn--primary" onClick={startRound} autoFocus>
            {t('games.common.imReady')}
          </button>
        </div>
      )}

      {phase === PHASE.PLAYING && (
        <div
          className={`sm-tap-area ${tapFlash ? 'sm-tap-area--tapped' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={t('games.attentionTap.tapAreaLabel', { target: targetName })}
          onClick={handleTap}
          onKeyDown={handleKeyTap}
        >
          <div className="sm-tap-area__stimulus" role="img" aria-live="polite" aria-label={
            visibleStimulus
              ? t(`games.attentionTap.${visibleStimulus.labelKey}`, { defaultValue: visibleStimulus.labelKey.split('.').pop() })
              : t('games.attentionTap.waiting')
          }>
            <span aria-hidden="true">{visibleStimulus ? visibleStimulus.emoji : ''}</span>
          </div>
          <p className="sm-hint-text">{t('games.attentionTap.tapWhenYouSee', { target: targetName })}</p>
        </div>
      )}

      {phase === PHASE.BETWEEN && lastResult && (
        <div className="sm-panel sm-panel--centered">
          <p className="sm-feedback__text" role="status" aria-live="polite">
            {t('games.attentionTap.roundSummary', { hits: lastResult.hits, targets: lastResult.targets })}
          </p>
          <button type="button" className="sm-btn sm-btn--primary" disabled={syncState === 'sending'} onClick={goNext} autoFocus>
            {results.length >= totalRounds ? t('games.common.seeSummary') : t('games.common.next')}
          </button>
        </div>
      )}

      {phase === PHASE.SUMMARY && (
        <div className="sm-panel sm-panel--centered">
          <h2 className="sm-summary__title">{t('games.common.sessionFinished')}</h2>
          <p className="sm-summary__line">{t('games.attentionTap.roundSummary', { hits: totalHits, targets: totalTargets })}</p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={() => onExit && onExit(null)} autoFocus>
            {t('games.common.done')}
          </button>
        </div>
      )}
    </GameLayout>
  );
}
