import { afterEach, expect, test, vi } from "vitest";

import { apiClient, setApiAccessToken, setApiRefreshHandler } from "./client";

afterEach(() => {
  setApiAccessToken(null);
  setApiRefreshHandler(null);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("marks string request bodies as JSON for the backend parser", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  await apiClient("/api/v1/sync/push/", {
    method: "POST",
    body: JSON.stringify({ items: [] }),
  });
  const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect(new Headers(options.headers).get("Content-Type")).toBe(
    "application/json",
  );
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

test("downloads PDFs as blobs and retains authorization after refresh", async () => {
  const pdf = "%PDF-1.7 binary report";
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(
      new Response(pdf, {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  setApiAccessToken("expired");
  setApiRefreshHandler(vi.fn().mockResolvedValue("fresh"));
  const result = await apiClient<Blob>("/api/v1/patients/p/report/", {
    method: "GET",
    responseType: "blob",
  });
  expect(result.type).toBe("application/pdf");
  expect(await result.text()).toBe(pdf);
  const options = fetchMock.mock.calls[1]?.[1] as RequestInit;
  expect(new Headers(options.headers).get("Authorization")).toBe(
    "Bearer fresh",
  );
  expect(options).not.toHaveProperty("responseType");
});

test("aborts a stalled request and removes its timeout after a successful retry", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn(
    (_url: string, options: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        options.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Timed out", "AbortError")),
          { once: true },
        );
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const stalled = apiClient("/api/v1/patients/", {
    method: "GET",
    timeoutMs: 100,
  });
  const rejected = expect(stalled).rejects.toMatchObject({
    name: "AbortError",
  });
  await vi.advanceTimersByTimeAsync(100);
  await rejected;
  expect(fetchMock.mock.calls[0]![1]).not.toHaveProperty("timeoutMs");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  await apiClient("/api/v1/patients/", { method: "GET" });
  expect(vi.getTimerCount()).toBe(0);
});

test("propagates caller cancellation to the active request", async () => {
  const controller = new AbortController();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Cancelled", "AbortError")),
            { once: true },
          );
        }),
    ),
  );
  const request = apiClient("/api/v1/patients/", {
    method: "GET",
    signal: controller.signal,
  });
  controller.abort();
  await expect(request).rejects.toMatchObject({ name: "AbortError" });
});
