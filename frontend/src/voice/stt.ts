export type VoiceLanguage = "en" | "as" | "bn";
export const recognitionLocale = (language: VoiceLanguage): string => ({ en: "en-IN", as: "as-IN", bn: "bn-IN" })[language];
export interface SpeechToText { start(onResult: (text: string) => void, onEnd?: () => void): void; stop(): void; }
type Recognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; start(): void; stop(): void };
export class BrowserSpeechToText implements SpeechToText {
  private recognition?: Recognition; private timer?: number;
  constructor(private language: VoiceLanguage) {}
  start(onResult: (text: string) => void, onEnd?: () => void): void {
    const Ctor = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!Ctor) { onEnd?.(); return; }
    const recognition = new Ctor(); this.recognition = recognition; recognition.lang = recognitionLocale(this.language); recognition.interimResults = false; recognition.continuous = false;
    const reset = () => { if (this.timer) window.clearTimeout(this.timer); this.timer = window.setTimeout(() => this.stop(), 6000); };
    recognition.onresult = (event) => { const text = event.results[0]?.[0]?.transcript ?? ""; if (text) onResult(text); reset(); };
    recognition.onend = () => { if (this.timer) window.clearTimeout(this.timer); onEnd?.(); }; recognition.start(); reset();
  }
  stop(): void { if (this.timer) window.clearTimeout(this.timer); this.recognition?.stop(); this.recognition = undefined; }
}
export class FakeSpeechToText implements SpeechToText { active = false; constructor(private text = "") {} start(onResult: (text: string) => void, onEnd?: () => void): void { this.active = true; if (this.text) onResult(this.text); onEnd?.(); } stop(): void { this.active = false; } }
