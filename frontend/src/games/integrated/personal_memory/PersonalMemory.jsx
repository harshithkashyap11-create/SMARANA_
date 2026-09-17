/**
 * Game 12 - Personal Memory Recall
 * Cognitive domain: autobiographical memory support and engagement.
 *
 * This game supports remembering; it does not test, score harshly or diagnose.
 * Content always comes from a caregiver-approved provider (Memory Capsule in
 * production, sampleData.js in development) - never hardcoded here.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameLayout, useTranslation, submitGameMetrics } from '../shared/gameBindings';
import useDifficultyController from '../shared/useDifficultyController';
import { createRng } from '../shared/rng';
import { GAME_ID, MODES, getConfig } from './config';
import { buildPrompt, validateRecognition, recordAnswer, shouldIncreaseSupport, buildMetrics } from './logic';


const PHASE = { LOADING: 'loading', UNAVAILABLE: 'unavailable', PROMPT: 'prompt', FEEDBACK: 'feedback', SUMMARY: 'summary' };

/** @param {import('../../integratedProps').IntegratedGameProps} props */
export default function PersonalMemory({
  initialDifficulty = 2,
  seed,
  onExit,
  onComplete,
  submitMetrics = submitGameMetrics,
  dataProvider,
  ImageComponent,
}) {
  const MemoryImage = ImageComponent ?? 'img';
  const { t } = useTranslation();
  const rngRef = useRef(createRng(seed ?? Date.now()));
  const sessionStartRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const provider = useMemo(() => dataProvider || { getItems: async () => [] }, [dataProvider]);

  const { difficulty, stepDifficulty, reportPerformance, syncState } = useDifficultyController({
    gameId: GAME_ID,
    initialDifficulty,
    submitMetrics,
  });
  const config = useMemo(() => getConfig(difficulty), [difficulty]);

  const [items, setItems] = useState([]);
  const [phase, setPhase] = useState(PHASE.LOADING);
  const [prompt, setPrompt] = useState(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [hintsShown, setHintsShown] = useState(0);
  const [choicesRevealed, setChoicesRevealed] = useState(true);
  const [lastAnswer, setLastAnswer] = useState(null);

  const totalRounds = useRef(getConfig(initialDifficulty).roundsPerSession).current;

  const openPrompt = useCallback(
    (sourceItems, index, history) => {
      const next = buildPrompt({ items: sourceItems, difficulty, rng: rngRef.current, roundIndex: index, history });
      if (!next) {
        setPhase(PHASE.UNAVAILABLE);
        return;
      }
      setPrompt(next);
      setHintsShown(0);
      setChoicesRevealed(next.revealChoicesImmediately);
      questionStartRef.current = Date.now();
      setPhase(PHASE.PROMPT);
    },
    [difficulty]
  );

  // Load caregiver-approved content once; cached/offline content is the
  // provider's responsibility (see withCacheFallback in sampleData.js).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await provider.getItems();
        if (cancelled) return;
        if (!loaded || loaded.length < 2) {
          setPhase(PHASE.UNAVAILABLE);
          return;
        }
        setItems(loaded);
        openPrompt(loaded, 0, []);
      } catch (error) {
        if (!cancelled) setPhase(PHASE.UNAVAILABLE);
      }
    })();
    return () => {
      cancelled = true;
    };
    // openPrompt intentionally excluded: content is loaded once per mount.
  }, [provider]);

  // Offer a hint on our own if the patient has been sitting with the question.
  useEffect(() => {
    if (phase !== PHASE.PROMPT || !prompt || hintsShown > 0) return undefined;
    const timer = setTimeout(() => setHintsShown(1), prompt.autoHintAfterMs);
    return () => clearTimeout(timer);
  }, [phase, prompt, hintsShown]);

  const handleChoice = useCallback(
    (choice) => {
      if (phase !== PHASE.PROMPT || !prompt) return;
      const answer = recordAnswer({
        prompt,
        choice,
        responseTimeMs: Date.now() - questionStartRef.current,
        hintsUsed: hintsShown,
      });
      const allAnswers = [...answers, answer];
      setAnswers(allAnswers);
      setLastAnswer(answer);
      setPhase(PHASE.FEEDBACK);

      // Supportive safety net: repeated misses move towards MORE support now,
      // without waiting for the DDA round trip.
      if (shouldIncreaseSupport(allAnswers)) stepDifficulty(-1);

      const isLast = allAnswers.length >= totalRounds;
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
    [phase, prompt, hintsShown, answers, stepDifficulty, totalRounds, config.reportEveryRounds, reportPerformance, difficulty]
  );

  const goNext = useCallback(() => {
    if (answers.length >= totalRounds) {
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
      return;
    }
    const index = roundIndex + 1;
    setRoundIndex(index);
    openPrompt(items, index, answers);
  }, [answers, totalRounds, roundIndex, items, openPrompt, onComplete, difficulty]);

  const showNextHint = useCallback(() => {
    if (!prompt) return;
    setHintsShown((n) => Math.min(prompt.hints.length, n + 1));
    setChoicesRevealed(true);
  }, [prompt]);

  const handleExit = useCallback(() => {
    const payload = buildMetrics({
      difficulty,
      answers,
      sessionDurationSec: (Date.now() - sessionStartRef.current) / 1000,
      completed: false,
      earlyExit: true,
    });
    reportPerformance(payload);
    if (onExit) onExit(payload);
  }, [difficulty, answers, reportPerformance, onExit]);

  const recalled = answers.filter((a) => a.correct).length;
  const item = prompt ? prompt.item : null;

  return (
    <GameLayout
      title={t('games.personalMemory.name')}
      instructions={t('games.personalMemory.instructions')}
      difficulty={difficulty}
      progress={{ current: Math.min(roundIndex + 1, totalRounds), total: totalRounds }}
      score={{ correct: recalled, total: answers.length }}
      status={syncState}
      onExit={handleExit}
      footer={
        phase === PHASE.PROMPT && prompt && hintsShown < prompt.hints.length ? (
          <button type="button" className="sm-btn sm-btn--quiet" data-voice-hint onClick={showNextHint}>
            {t('games.personalMemory.giveMeAHint')}
          </button>
        ) : null
      }
    >
      {phase === PHASE.LOADING && (
        <div className="sm-panel sm-panel--centered">
          <p className="sm-prompt" aria-live="polite">{t('games.personalMemory.loading')}</p>
        </div>
      )}

      {phase === PHASE.UNAVAILABLE && (
        <div className="sm-panel sm-panel--centered">
          <p className="sm-prompt">{t('games.personalMemory.noContent')}</p>
          <p className="sm-hint-text">{t('games.personalMemory.noContentHelp')}</p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={() => onExit && onExit(null)} autoFocus>
            {t('games.common.done')}
          </button>
        </div>
      )}

      {(phase === PHASE.PROMPT || phase === PHASE.FEEDBACK) && prompt && item && (
        <div className="sm-panel">
          <p className="sm-prompt">{t(prompt.questionKey)}</p>

          <figure className="sm-memory-card">
            {item.imageUrl ? (
              <MemoryImage className="sm-memory-card__image" src={item.imageUrl} alt={t('games.personalMemory.photoAlt')} />
            ) : (
              <div className="sm-memory-card__placeholder" role="img" aria-label={t('games.personalMemory.photoAlt')}>
                <span aria-hidden="true">{item.placeholderEmoji}</span>
              </div>
            )}
            {(prompt.showContext || phase === PHASE.FEEDBACK) && (
              <figcaption className="sm-memory-card__caption">
                {prompt.showRelationshipOnCard && item.relationship ? (
                  <span className="sm-memory-card__line">{item.relationship}</span>
                ) : null}
                {item.location ? <span className="sm-memory-card__line">{item.location}</span> : null}
                {phase === PHASE.FEEDBACK && item.note ? <span className="sm-memory-card__line">{item.note}</span> : null}
              </figcaption>
            )}
          </figure>

          {prompt.hints.slice(0, hintsShown).map((hint, i) => (
            <p className="sm-hint-text" role="note" key={`${hint.key}-${i}`}>
              {t(hint.key, hint.params)}
            </p>
          ))}

          {!choicesRevealed ? (
            <div className="sm-panel sm-panel--centered">
              <p className="sm-hint-text">{t('games.personalMemory.takeYourTime')}</p>
              <button type="button" className="sm-btn sm-btn--primary" onClick={() => setChoicesRevealed(true)} autoFocus>
                {t('games.personalMemory.showChoices')}
              </button>
            </div>
          ) : (
            <div className="sm-choices sm-choices--text" role="group" aria-label={t('games.personalMemory.choicesLabel')}>
              {prompt.choices.map((choice) => {
                const isCorrect = validateRecognition(prompt, choice);
                const classes = ['sm-choice', 'sm-choice--text'];
                if (phase === PHASE.FEEDBACK) {
                  if (isCorrect) classes.push('sm-choice--correct');
                  else if (lastAnswer && lastAnswer.correct === false && choice.id !== prompt.correctChoiceId) {
                    classes.push('sm-choice--muted');
                  }
                }
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={classes.join(' ')}
                    onClick={() => handleChoice(choice)}
                    disabled={phase === PHASE.FEEDBACK}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>
          )}

          {phase === PHASE.FEEDBACK && (
            <div className="sm-panel sm-panel--centered">
              <p className="sm-feedback__text" role="status" aria-live="polite">
                {lastAnswer && lastAnswer.correct
                  ? t('games.personalMemory.yesThatsRight', {
                      name: item.displayName,
                      relationship: item.relationship || '',
                    })
                  : prompt.mode === MODES.RELATIONSHIP_RECALL
                  ? t('games.personalMemory.gentleRelationshipReveal', {
                      name: item.displayName,
                      relationship: item.relationship || '',
                    })
                  : t('games.personalMemory.gentleReveal', { name: item.displayName })}
              </p>
              <button type="button" className="sm-btn sm-btn--primary" disabled={syncState === 'sending'} onClick={goNext} autoFocus>
                {answers.length >= totalRounds ? t('games.common.seeSummary') : t('games.common.next')}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === PHASE.SUMMARY && (
        <div className="sm-panel sm-panel--centered">
          <h2 className="sm-summary__title">{t('games.personalMemory.summaryTitle')}</h2>
          <p className="sm-summary__line">{t('games.personalMemory.summaryLine', { count: answers.length })}</p>
          <button type="button" className="sm-btn sm-btn--primary" onClick={() => onExit && onExit(null)} autoFocus>
            {t('games.common.done')}
          </button>
        </div>
      )}
    </GameLayout>
  );
}
