import type { SpeechToText } from "./stt";
export type VoiceState = "idle" | "listening" | "processing" | "speaking";

/** One turn at a time. The handler must await speech and any confirmation. */
export class VoiceLoop {
  private active = false;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  isRunning(): boolean {
    return this.active;
  }
  constructor(
    private stt: SpeechToText,
    private handle: (text: string) => Promise<void>,
    private state: (state: VoiceState) => void,
    private error: (code: string) => void,
  ) {}
  start(): void {
    this.stop();
    this.active = true;
    this.listen(this.generation);
  }
  stop(): void {
    this.active = false;
    this.generation++;
    clearTimeout(this.timer);
    this.stt.stop();
    this.state("idle");
  }
  private listen(generation: number): void {
    if (!this.active || generation !== this.generation) return;
    // Includes the existing second SOS confirmation and other modal UI.
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
      this.state("processing");
      this.schedule(generation);
      return;
    }
    if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) {
      this.state("speaking");
      this.schedule(generation);
      return;
    }
    let received = false;
    this.state("listening");
    this.stt.start(
      (text) => {
        if (
          received ||
          !text.trim() ||
          !this.active ||
          generation !== this.generation
        )
          return;
        received = true;
        this.stt.stop();
        if (
          /^(?:(?:hey )?sm[aā]rana[, ]*)?(?:stop listening|goodbye|exit|quit)[.!]?$/i.test(
            text.trim(),
          )
        ) {
          this.stop();
          return;
        }
        this.state("processing");
        void this.handle(text.trim())
          .catch(() => this.error("processing-failed"))
          .finally(() => this.schedule(generation));
      },
      () => {
        if (!received) this.schedule(generation);
      },
      (code) => {
        if (
          [
            "unsupported",
            "start-failed",
            "not-allowed",
            "service-not-allowed",
            "audio-capture",
            "language-not-supported",
          ].includes(code)
        )
          this.stop();
        if (code !== "no-speech" && code !== "aborted") this.error(code);
      },
    );
  }
  private schedule(generation: number): void {
    if (!this.active || generation !== this.generation) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.listen(generation), 700);
  }
}
