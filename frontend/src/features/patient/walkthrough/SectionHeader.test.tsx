import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SectionHeader } from "./SectionHeader";
const meta = vi.hoisted(() => new Map<string, string>());
vi.mock("../../../db/schema", () => ({
  getMeta: (key: string) => Promise.resolve(meta.get(key)),
  setMeta: (key: string, value: string) => {
    meta.set(key, value);
    return Promise.resolve();
  },
}));
it("shows once and can replay instructions", async () => {
  meta.clear();
  const view = render(<SectionHeader section="memories" />);
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByText("walkthrough.gotIt"));
  view.unmount();
  render(<SectionHeader section="memories" />);
  await waitFor(() =>
    expect(meta.get("walkthroughSeen")).toContain("memories"),
  );
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByText("walkthrough.replay"));
  expect(screen.getByRole("dialog")).toBeTruthy();
});
