import type { VoiceLanguage } from "./stt";
export type Intent =
  | "open_section"
  | "start_game"
  | "medicines_today"
  | "next_activity"
  | "set_reminder"
  | "call_person"
  | "read_this"
  | "speak_slowly"
  | "speak_normally"
  | "help"
  | "sos"
  | "switch_language";
export interface FamilyContext {
  familyMembers?: Array<{ name: string; relationship?: string }>;
  languageLocked?: boolean;
}
export interface RoutedIntent {
  intent: Intent;
  slots: Record<string, string>;
  requiresConfirm: boolean;
}
const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}: ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
const reminderTime = (value: string): string | null => {
  const [hour, minute = "00"] = value.split(":");
  if (Number(hour) > 23 || Number(minute) > 59) return null;
  return `${hour!.padStart(2, "0")}:${minute}`;
};
const gameKeys: Record<string, string> = {
  "স্মৃতি মিল": "memory_match",
  "স্মৃতি মেলাও": "memory_match",
  "ক্ৰম স্মৰণ": "sequence_recall",
  "ক্রম মনে রাখো": "sequence_recall",
  "বস্তু সজোৱা": "object_sorting",
  "জিনিস সাজাও": "object_sorting",
  "চাহ বাগিচা": "tea_garden_attention",
  "চা বাগান": "tea_garden_attention",
  "বিহু ছন্দ": "bihu_rhythm_recall",
  "ছন্দ মনে রাখো": "bihu_rhythm_recall",
  "দৈনন্দিন ক্ৰম": "daily_life_sequencing",
  "দৈনন্দিন ক্রম": "daily_life_sequencing",
  "চিনাকি ঠাই": "familiar_place_recall",
  "চেনা জায়গা": "familiar_place_recall",
  "memory match": "memory_match",
  "sequence recall": "sequence_recall",
  "object sorting": "object_sorting",
  "tea garden attention": "tea_garden_attention",
  "bihu rhythm recall": "bihu_rhythm_recall",
  "daily life sequencing": "daily_life_sequencing",
  "familiar place recall": "familiar_place_recall",
};
const distance = (a: string, b: string): number => {
  const row = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j] ?? j;
      row[j] = Math.min(
        old + 1,
        (row[j - 1] ?? j) + 1,
        prev + Number(a.charAt(i - 1) !== b.charAt(j - 1)),
      );
      prev = old;
    }
  }
  return row[b.length] ?? 0;
};
export const isLanguageSwitchRequest = (utterance: string): boolean =>
  /(?:भाषा|हिन्दी|हिंदी|अंग्रेज़ी|बंगाली|असमिया|स्पेनिश).*(?:बदल|करो)|(?:बदल).*(?:भाषा|हिन्दी|हिंदी)|(?:cambia|cambiar).*(?:idioma|español|inglés|hindi|bengalí|asamés)/u.test(normalize(utterance)) ||
  /(switch|change).*(language|bengali|assamese|english|hindi|telugu|manipuri|meitei|mizo)|(?:ভাষা|বাংলা|অসমীয়া|ইংৰাজী|ইংরেজি).*(?:সলনি|বদল)|(?:সলনি|বদল).*(?:ভাষা|বাংলা|অসমীয়া|ইংৰাজী|ইংরেজি)/u.test(
    normalize(utterance),
  );
export function route(
  utterance: string,
  _language: VoiceLanguage,
  context: FamilyContext = {},
): RoutedIntent | null {
  const text = normalize(utterance);
  const make = (
    intent: Intent,
    slots: Record<string, string> = {},
    confirm = false,
  ): RoutedIntent => ({ intent, slots, requiresConfirm: confirm });
  if (isLanguageSwitchRequest(text)) {
    if (context.languageLocked) return null;
    const choices: Array<[RegExp, VoiceLanguage]> = [
      [/(?:bengali|বাংলা|बंगाली|bengalí)/u, "bn"],
      [/(?:assamese|অসমীয়া|असमिया|asamés)/u, "as"],
      [/(?:hindi|हिन्दी|हिंदी)/u, "hi"],
      [/(?:telugu|తెలుగు)/u, "te"],
      [/(?:manipuri|meitei)/u, "mni"],
      [/(?:mizo)/u, "lus"],
      [/(?:english|ইংৰাজী|ইংরেজি|अंग्रेज़ी|inglés)/u, "en"],
    ];
    const selected = choices.find(([pattern]) => pattern.test(text));
    return selected ? make("switch_language", { language: selected[1] }) : null;
  }
  const nativeSections: Array<[RegExp, string]> = [
    [/(?:यादें|यादों|recuerdos)/u, "memories"],
    [/(?:दवा|दवाइयाँ|दवाइयां|medicamentos|medicinas)/u, "medicines"],
    [/(?:दिनचर्या|rutina)/u, "routine"],
    [/(?:खेल|juegos)/u, "games"],
    [/(?:शांति|calma)/u, "calm-time"],
    [/(?:परिवार|लोग|familia|personas)/u, "people"],
    [/(?:सेटिंग्स|ajustes|configuración)/u, "settings"],
    [/(?:प्रगति|progreso)/u, "progress"],
  ];
  const nativeSection = nativeSections.find(([pattern]) => pattern.test(text));
  if (nativeSection && /(?:खोल|दिखा|जाओ|abre|abrir|muestra|ir a)/u.test(text))
    return make("open_section", { section: nativeSection[1] });
  if (/(?:आपातकाल|emergencia)/u.test(text)) return make("sos", {}, true);
  if (/(?:मदद|उलझन|ayuda|confundido|confundida)/u.test(text)) return make("help");
  if (/(?:धीरे बोल|habla despacio|hablar despacio)/u.test(text)) return make("speak_slowly");
  if (/(?:सामान्य गति|सामान्य बोल|velocidad normal|habla normal)/u.test(text)) return make("speak_normally");
  if (/(?:पढ़|lee esto|leer esto)/u.test(text)) return make("read_this");
  if (/(?:अगला|आगे क्या|qué sigue|siguiente actividad|qué día|qué hora)/u.test(text)) return make("next_activity");
  if (/(?:दवा|दवाइयाँ|medicamentos|medicinas)/u.test(text)) return make("medicines_today");
  const nativeReminder = text.match(/(?:recuérdame|recuerdame) (?:que |a )?(.+?) a las ([0-9]{1,2}(?::[0-9]{2})?)/u)
    ?? text.match(/(.+?) (?:के लिए )?([0-9]{1,2}(?::[0-9]{2})?) बजे याद दिला/u);
  if (nativeReminder?.[1] && nativeReminder[2]) {
    const time = reminderTime(nativeReminder[2]);
    return time ? make("set_reminder", { title: nativeReminder[1], time }, true) : null;
  }
  const nativeCall = text.match(/(?:llama a|llamar a) (.+)|(.+?) (?:को (?:फ़ोन|फोन|कॉल) करो)/u);
  if (nativeCall) {
    const wanted = nativeCall[1] ?? nativeCall[2] ?? "";
    const person = context.familyMembers?.find((member) => normalize(member.name) === wanted || normalize(member.relationship ?? "") === wanted);
    if (person) return make("call_person", { name: person.name }, true);
  }
  if (/(?:खेल शुरू|खेलो|jugar|inicia un juego)/u.test(text)) return make("start_game");
  if (/^(help|i am confused|i m confused|সহায়|সাহায্য)/u.test(text))
    return make("help");
  if (/(emergency|need help now|জৰুৰী|জরুরি)/u.test(text))
    return make("sos", {}, true);
  if (/(speak slowly|ধীরে|লাহে)/u.test(text)) return make("speak_slowly");
  if (/(speak normally|normal speed)/u.test(text))
    return make("speak_normally");
  if (/(read this|পঢ়ি|পড়ে)/u.test(text)) return make("read_this");
  const section = text.match(
    /(?:open|show|go to) (?:my )?(memories|medicines|routine|games|calm time|people|settings)/u,
  );
  if (section?.[1])
    return make("open_section", { section: section[1].replace(" ", "-") });
  const regionalSection: Array<[RegExp, string]> = [
    [/(?:স্মৃতি|স্মৃতিবোৰ|মেমোরি)/u, "memories"],
    [/(?:ঔষধ|ওষুধ)/u, "medicines"],
    [/(?:খেলা|খেল|গেম)/u, "games"],
    [/(?:ছেটিংছ|সেটিংস)/u, "settings"],
  ];
  const requestedSection = regionalSection.find(([pattern]) =>
    pattern.test(text),
  );
  if (requestedSection && /(?:খোল|খুল|দেখ|যাও|যান)/u.test(text))
    return make("open_section", { section: requestedSection[1] });
  if (/(what.*medicine|my medicine|tablet|ঔষধ)/u.test(text))
    return make("medicines_today");
  if (/(what ?s next|what time|what day|পৰৱৰ্তী|পরবর্তী)/u.test(text))
    return make("next_activity");
  const reminder = text.match(
    /remind me to (.+?) at ([0-9]{1,2}(?::[0-9]{2})?)/u,
  );
  if (reminder?.[1] && reminder[2]) {
    const time = reminderTime(reminder[2]);
    return time
      ? make("set_reminder", { title: reminder[1], time }, true)
      : null;
  }
  const regionalReminder = text.match(
    /(?:মনত পেল|মনে কর).+? (.+?) (?:at|বজাত|টায়) ([0-9]{1,2}(?::[0-9]{2})?)/u,
  );
  if (regionalReminder?.[1] && regionalReminder[2]) {
    const time = reminderTime(regionalReminder[2]);
    return time
      ? make("set_reminder", { title: regionalReminder[1], time }, true)
      : null;
  }
  const namedGame = Object.entries(gameKeys).find(([name]) =>
    text.includes(name),
  );
  if (namedGame && /(?:play|start|খেল|খেলা|শুরু)/u.test(text))
    return make("start_game", { game: namedGame[1] });
  const call = text.match(
    /(?:call|phone|ফোন কৰক|ফোন কর|কল কৰক|কল কর) (?:my )?(.+)/u,
  );
  if (call?.[1]) {
    const wanted = call[1];
    const person = context.familyMembers?.find((p) =>
      [p.name, p.relationship ?? ""].some(
        (x) =>
          distance(normalize(x), wanted) / Math.max(x.length, wanted.length) <=
          0.3,
      ),
    );
    if (person) return make("call_person", { name: person.name }, true);
  }
  const game = text.match(
    /(?:play|start|খেল|খেলা) (?:a |the )?(.*?)(?: game)?$/u,
  );
  if (game)
    return make(
      "start_game",
      gameKeys[game[1] ?? ""] ? { game: gameKeys[game[1] ?? ""]! } : {},
    );
  return null;
}
