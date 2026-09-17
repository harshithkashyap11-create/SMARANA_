import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../test/utils";
import { CalmPage } from "./CalmPage";
const spoken = vi.hoisted(() => vi.fn());
vi.mock("../../../shared/hooks/useTts", () => ({speak: spoken}));
afterEach(() => {vi.useRealTimers(); vi.unstubAllGlobals(); spoken.mockClear();});
test("speaks ordered cues, respects reduced motion, and stops", async () => {
 vi.useFakeTimers(); vi.stubGlobal("matchMedia", () => ({matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn()}));
 const {container} = renderWithProviders(<CalmPage />);
 fireEvent.click(screen.getByRole("button", {name: "Start"}));
 expect(spoken).toHaveBeenLastCalledWith("Breathe in", expect.objectContaining({rate: .7}));
 await act(() => vi.advanceTimersByTime(4000)); expect(spoken).toHaveBeenLastCalledWith("Rest gently", expect.anything());
 await act(() => vi.advanceTimersByTime(4000)); expect(spoken).toHaveBeenLastCalledWith("Breathe out", expect.anything());
 expect(container.querySelector('[aria-hidden="true"]')?.getAttribute("style")).toBeNull();
 fireEvent.click(screen.getByRole("button", {name: "Stop"}));
 await act(() => vi.advanceTimersByTime(10000)); expect(spoken).toHaveBeenCalledTimes(3);
});
