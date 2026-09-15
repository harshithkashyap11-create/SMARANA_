import type { VoiceLanguage } from "./stt";
export interface TextToSpeech { speak(text: string, options?: { slow?: boolean }): Promise<void>; cancel(): void; }
export class BrowserTextToSpeech implements TextToSpeech {
  constructor(private language: VoiceLanguage) {}
  async speak(text: string, options: { slow?: boolean } = {}): Promise<void> {
    this.cancel(); const locale = ({ en: "en-IN", as: "as-IN", bn: "bn-IN" } as const)[this.language];
    const voice = speechSynthesis.getVoices().find((item) => item.lang.toLowerCase() === locale.toLowerCase()) ?? speechSynthesis.getVoices().find((item) => item.lang.startsWith(locale.slice(0, 2)));
    const sentences = text.split(/(?<=[.।])\s*/).filter(Boolean);
    for (const sentence of sentences) await new Promise<void>((resolve) => { const utterance = new SpeechSynthesisUtterance(sentence); utterance.lang = locale; utterance.voice = voice ?? null; utterance.rate = options.slow ? 0.7 : 0.95; utterance.pitch = 1; utterance.onend = () => resolve(); utterance.onerror = () => resolve(); speechSynthesis.speak(utterance); });
  }
  cancel(): void { speechSynthesis.cancel(); }
}
export class FakeTextToSpeech implements TextToSpeech { spoken: Array<{ text: string; slow: boolean }> = []; speak(text: string, options: { slow?: boolean } = {}): Promise<void> { this.spoken.push({ text, slow: Boolean(options.slow) }); return Promise.resolve(); } cancel(): void {} }
