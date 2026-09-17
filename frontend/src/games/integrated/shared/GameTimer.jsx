import React, { useEffect, useRef, useState } from 'react';

/**
 * Timing utilities.
 *
 * SMARANA deliberately avoids ticking countdown clocks: they raise anxiety and
 * measure stress rather than cognition. What we do need is a calm indicator
 * that a viewing phase is passing, plus an elapsed timer for metrics.
 */

/** Elapsed milliseconds since `active` became true. Updates once per second. */
export function useElapsedMs(active = true) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    if (!active) {
      startRef.current = null;
      return undefined;
    }
    startRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  return elapsed;
}

/**
 * Calls `onComplete` once, `durationMs` after `active` turns true.
 * `resetKey` restarts the timer without remounting the component.
 */
export function usePhaseTimer({ durationMs, active, onComplete, resetKey = 0 }) {
  const callbackRef = useRef(onComplete);
  callbackRef.current = onComplete;

  useEffect(() => {
    if (!active || durationMs == null) return undefined;
    const id = setTimeout(() => callbackRef.current?.(), durationMs);
    return () => clearTimeout(id);
  }, [active, durationMs, resetKey]);
}

/**
 * Horizontal bar that drains over `durationMs`. Decorative only — the phase
 * change itself is announced through the game's live region.
 */
export function PhaseProgress({ durationMs, active, resetKey = 0, label }) {
  return (
    <div className="sm-phase" aria-hidden="true">
      <div
        key={`${resetKey}-${durationMs}`}
        className={active ? 'sm-phase__bar sm-phase__bar--running' : 'sm-phase__bar'}
        style={{ animationDuration: `${durationMs}ms` }}
      />
      {label ? <p className="sm-phase__label">{label}</p> : null}
    </div>
  );
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Quiet elapsed-time readout. Hidden by default; opt in per game. */
export default function GameTimer({ active = true, label }) {
  const elapsed = useElapsedMs(active);
  return (
    <p className="sm-timer">
      {label ? <span className="sm-timer__label">{label}</span> : null}
      <span className="sm-timer__value">{formatDuration(elapsed)}</span>
    </p>
  );
}
