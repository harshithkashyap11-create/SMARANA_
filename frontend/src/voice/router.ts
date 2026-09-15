import type { VoiceLanguage } from "./stt";
export type Intent = "open_section" | "start_game" | "medicines_today" | "next_activity" | "set_reminder" | "call_person" | "read_this" | "speak_slowly" | "speak_normally" | "help" | "sos" | "switch_language";
export interface FamilyContext { familyMembers?: Array<{ name: string; relationship?: string }>; languageLocked?: boolean }
export interface RoutedIntent { intent: Intent; slots: Record<string, string>; requiresConfirm: boolean }
const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}: ]/gu, " ").replace(/\s+/g, " ").trim();
const distance = (a: string, b: string): number => { const row = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let prev = row[0] ?? 0; row[0] = i; for (let j = 1; j <= b.length; j++) { const old = row[j] ?? j; row[j] = Math.min(old + 1, (row[j - 1] ?? j) + 1, prev + Number(a.charAt(i - 1) !== b.charAt(j - 1))); prev = old; } } return row[b.length] ?? 0; };
export function route(utterance: string, _language: VoiceLanguage, context: FamilyContext = {}): RoutedIntent | null {
  const text = normalize(utterance); const make = (intent: Intent, slots: Record<string, string> = {}, confirm = false): RoutedIntent => ({ intent, slots, requiresConfirm: confirm });
  if (/^(help|i am confused|i'm confused|সহায়|সাহায্য)/u.test(text)) return make("help");
  if (/(emergency|need help now|জৰুৰী|জরুরি)/u.test(text)) return make("sos", {}, true);
  if (/(speak slowly|ধীরে|লাহে)/u.test(text)) return make("speak_slowly"); if (/(speak normally|normal speed)/u.test(text)) return make("speak_normally");
  if (/(read this|পঢ়ি|পড়ে)/u.test(text)) return make("read_this");
  const section = text.match(/(?:open|show|go to) (?:my )?(memories|medicines|routine|games|calm time|people|settings)/u); if (section?.[1]) return make("open_section", { section: section[1].replace(" ", "-") });
  if (/(what.*medicine|my medicine|tablet|ঔষধ)/u.test(text)) return make("medicines_today");
  if (/(what ?s next|what time|what day|পৰৱৰ্তী|পরবর্তী)/u.test(text)) return make("next_activity");
  const reminder = text.match(/remind me to (.+?) at ([0-9]{1,2}(?::[0-9]{2})?)/u); if (reminder?.[1] && reminder[2]) return make("set_reminder", { title: reminder[1], time: reminder[2] }, true);
  if (/(switch|change).*(language|bengali|assamese|english)/u.test(text)) return context.languageLocked ? null : make("switch_language");
  const call = text.match(/(?:call|phone) (?:my )?(.+)/u); if (call?.[1]) { const wanted = call[1]; const person = context.familyMembers?.find((p) => [p.name, p.relationship ?? ""].some((x) => distance(normalize(x), wanted) / Math.max(x.length, wanted.length) <= 0.3)); if (person) return make("call_person", { name: person.name }, true); }
  const game = text.match(/(?:play|start) (?:a |the )?(.*?)(?: game)?$/u); if (game) return make("start_game", game[1] ? { game: game[1] } : {});
  return null;
}
