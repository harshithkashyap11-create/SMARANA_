import { afterEach, expect, it, vi } from "vitest";
import { BrowserTextToSpeech, FakeTextToSpeech } from "./tts";

afterEach(() => vi.unstubAllGlobals());

it("returns safely when speech playback is unavailable", async () => {
  vi.stubGlobal("speechSynthesis", undefined);
  await expect(new BrowserTextToSpeech("hi").speak("नमस्ते")).resolves.toBeUndefined();
});

it("cancels an unfinished sentence without speaking the rest", async () => {
  const synthesis = { cancel: vi.fn(), getVoices: () => [], speak: vi.fn() };
  vi.stubGlobal("speechSynthesis", synthesis);
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
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
