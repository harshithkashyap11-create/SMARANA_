import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { i18n } from "../../../shared/i18n";
import { MemoryDetailPage } from "./MemoryDetailPage";

const speak = vi.fn();
const getMemory = vi.fn<(id: string) => Promise<undefined>>();
vi.mock("../../../db/repo/memories", () => ({ memoriesRepository: { get: (id: string) => getMemory(id) } }));
vi.mock("../../../shared/hooks/useTts", () => ({ useTts: () => speak }));

beforeEach(() => speak.mockClear());

it("reads the memory summary aloud", () => {
  const memory = { id: "m1", patientId: "p1", title: "Tea garden", occasion: "trip", occurredOn: null, place: "", summary: "A lovely afternoon together.", people: [], media: [] };
  render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={[{ pathname: "/memory", state: memory }]}><Routes><Route path="/memory" element={<MemoryDetailPage />} /></Routes></MemoryRouter></I18nextProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Read to me" }));
  expect(speak).toHaveBeenCalledWith(memory.summary);
});


it("finishes loading when a memory no longer exists", async () => {
  getMemory.mockResolvedValueOnce(undefined);
  render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={["/memories/missing"]}><Routes><Route path="/memories/:memoryId" element={<MemoryDetailPage />} /></Routes></MemoryRouter></I18nextProvider>);
  expect(await screen.findByText("Nothing here yet. Priya can add this for you.")).toBeVisible();
});
