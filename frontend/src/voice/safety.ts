export const normalizeTranscript = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}: ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:hey |hi |okay |ok )?sm[aā]rana\s*/u, "");
/** Target the action being denied, not every sentence containing "don't". */
export function isNegatedCommand(value: string): boolean {
  const text = normalizeTranscript(value);
  return (
    /\b(?:do not|don t|dont|never)\s+(?:(?:want|wish)\s+to\s+)?(?:open|start|play|create|set|add|call|phone|remind|trigger|send|delete|launch|show|switch|change)\b/u.test(
      text,
    ) || /\b(?:not|isn t)\s+(?:an?\s+)?emergency\b/u.test(text)
  );
}
