import { afterEach, expect, it, vi } from "vitest";
import { BrowserTextToSpeech, FakeTextToSpeech } from "./tts";

afterEach(() => vi.unstubAllGlobals());

it("returns safely when speech playback is unavailable", async () => {
  vi.stubGlobal("speechSynthesis", undefined);
  await expect(
    new BrowserTextToSpeech("hi").speak("नमस्ते"),
  ).resolves.toBeUndefined();
});

it("cancels an unfinished sentence without speaking the rest", async () => {
  const synthesis = { cancel: vi.fn(), getVoices: () => [], speak: vi.fn() };
  vi.stubGlobal("speechSynthesis", synthesis);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  const tts = new BrowserTextToSpeech("te");
  const speaking = tts.speak("Hola. Otra frase.");
  tts.cancel();
  await speaking;
  expect(synthesis.speak).toHaveBeenCalledTimes(1);
});

it("applies the slow speech preference", async () => {
  const speech = new FakeTextToSpeech();
  await speech.speak("Hello", { slow: true });
  expect(speech.spoken).toEqual([{ text: "Hello", slow: true }]);
});

it("replacing active speech cancels old utterances and completes both promises", async () => {
  const utterances: Array<{ onend?: () => void }> = [];
  const synthesis = {
    cancel: vi.fn(),
    getVoices: () => [],
    speak: vi.fn((utterance: { onend?: () => void }) =>
      utterances.push(utterance),
    ),
  };
  vi.stubGlobal("speechSynthesis", synthesis);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  const tts = new BrowserTextToSpeech("en");
  const first = tts.speak("First. More.");
  const second = tts.speak("Second.");
  utterances[1]?.onend?.();
  await Promise.all([first, second]);
  expect(synthesis.speak).toHaveBeenCalledTimes(2);
});
it("hung playback is cancelled by the watchdog", async () => {
  vi.useFakeTimers();
  const synthesis = { cancel: vi.fn(), getVoices: () => [], speak: vi.fn() };
  vi.stubGlobal("speechSynthesis", synthesis);
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
  try {
    const pending = new BrowserTextToSpeech("en").speak("Hi.");
    await vi.advanceTimersByTimeAsync(10000);
    await pending;
    expect(synthesis.cancel).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});
it("missing voices and provider voice enumeration errors do not trap the turn", async () => {
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    getVoices: () => {
      throw new Error("voices");
    },
    speak: vi.fn(),
  });
  vi.stubGlobal("SpeechSynthesisUtterance", class {});
  await expect(
    new BrowserTextToSpeech("en").speak("Hi."),
  ).resolves.toBeUndefined();
});
