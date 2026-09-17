import React from 'react';
import { useTranslate } from './i18n.js';
import { DIFFICULTY_MAX } from './gameTypes.js';
import './games.css';

/**
 * Shell shared by every game: title, one-line instruction, round progress,
 * difficulty indicator, exit control, stage and footer.
 *
 * The stage is a plain <main> so each game controls its own layout; everything
 * around it stays identical between games, which is what makes the app
 * predictable for a patient moving between activities.
 */

export function DifficultyMeter({ difficulty }) {
  const t = useTranslate();
  const label = t('games.common.difficultyLevel', {
    level: difficulty,
    max: DIFFICULTY_MAX,
  });

  return (
    <p className="sm-difficulty" aria-label={label} title={label}>
      <span className="sm-difficulty__label">{t('games.common.difficulty')}</span>
      <span className="sm-difficulty__dots" aria-hidden="true">
        {Array.from({ length: DIFFICULTY_MAX }, (_, index) => (
          <span
            key={index}
            className={
              index < difficulty
                ? 'sm-difficulty__dot sm-difficulty__dot--on'
                : 'sm-difficulty__dot'
            }
          />
        ))}
      </span>
    </p>
  );
}

export default function GameLayout({
  titleKey,
  title,
  instructions,
  difficulty,
  roundNumber,
  totalRounds,
  onExit,
  statusMessage = '',
  children,
  footer,
  aside,
  progress,
  score,
  status,
}) {
  const t = useTranslate();

  return (
    <div className="sm-game">
      <header className="sm-game__header">
        <div className="sm-game__headings">
          <h1 className="sm-game__title">{title ?? t(titleKey)}</h1>
          {instructions ? (
            <p className="sm-game__instructions">{instructions}</p>
          ) : null}
        </div>
        {onExit ? (
          <button type="button" className="sm-btn sm-btn--quiet" onClick={onExit}>
            {t('games.common.exit')}
          </button>
        ) : null}
      </header>

      <div className="sm-game__meta">
        <p className="sm-game__round">
          {t('games.common.roundProgress', {
            current: Math.min(progress?.current ?? roundNumber ?? 1, progress?.total ?? totalRounds ?? 1),
            total: progress?.total ?? totalRounds ?? 1,
          })}
        </p>
        <DifficultyMeter difficulty={difficulty} />
      </div>

      <div className="sm-game__stage">{children}</div>

      {status === "offline" && <p role="status">{t("games.common.savingLater")}</p>}
      {aside ? <div className="sm-game__aside">{aside}</div> : null}
      {footer ? <div className="sm-game__footer">{footer}</div> : null}

      <p className="sm-visually-hidden" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
