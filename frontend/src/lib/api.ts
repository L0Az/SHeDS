import { cookies } from "next/headers";
import type { PaginatedResponse } from "@/types";

const DJANGO_INTERNAL_URL =
  process.env.DJANGO_INTERNAL_URL ?? "http://localhost:9000";

async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get("access_token")?.value;
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

function withTrailingSlash(path: string): string {
  const [base, query] = path.split("?");
  const slashed = base.endsWith("/") ? base : `${base}/`;
  return query !== undefined ? `${slashed}?${query}` : slashed;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = await getAccessToken();
  const { body, params, headers: extraHeaders, ...rest } = options;

  const url = new URL(`${DJANGO_INTERNAL_URL}/v1${withTrailingSlash(path)}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(res.statusText), { status: res.status, data: err });
  }

  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

export const serverApi = {
  get: <T>(path: string, params?: FetchOptions["params"]) =>
    apiFetch<T>(path, { method: "GET", params }),

  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),

  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),

  delete: <T = void>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "DELETE", body }),

  paginate: <T>(path: string, limit = 10, offset = 0, extra?: FetchOptions["params"]) =>
    apiFetch<PaginatedResponse<T>>(path, {
      method: "GET",
      params: { limit, offset, ...extra },
    }),
};
