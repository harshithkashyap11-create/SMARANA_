import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { expect, it, vi } from "vitest";

import { i18n } from "../shared/i18n";
import SequenceRecall from "../games/integrated/sequence_recall/SequenceRecall.jsx";
import { FakeTextToSpeech } from "./tts";
import { performAction, type ActionContext } from "./actions";
import { route } from "./router";
import { parseReminderRequest } from "./reminderParser";

it.each([
  ["End game", "stop_game"],
  ["Quit game", "stop_game"],
  ["What's my schedule?", "get_schedule"],
  ["What reminders do I have?", "get_reminders"],
  ["Repeat instructions", "repeat_instructions"],
  ["Give me a hint", "request_hint"],
  ["Go home", "open_section"],
  ["Open dashboard", "open_section"],
])("routes required demo command %s", (text, intent) => {
  expect(route(text, "en")?.intent).toBe(intent);
});

it("recognizes find objects via the shared registry", () => {
  expect(route("play find objects", "en")).toMatchObject({
    intent: "start_game",
    slots: { game: "visual_search" },
  });
});

it("parses a browser transcription with punctuated meridiem", () => {
  expect(
    parseReminderRequest("Remind me to call my daughter at 7 p.m."),
  ).toMatchObject({
    kind: "draft",
    draft: { time: "19:00", title: "call my daughter" },
  });
});

function context(): ActionContext {
  return {
    navigate: vi.fn(),
    tts: new FakeTextToSpeech(),
    patientId: "patient-test",
    confirm: vi.fn(),
    routine: {
      getToday: vi.fn().mockResolvedValue([]),
      getMedications: vi.fn(),
      respond: vi.fn(),
    },
  };
}

it("voice repeats the real game's instructions and activates its actual hint", async () => {
  const transport = {
    submitRound: vi.fn(),
    submitSession: vi.fn(),
    pendingCount: 0,
  };
  render(
    <I18nextProvider i18n={i18n}>
      <main>
        <SequenceRecall difficulty={1} onExit={vi.fn()} onSessionEnd={vi.fn()} rng={() => 0.4} ddaClient={transport} />
      </main>
    </I18nextProvider>,
  );
  const action = context();
  await performAction(route("Repeat instructions", "en")!, action);
  expect((action.tts as FakeTextToSpeech).spoken[0]?.text).toBe(
    i18n.t("games.sequenceRecall.instructions"),
  );
  await performAction(route("Give me a hint", "en")!, action);
  expect((action.tts as FakeTextToSpeech).spoken.at(-1)?.text).toBe(
    i18n.t("voice.hintUnavailable"),
  );
  fireEvent.click(
    screen.getByRole("button", { name: i18n.t("games.common.startRound") }),
  );
  await waitFor(
    () =>
      expect(
        screen.getByRole("button", { name: i18n.t("games.common.hint") }),
      ).toBeEnabled(),
    { timeout: 12_000 },
  );
  await act(async () => {
    await performAction(route("Give me a hint", "en")!, action);
  });
  expect(document.querySelector(".sm-tile--hint")).not.toBeNull();
  const hint = screen.getByRole("button", {
    name: i18n.t("games.common.hint"),
  });
  for (
    let index = 0;
    index < 5 && !(hint as HTMLButtonElement).disabled;
    index++
  ) {
    await act(async () => {
      await performAction(route("Give me a hint", "en")!, action);
    });
  }
  expect(hint).toBeDisabled();
  await performAction(route("Give me a hint", "en")!, action);
  expect((action.tts as FakeTextToSpeech).spoken.at(-1)?.text).toBe(
    i18n.t("voice.hintUnavailable"),
  );
}, 15_000);

it("reads today's stored reminders and opens the real routine page", async () => {
  const action = context();
  vi.mocked(action.routine.getToday).mockResolvedValue([
    { id: "one", title: "Call daughter" },
  ] as never);
  await performAction(route("What reminders do I have?", "en")!, action);
  expect(action.navigate).toHaveBeenCalledWith("/patient/routine");
  expect((action.tts as FakeTextToSpeech).spoken[0]?.text).toBe(
    "Call daughter",
  );
});
