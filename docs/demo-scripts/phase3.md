# Phase 3 exit demo — Games and adaptive difficulty

Run this demo as the Rao patient. Keep the browser database inspector and Django admin open so each saved row can be checked immediately.

## Prepare

1. Seed the demo scenario and sign in as Rao.
2. Open **Games**, confirm all twelve game tiles are available and regional tiles show the regional badge, and leave **Looking for a challenge today?** off.
3. Choose **Sequence Recall**. In `games_difficultystate`, note Rao's current `level` and empty or existing `window`.

## Demonstrate a level decrease

1. At a level above the minimum, complete three sessions with deliberately poor recall (accuracy below 60%). Keep the first two response times similar and let the third mean response time be at least 30% longer. Do not choose **Take a break** unless the fatigue prompt is being demonstrated separately.
2. After each session, confirm one `games_gamesession` row has `completed=true`, its seed, level, timestamps, and metrics.
3. After the third qualifying session, confirm one `games_difficultychange` row with `reason_code=demote`, `from_level` one above `to_level`, and the exact stored explanation. Confirm the state window contains the sessions used by DDA.

Expected: one-level decrease only after three qualifying sessions with slower responses. The first two sessions and a single poor session must not decrease the level. Constant response times alone do not satisfy this rule.

## Demonstrate a level increase

1. Complete three sessions accurately and promptly at the current level.
2. Confirm each session row, then inspect the latest difficulty-change row.

Expected: `reason_code=promote`, a one-level increase within the game/doctor cap, and the exact supportive explanation stored with the change.

## Demonstrate challenge mode

1. Return to **Games**, enable **Looking for a challenge today?**, and start Sequence Recall.
2. Confirm the session plays one level above the stored level, without exceeding the cap.
3. Finish the game and inspect its session row.

Expected: `challenge_mode=true`; the session level is temporarily raised, while the pre-session difficulty state was not edited by the toggle. The toggle resets on a new day.

## Demonstrate resume and fatigue support

1. Start any game, complete one round, navigate away, then return to **Games**.
2. Confirm the **Continue your game?** card opens the same game, level, seed, and next round.
3. Generate the configured fatigue signals (repeated errors/slow responses or the session cap).
4. Choose **Keep playing** once, then trigger the prompt again and choose **Take a break**.

Expected: resume uses the existing local state rather than creating a new seed. Continuing suppresses the prompt for three rounds. Taking a break saves a `games_gamesession` row with `completed=false`, `abandoned_reason=break_prompt`, and the applicable `fatigue_flags`; DDA records a hold rather than promoting or demoting.
