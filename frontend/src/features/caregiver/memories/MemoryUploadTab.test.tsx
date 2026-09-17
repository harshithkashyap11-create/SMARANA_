import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../test/utils";
import { MemoryUploadTab } from "./MemoryUploadTab";

const compressPhotos = vi.hoisted(() =>
  vi.fn((files: File[]) => Promise.resolve(files)),
);
vi.mock("./compression", () => ({ compressMemoryPhotos: compressPhotos }));
afterEach(() => vi.unstubAllGlobals());

test("compresses photos and sends tagged people ids", async () => {
  const requests: Array<{ url: string; body?: BodyInit | null }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      requests.push({ url, body: init?.body });
      if (url.endsWith("/family/"))
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: "person-1", name: "Priya", relationship: "Daughter" },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      if (url.endsWith("/memories/"))
        return Promise.resolve(
          new Response(JSON.stringify({ id: "memory-1", title: "Birthday" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }),
        );
      return Promise.resolve(
        new Response(JSON.stringify({ id: "media-1" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }),
  );
  renderWithProviders(<MemoryUploadTab patientId="patient-1" />);
  await screen.findByText("Priya · Daughter");
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Birthday" },
  });
  fireEvent.change(screen.getByLabelText("Short story"), {
    target: { value: "A happy afternoon" },
  });
  fireEvent.click(screen.getByLabelText(/Priya/));
  const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText(/Photos/), {
    target: { files: [file] },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Save memory" }).closest("form")!,
  );
  expect(
    await screen.findByText("Memory saved. It is ready to revisit."),
  ).toBeVisible();
  expect(compressPhotos).toHaveBeenCalledWith([file]);
  const create = requests.find((item) => item.url.endsWith("/memories/"));
  expect(create?.body).toBeInstanceOf(FormData);
  expect((create?.body as FormData).getAll("people")).toEqual(["person-1"]);
  await waitFor(() =>
    expect(requests.some((item) => item.url.endsWith("/media/"))).toBe(true),
  );
});
