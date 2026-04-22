/**
 * __tests__/helpers/request.ts
 *
 * Lightweight factory for building mock `NextRequest` objects suitable for
 * passing directly to Next.js App Router route handlers in unit/integration tests.
 *
 * Usage:
 *   const req = makeRequest("/api/admin/news");
 *   const req = makeRequest("/api/admin/clubs", { method: "POST", body: { name: "Test" } });
 */

import { NextRequest } from "next/server";

export interface MakeRequestOptions {
  method?:  string;
  body?:    unknown;
  headers?: Record<string, string>;
  /** Append these as URL search params */
  params?:  Record<string, string>;
}

/**
 * Build a `NextRequest` for a given path.
 * The host is always `http://localhost:3000` so URL parsing works correctly.
 */
export function makeRequest(path: string, options: MakeRequestOptions = {}): NextRequest {
  const { method = "GET", body, headers = {}, params } = options;

  let url = `http://localhost:3000${path}`;
  if (params && Object.keys(params).length > 0) {
    const sp = new URLSearchParams(params);
    url += `?${sp.toString()}`;
  }

  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

/**
 * Build mock `params` for dynamic route segments.
 * App Router passes params as a `Promise<Record<string, string>>` in Next.js 15+.
 *
 * Usage:
 *   const { GET } = await import("@/app/api/admin/news/[id]/route");
 *   await GET(req, { params: routeParams({ id: "abc123" }) });
 */
export function routeParams<T extends Record<string, string>>(
  segments: T,
): { params: Promise<T> } {
  return { params: Promise.resolve(segments) };
}
