export type ErrorType<Error> = Error;
export type BodyType<BodyData> = BodyData;

type RefreshAccessToken = () => Promise<string | null>;

export type ApiClientOptions = RequestInit & {
  skipAuthRefresh?: boolean;
};

let accessToken: string | null = null;
let refreshAccessToken: RefreshAccessToken | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request returned ${status}`);
    this.name = "ApiError";
  }
}

export function setApiAccessToken(token: string | null): void {
  accessToken = token;
}

export function setApiRefreshHandler(handler: RefreshAccessToken | null): void {
  refreshAccessToken = handler;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type");
  return contentType?.includes("application/json")
    ? response.json()
    : response.text();
}

async function request<T>(
  url: string,
  options: ApiClientOptions,
  canRefresh: boolean,
): Promise<T> {
  const fetchOptions = { ...options };
  delete fetchOptions.skipAuthRefresh;
  const headers = new Headers(fetchOptions.headers);
  headers.set("Accept", "application/json");
  if (typeof fetchOptions.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(url, { ...fetchOptions, headers });

  if (response.status === 401 && canRefresh && refreshAccessToken) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      accessToken = refreshedToken;
      return request<T>(url, options, false);
    }
  }

  const body = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  return body as T;
}

export function apiClient<T>(
  url: string,
  options: ApiClientOptions,
): Promise<T> {
  return request<T>(url, options, options.skipAuthRefresh !== true);
}
