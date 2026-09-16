import { useCalmStore } from "../features/patient/confused/store";
import type { VoiceLanguage } from "./stt";
export interface TextToSpeech {
  speak(text: string, options?: { slow?: boolean }): Promise<void>;
  cancel(): void;
}
const voiceFallbacks: Record<VoiceLanguage, readonly string[]> = {
  en: ["en-IN", "en"],
  as: ["as-IN", "as", "bn-IN", "bn"],
  bn: ["bn-IN", "bn"],
};

export class BrowserTextToSpeech implements TextToSpeech {
  constructor(
    private language: VoiceLanguage,
    private slow = false,
  ) {}
  async speak(text: string, options: { slow?: boolean } = {}): Promise<void> {
    this.cancel();
    const locale = ({ en: "en-IN", as: "as-IN", bn: "bn-IN" } as const)[
      this.language
    ];
    const voices = speechSynthesis.getVoices();
    const voice = voiceFallbacks[this.language]
      .map(
        (candidate) =>
          voices.find(
            (item) => item.lang.toLowerCase() === candidate.toLowerCase(),
          ) ??
          voices.find((item) =>
            item.lang.toLowerCase().startsWith(`${candidate.toLowerCase()}-`),
          ),
      )
      .find((item): item is SpeechSynthesisVoice => item !== undefined);
    const sentences = text.split(/(?<=[.।])\s*/).filter(Boolean);
    const isSlow =
      useCalmStore.getState().calmMode || (options.slow ?? this.slow);
    for (const [index, sentence] of sentences.entries()) {
      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.lang = locale;
        utterance.voice = voice ?? null;
        utterance.rate = isSlow ? 0.7 : 0.95;
        utterance.pitch = 1;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        speechSynthesis.speak(utterance);
      });
      if (isSlow && index < sentences.length - 1) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
      }
    }
  }
  cancel(): void {
    speechSynthesis.cancel();
  }
}
export class FakeTextToSpeech implements TextToSpeech {
  spoken: Array<{ text: string; slow: boolean }> = [];
  speak(text: string, options: { slow?: boolean } = {}): Promise<void> {
    this.spoken.push({ text, slow: Boolean(options.slow) });
    return Promise.resolve();
  }
  cancel(): void {}
}
