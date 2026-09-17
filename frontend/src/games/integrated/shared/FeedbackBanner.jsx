import React from 'react';
import { FEEDBACK_TONE } from './gameTypes.js';

/**
 * Feedback after a round or an action.
 *
 * Tone is limited to success / gentle / info. There is no "error" tone: an
 * incorrect answer is a normal part of the activity, so it is never styled in
 * alarm colours or announced as assertive.
 */
export default function FeedbackBanner({ tone = FEEDBACK_TONE.INFO, message, icon }) {
  if (!message) return null;

  return (
    <p className={`sm-feedback sm-feedback--${tone}`} role="status">
      {icon ? <span className="sm-feedback__icon" aria-hidden="true">{icon}</span> : null}
      <span className="sm-feedback__text">{message}</span>
    </p>
  );
}
