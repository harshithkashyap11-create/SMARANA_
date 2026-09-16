export type VoiceLanguage = "en" | "as" | "bn";
export const recognitionLocale = (language: VoiceLanguage): string => ({ en: "en-IN", as: "as-IN", bn: "bn-IN" })[language];
export interface SpeechToText { start(onResult: (text: string) => void, onEnd?: () => void): void; stop(): void; }
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};

/** Assamese recognition is not consistently available in browser engines. */
const fallbackRecognitionLocale = (language: VoiceLanguage): string | undefined =>
  language === "as" ? "bn-IN" : undefined;

export class BrowserSpeechToText implements SpeechToText {
  private recognition?: Recognition;
  private timer?: number;
  private triedFallback = false;

  constructor(private language: VoiceLanguage) {}

  start(onResult: (text: string) => void, onEnd?: () => void): void {
    const browser = window as unknown as {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const Ctor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Ctor) {
      onEnd?.();
      return;
    }

    const begin = (locale: string): void => {
      const recognition = new Ctor();
      this.recognition = recognition;
      recognition.lang = locale;
      recognition.interimResults = false;
      recognition.continuous = false;
      const resetSilenceTimer = (): void => {
        this.clearTimer();
        this.timer = window.setTimeout(() => this.stop(), 6_000);
      };
      recognition.onresult = (event) => {
        const text = event.results[0]?.[0]?.transcript ?? "";
        if (text) onResult(text);
        resetSilenceTimer();
      };
      recognition.onerror = (event) => {
        const fallback = fallbackRecognitionLocale(this.language);
        if (!this.triedFallback && fallback && event.error === "language-not-supported") {
          this.triedFallback = true;
          this.clearTimer();
          begin(fallback);
        }
      };
      recognition.onend = () => {
        this.clearTimer();
        if (this.recognition === recognition) onEnd?.();
      };
      recognition.start();
      resetSilenceTimer();
    };

    this.triedFallback = false;
    begin(recognitionLocale(this.language));
  }

  stop(): void {
    this.clearTimer();
    this.recognition?.stop();
    this.recognition = undefined;
  }

  private clearTimer(): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
  }
}
export class FakeSpeechToText implements SpeechToText {
  active = false;
  private onResult?: (text: string) => void;
  private onEnd?: () => void;

  constructor(private text = "") {}

  start(onResult: (text: string) => void, onEnd?: () => void): void {
    this.active = true;
    this.onResult = onResult;
    this.onEnd = onEnd;
    if (this.text) onResult(this.text);
  }

  emit(text: string): void {
    if (this.active) this.onResult?.(text);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.onEnd?.();
  }
}
