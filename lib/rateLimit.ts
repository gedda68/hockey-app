/**
 * lib/rateLimit.ts
 * Sliding-window in-memory rate limiter for auth endpoints.
 *
 * Zero external dependencies — works out of the box.
 * State is stored on `globalThis` so it survives Next.js hot-reloads in dev.
 *
 * ── Upgrading to Upstash Redis (recommended for multi-instance production) ──
 *
 *   npm install @upstash/ratelimit @upstash/redis
 *
 * Then add to .env.local:
 *   UPSTASH_REDIS_REST_URL=...
 *   UPSTASH_REDIS_REST_TOKEN=...
 *
 * And replace the in-memory store below with:
 *
 *   import { Ratelimit } from "@upstash/ratelimit";
 *   import { Redis }     from "@upstash/redis";
 *
 *   const ratelimit = new Ratelimit({
 *     redis:     Redis.fromEnv(),
 *     limiter:   Ratelimit.slidingWindow(10, "15 m"),
 *     analytics: true,
 *     prefix:    "rl:auth",
 *   });
 *
 *   export async function checkRateLimit(key: string) {
 *     const { success, remaining, reset } = await ratelimit.limit(key);
 *     return { limited: !success, remaining, resetAt: reset };
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

// ── Config ────────────────────────────────────────────────────────────────────

const WINDOW_MS   = 15 * 60 * 1000; // 15 minutes
const MAX_HITS    = 10;              // max attempts per window per IP

// ── In-memory sliding-window store ────────────────────────────────────────────
//
// Map<key, timestamps[]>  where key = "ip:route"
// timestamps[] holds the epoch-ms of every hit inside the current window.

type RateLimitStore = Map<string, number[]>;

// Persist across hot-reloads so dev restarts don't reset counters mid-window.
const g = globalThis as typeof globalThis & { __rlStore?: RateLimitStore };
if (!g.__rlStore) g.__rlStore = new Map();
const store: RateLimitStore = g.__rlStore;

// Prune stale keys every 5 minutes to avoid unbounded map growth.
let lastPruneAt = Date.now();
function maybePrune(now: number): void {
  if (now - lastPruneAt < 5 * 60 * 1000) return;
  lastPruneAt = now;
  const cutoff = now - WINDOW_MS;
  for (const [key, hits] of store) {
    const fresh = hits.filter((t) => t > cutoff);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  }
}

// ── IP extraction ──────────────────────────────────────────────────────────────

/**
 * Best-effort real-IP from the request headers.
 * Priority: x-forwarded-for (leftmost, i.e. client) → x-real-ip → fallback.
 */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    // "client, proxy1, proxy2" — take the leftmost entry
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  const xri = request.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "127.0.0.1";
}

// ── Core check ────────────────────────────────────────────────────────────────

interface RateLimitResult {
  limited:   boolean;
  remaining: number;
  resetAt:   number; // epoch ms when the oldest hit expires
}

/**
 * Record a hit for `key` and return whether the caller is rate-limited.
 * `key` should be unique per IP + route, e.g. `"login:1.2.3.4"`.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now    = Date.now();
  const cutoff = now - WINDOW_MS;

  maybePrune(now);

  // Prune hits outside the current sliding window
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);

  const limited   = hits.length >= MAX_HITS;
  const remaining = Math.max(0, MAX_HITS - hits.length - (limited ? 0 : 1));
  const resetAt   = hits.length > 0 ? hits[0] + WINDOW_MS : now + WINDOW_MS;

  if (!limited) {
    hits.push(now);
  }
  store.set(key, hits);

  return { limited, remaining, resetAt };
}

// ── Response helper ────────────────────────────────────────────────────────────

/**
 * Returns a 429 NextResponse with standardised headers, or null if the request
 * is within limits.
 *
 * Usage:
 *   const limited = rateLimitResponse(request, "login");
 *   if (limited) return limited;
 */
export function rateLimitResponse(
  request: NextRequest,
  routeKey: string,
): NextResponse | null {
  const ip  = getClientIp(request);
  const key = `${routeKey}:${ip}`;
  const { limited, remaining, resetAt } = checkRateLimit(key);

  if (!limited) return null;

  const retryAfterSecs = Math.ceil((resetAt - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Too many attempts. Please wait a few minutes and try again.",
      retryAfter: retryAfterSecs,
    },
    {
      status: 429,
      headers: {
        "Retry-After":              String(retryAfterSecs),
        "X-RateLimit-Limit":        String(MAX_HITS),
        "X-RateLimit-Remaining":    String(remaining),
        "X-RateLimit-Reset":        String(Math.ceil(resetAt / 1000)),
        "X-RateLimit-Window":       "900", // 15 min in seconds
      },
    },
  );
}
