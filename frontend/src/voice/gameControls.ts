/** Operate the active game's existing controls, respecting phase/disabled state. */
export function gameInstructions(): string | null {
  return (
    document
      .querySelector(
        "main .sm-game__instructions, main [data-game-instructions]",
      )
      ?.textContent?.trim() || null
  );
}

export function requestGameHint(): boolean {
  const button = document.querySelector<HTMLButtonElement>(
    "main [data-voice-hint]:not(:disabled)",
  );
  if (!button) return false;
  button.click();
  return true;
}
