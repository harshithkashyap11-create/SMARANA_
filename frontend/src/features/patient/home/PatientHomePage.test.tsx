import { screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { Orientation, PatientRepository } from "../../../db/repo/patient";
import { renderWithProviders } from "../../../test/utils";
import { PatientHomePage } from "./PatientHomePage";

const base: Orientation = {
  greeting_key: "morning",
  day: "Saturday",
  date: "September 12, 2026",
  time: "9:00 AM",
  home_label: "Guwahati home",
  next_activity: {
    id: "r1",
    title: "Morning tea",
    scheduled_for: "2026-09-12T10:00:00+05:30",
  },
  family_member: {
    id: "f1",
    name: "Mina",
    relationship: "Daughter",
    photo_url: "/media/mina.jpg",
  },
};

function renderHome(orientation: Orientation) {
  const patient: PatientRepository = {
    getOrientation: () => Promise.resolve(orientation),
  };
  return renderWithProviders(<PatientHomePage />, { repos: { patient } });
}

test("renders the next activity, family photo, and eight ordered tiles", async () => {
  renderHome(base);
  expect(await screen.findByText("Morning tea")).toBeVisible();
  expect(screen.getByRole("img", { name: "Mina" })).toBeVisible();
  expect(
    screen.getAllByRole("button").map((button) => button.textContent),
  ).toEqual([
    "◈Games",
    "✚Medicines",
    "☾Sleep",
    "▧Memories",
    "≈Calm",
    "♧My people",
    "★Progress",
    "☑Today's routine",
  ]);
});

test("uses friendly copy when there is no next activity", async () => {
  renderHome({ ...base, next_activity: null });
  expect(
    await screen.findByText("Nothing planned right now. Enjoy your day."),
  ).toBeVisible();
});
