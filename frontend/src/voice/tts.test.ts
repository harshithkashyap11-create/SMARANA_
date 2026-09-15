import { expect, it } from "vitest";
import { FakeTextToSpeech } from "./tts";
it("applies the slow speech preference", async () => { const speech = new FakeTextToSpeech(); await speech.speak("Hello", { slow: true }); expect(speech.spoken).toEqual([{ text: "Hello", slow: true }]); });
