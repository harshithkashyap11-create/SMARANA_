/** One shared lease for both typed and recognized input. Supersession aborts it. */
export interface VoiceTurn {
  id: number;
  signal: AbortSignal;
  isActive: () => boolean;
  assertActive: () => void;
  wait: <T>(work: Promise<T>) => Promise<T>;
}

export class TurnManager {
  private sequence = 0;
  private controller?: AbortController;
  cancel(): void {
    this.controller?.abort();
    this.controller = undefined;
  }
  begin(): VoiceTurn {
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;
    const id = ++this.sequence;
    const isActive = () =>
      this.controller === controller && !controller.signal.aborted;
    const assertActive = () => {
      if (!isActive()) throw new DOMException("Turn cancelled", "AbortError");
    };
    return {
      id,
      signal: controller.signal,
      isActive,
      assertActive,
      wait: <T>(work: Promise<T>) =>
        new Promise<T>((resolve, reject) => {
          const abort = () =>
            reject(new DOMException("Turn cancelled", "AbortError"));
          controller.signal.addEventListener("abort", abort, { once: true });
          // Always attach rejection handlers, including when already cancelled.
          work.then(
            (value) => {
              controller.signal.removeEventListener("abort", abort);
              if (isActive()) resolve(value);
              else abort();
            },
            (error: unknown) => {
              controller.signal.removeEventListener("abort", abort);
              reject(
                error instanceof Error ? error : new Error("Request failed"),
              );
            },
          );
          if (!isActive()) abort();
        }),
    };
  }
}
