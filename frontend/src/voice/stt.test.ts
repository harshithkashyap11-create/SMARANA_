import { afterEach, describe, expect, it, vi } from "vitest";

import { BrowserSpeechToText, FakeSpeechToText } from "./stt";

class RecognitionFake {
  static instances: RecognitionFake[] = [];
  lang = "";
  interimResults = true;
  continuous = true;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void)
    | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    RecognitionFake.instances.push(this);
  }
}

afterEach(() => {
  RecognitionFake.instances = [];
  vi.useRealTimers();
  delete (window as unknown as { SpeechRecognition?: unknown })
    .SpeechRecognition;
});

describe("BrowserSpeechToText", () => {
  it("provides a controllable fake lifecycle for UI tests", () => {
    const speech = new FakeSpeechToText();
    const onResult = vi.fn();
    const onEnd = vi.fn();

    speech.start(onResult, onEnd);
    speech.emit("open memories");
    speech.stop();

    expect(onResult).toHaveBeenCalledWith("open memories");
    expect(onEnd).toHaveBeenCalledOnce();
    expect(speech.active).toBe(false);
  });

  it("starts with final-only results and stops after six seconds of silence", () => {
    vi.useFakeTimers();
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
      RecognitionFake;
    const speech = new BrowserSpeechToText("en");
    const onEnd = vi.fn();

    speech.start(vi.fn(), onEnd);

    const recognition = RecognitionFake.instances[0]!;
    expect(recognition).toMatchObject({
      lang: "en-IN",
      interimResults: false,
      continuous: false,
    });
    vi.advanceTimersByTime(6_000);
    expect(recognition.stop).toHaveBeenCalledOnce();
    recognition.onend?.();
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("retries Assamese with Bengali when the browser rejects its locale", () => {
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
      RecognitionFake;
    const speech = new BrowserSpeechToText("as");

    vi.useFakeTimers();
    const onEnd = vi.fn();
    speech.start(vi.fn(), onEnd);
    RecognitionFake.instances[0]!.onerror?.({
      error: "language-not-supported",
    });
    RecognitionFake.instances[0]!.onend?.();

    expect(RecognitionFake.instances).toHaveLength(2);
    expect(RecognitionFake.instances[1]!.lang).toBe("bn-IN");
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(6_000);
    expect(RecognitionFake.instances[1]!.stop).toHaveBeenCalledOnce();
  });
});

it("reports missing recognition and denied microphone access", () => {
  const error = vi.fn();
  const end = vi.fn();
  new BrowserSpeechToText("hi").start(vi.fn(), end, error);
  expect(error).toHaveBeenCalledWith("unsupported");
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = RecognitionFake;
  const speech = new BrowserSpeechToText("te");
  speech.start(vi.fn(), end, error);
  const recognition = RecognitionFake.instances[0]!;
  expect(recognition.lang).toBe("te-IN");
  recognition.onerror?.({ error: "not-allowed" });
  expect(error).toHaveBeenCalledWith("not-allowed");
  expect(end).toHaveBeenCalledTimes(2);
});
