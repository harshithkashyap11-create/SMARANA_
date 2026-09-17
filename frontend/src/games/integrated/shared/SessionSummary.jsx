import React from 'react';
import { useTranslate } from './i18n.js';
import ScorePanel from './ScorePanel.jsx';

/**
 * Closing screen shared by every game. Reports what the patient did, never a
 * grade. Also surfaces the offline notice when results are still queued.
 */
export default function SessionSummary({
  stats,
  roundsPerSession,
  pendingSyncCount = 0,
  onPlayAgain,
  onExit,
}) {
  const t = useTranslate();

  return (
    <section className="sm-panel sm-summary">
      <h2 className="sm-summary__title">{t('games.common.sessionComplete')}</h2>
      <p>{t('games.common.sessionSummary', { rounds: stats.roundsPlayed })}</p>

      <ScorePanel
        roundNumber={stats.roundsPlayed}
        totalRounds={roundsPerSession}
        correct={stats.correct}
        mistakes={stats.mistakes}
        hints={stats.hints}
      />

      {pendingSyncCount > 0 ? (
        <p className="sm-summary__note">{t('games.common.resultsSaved')}</p>
      ) : null}

      <div className="sm-game__footer">
        {onPlayAgain ? (
          <button type="button" className="sm-btn sm-btn--wide" onClick={onPlayAgain}>
            {t('games.common.playAgain')}
          </button>
        ) : null}
        {onExit ? (
          <button
            type="button"
            className="sm-btn sm-btn--quiet sm-btn--wide"
            onClick={onExit}
          >
            {t('games.common.backToGames')}
          </button>
        ) : null}
      </div>
    </section>
  );
}
