import type { PaginatedResponse } from "@/types";

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: Record<string, unknown>,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function clientFetch<T>(
  path: string,
  options: FetchOptions = {},
  retried = false
): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options;

  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };

  const res = await fetch(url.toString(), {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return clientFetch<T>(path, options, true);
    }
    window.location.href = "/login";
    throw new ApiError(401, {}, "Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err, res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string, params?: FetchOptions["params"]) =>
    clientFetch<T>(`/api/v1/${path}`, { method: "GET", params }),

  post: <T>(path: string, body?: unknown) =>
    clientFetch<T>(`/api/v1/${path}`, { method: "POST", body }),

  patch: <T>(path: string, body?: unknown) =>
    clientFetch<T>(`/api/v1/${path}`, { method: "PATCH", body }),

  delete: <T = void>(path: string, body?: unknown) =>
    clientFetch<T>(`/api/v1/${path}`, { method: "DELETE", body }),

  paginate: <T>(path: string, limit = 10, offset = 0, extra?: FetchOptions["params"]) =>
    clientFetch<PaginatedResponse<T>>(`/api/v1/${path}`, {
      method: "GET",
      params: { limit, offset, ...extra },
    }),

};
