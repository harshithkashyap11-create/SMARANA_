import { afterEach, expect, test, vi } from "vitest";
import { caregiverApi } from "./api";

afterEach(() => vi.unstubAllGlobals());

test("patient selector reads all paginated assignments through the API proxy", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [{ id: "one" }],
          next: "http://backend:8000/api/v1/patients/?page=2",
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ results: [{ id: "two" }], next: null }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", fetch);
  expect(await caregiverApi.patients()).toEqual([{ id: "one" }, { id: "two" }]);
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    "/api/v1/patients/",
    expect.anything(),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    "/api/v1/patients/?page=2",
    expect.anything(),
  );
});
