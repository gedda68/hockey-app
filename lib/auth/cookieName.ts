/**
 * lib/auth/cookieName.ts
 *
 * Single source of truth for the session cookie name.
 * Intentionally has NO `next/headers` import so it can be used safely in
 * Edge middleware (proxy.ts) as well as Node.js route handlers.
 *
 * ── `__Host-` prefix (RFC 6265bis / Cookie Prefixes) ─────────────────────────
 *
 * The `__Host-` prefix causes browsers to enforce three extra constraints
 * beyond `HttpOnly`, regardless of what the server sends:
 *
 *   1. Secure=true            — cookie is only ever sent over HTTPS
 *   2. No Domain= attribute   — bound strictly to the origin host (no subdomains)
 *   3. Path=/                 — must cover the full path
 *
 * Together these eliminate the cookie-shadow CSRF class of attack where a
 * network-adjacent attacker injects a forged cookie from a sibling subdomain.
 *
 * ── When it applies ──────────────────────────────────────────────────────────
 *
 *   Production, no SESSION_COOKIE_DOMAIN → "__Host-session"
 *     • Secure=true is already enforced (NODE_ENV=production)
 *     • No Domain= is set (resolvedSessionCookieDomain returns undefined)
 *     • Path=/ is already enforced
 *
 *   Any other case (development OR SESSION_COOKIE_DOMAIN is set) → "session"
 *     • Development: Secure=false, so __Host- is invalid
 *     • SESSION_COOKIE_DOMAIN set: Domain= is present, so __Host- is forbidden
 *
 * ── Compatibility note ────────────────────────────────────────────────────────
 *
 * Existing sessions (cookie named "session") are invalidated on first deploy
 * to production. Users will be prompted to log in again once — acceptable for
 * a security hardening release.
 */

/**
 * Returns the cookie name to use for reads and for writes where no Domain=
 * attribute is needed (the common case).
 *
 *   Production, no cross-domain override → "__Host-session"
 *   Otherwise                            → "session"
 */
export function activeSessionCookieName(): string {
  const isProduction    = process.env.NODE_ENV === "production";
  const hasDomainEnvVar = Boolean(process.env.SESSION_COOKIE_DOMAIN?.trim());
  if (isProduction && !hasDomainEnvVar) {
    return "__Host-session";
  }
  return "session";
}

/**
 * Returns the cookie name for a Set-Cookie write, taking the resolved domain
 * into account.  The `__Host-` prefix is forbidden when a Domain= attribute
 * is present, so fall back to plain "session" in that case.
 *
 * @param domain - The Domain= value that will be sent with this cookie, if any.
 */
export function sessionCookieNameForWrite(domain?: string): string {
  if (domain) return "session"; // __Host- forbids Domain=
  return activeSessionCookieName();
}
