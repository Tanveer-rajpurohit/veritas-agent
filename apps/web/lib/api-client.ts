"use client";

import { apiError, type ApiError } from "@veritas/shared";

export type ApiResult<T> =
  | { ok: true; data: T }
  /** retryAfterSeconds comes from the `x-retry-after` header on 429 responses. */
  | { ok: false; status: number; error: ApiError; retryAfterSeconds?: number };

/** JSON request to the same-origin API. Never throws; returns a typed result. */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown; keepalive?: boolean } = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init.method ?? "GET",
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
      // keepalive lets a request sent while the page unloads finish (bodies up to 64 KB).
      keepalive: init.keepalive,
    });
    const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: json as T };
    const parsed = apiError.safeParse(json);
    const retryAfter = Number.parseInt(res.headers.get("x-retry-after") ?? "", 10);
    return {
      ok: false,
      status: res.status,
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      error: parsed.success ? parsed.data : { error: "Something went wrong on our side. Please try again." },
    };
  } catch {
    return { ok: false, status: 0, error: { error: "You're offline or the server can't be reached. Check your connection and try again." } };
  }
}
