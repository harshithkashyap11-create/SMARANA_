import { afterEach, expect, test, vi } from "vitest";

import { apiClient, setApiAccessToken, setApiRefreshHandler } from "./client";

afterEach(() => {
  setApiAccessToken(null);
  setApiRefreshHandler(null);
  vi.unstubAllGlobals();
});

test("adds the bearer token when an access token is available", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  setApiAccessToken("access-token");

  await apiClient("/api/v1/health/", { method: "GET" });

  const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect(new Headers(options.headers).get("Authorization")).toBe(
    "Bearer access-token",
  );
});

test("does not send an authorization header without a token", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await apiClient("/api/v1/health/", { method: "GET" });

  const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect(new Headers(options.headers).has("Authorization")).toBe(false);
});

test("refreshes once and retries an unauthorized request", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  setApiRefreshHandler(vi.fn().mockResolvedValue("refreshed-token"));

  await apiClient("/api/v1/health/", { method: "GET" });

  expect(fetchMock).toHaveBeenCalledTimes(2);
  const retryOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
  expect(new Headers(retryOptions.headers).get("Authorization")).toBe(
    "Bearer refreshed-token",
  );
});
