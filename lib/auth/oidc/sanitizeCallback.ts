import type { NextRequest } from "next/server";

/** Same-origin full URL or site-relative path only (open-redirect safe). */
export function sanitizeCallbackUrl(
  req: NextRequest,
  raw: string | null,
): string {
  const fallback = "/";
  if (!raw?.trim()) return fallback;
  const t = raw.trim();
  if (t.startsWith("/")) {
    if (t.startsWith("//")) return fallback;
    return t;
  }
  try {
    const u = new URL(t);
    if (u.origin !== req.nextUrl.origin) return fallback;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return fallback;
  }
}
