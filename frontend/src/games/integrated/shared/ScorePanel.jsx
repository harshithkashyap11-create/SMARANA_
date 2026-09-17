import React from 'react';
import { useTranslate } from './i18n.js';

/**
 * Progress feedback, not a scoreboard.
 *
 * No points, no streaks, no leaderboard. The patient sees how far through the
 * session they are and what they have got right. "Mistakes" is shown only when
 * there are some, and is never styled as a penalty.
 */
export default function ScorePanel({
  roundNumber,
  totalRounds,
  correct,
  mistakes = 0,
  hints = 0,
  extraItems = [],
}) {
  const t = useTranslate();

  const items = [
    {
      key: 'progress',
      label: t('games.common.progress'),
      value: `${Math.min(roundNumber, totalRounds)} / ${totalRounds}`,
    },
    { key: 'correct', label: t('games.common.correct'), value: correct },
    ...extraItems,
  ];

  if (mistakes > 0) {
    items.push({ key: 'mistakes', label: t('games.common.mistakes'), value: mistakes });
  }
  if (hints > 0) {
    items.push({ key: 'hints', label: t('games.common.hintsUsed'), value: hints });
  }

  return (
    <dl className="sm-score">
      {items.map((item) => (
        <div className="sm-score__item" key={item.key}>
          <dt className="sm-score__label">{item.label}</dt>
          <dd className="sm-score__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
