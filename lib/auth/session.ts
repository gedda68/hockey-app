// lib/auth/session.ts
// JWT session using jose — Edge-compatible
//
// ── Cookie attribute audit (S6) ───────────────────────────────────────────────
//
//   Name      → "__Host-session" in production (no SESSION_COOKIE_DOMAIN set)
//               "session" in development or when a cross-subdomain Domain= is
//               required.  See lib/auth/cookieName.ts for the full rationale.
//
//   HttpOnly  → true (always)      — JS cannot read the token; XSS-safe.
//   Secure    → true in production — cookie only sent over HTTPS.
//   SameSite  → "lax"             — blocks cross-site POST; allows top-level
//               navigations (e.g. OAuth redirects).  "strict" would break
//               email password-reset links landing with a redirect.
//   Path      → "/"               — required by __Host-; covers all routes.
//   Domain    → absent in production (enforced by __Host-); ".localhost" only
//               in local dev with tenant subdomains.
//   Expires   → 7 days rolling    — matches JWT expiry.

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { getPortalRootDomain } from "@/lib/tenant/portalHost";
import {
  activeSessionCookieName,
  sessionCookieNameForWrite,
} from "@/lib/auth/cookieName";

const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error("JWT_SECRET environment variable is not set");
const key = new TextEncoder().encode(SECRET_KEY);

/**
 * Minimal scoped role — stored in the JWT for middleware access checks.
 * Mirrors RoleAssignment but without the heavy metadata to keep the cookie small.
 */
export interface ScopedRole {
  role: string;
  scopeType: "global" | "association" | "club" | "team";
  scopeId?: string;  // associationId or clubId — absent for global roles
}

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  /** Primary (highest-privilege) role — used for redirect decisions and display */
  role: string;
  /**
   * All active scoped role assignments for this user.
   * Populated from user.roles[] at login so the middleware can make fine-grained
   * access decisions for multi-role members (e.g. a player who is also an
   * association-level umpire or selector).
   */
  scopedRoles?: ScopedRole[];
  associationId?: string | null;
  /**
   * The hierarchical tier of the user's primary association.
   * Derived from association.level at login and stored here so middleware and
   * UI can make level-aware access decisions without a DB round-trip.
   *   "national"  — level 0 (e.g. Hockey Australia)
   *   "state"     — level 1 (e.g. Hockey QLD)
   *   "city"      — level 2 (e.g. Brisbane Hockey)
   *   "district"  — level 3+ (regional sub-bodies)
   * Absent for club-scoped users and super-admin.
   */
  associationLevel?: "national" | "state" | "city" | "district";
  clubId?: string | null;
  clubSlug?: string | null;  // URL-safe slug derived from club name
  clubName?: string;
  memberId?: string | null;
  username?: string;
  forcePasswordChange?: boolean;
  /**
   * Subdomain label for the active persona's portal ({slug}.{PORTAL_ROOT_DOMAIN}).
   * Used by middleware to keep /admin and /portal on the correct tenant host.
   */
  portalSubdomain?: string | null;
}

// Encrypt session data into a JWT
async function encrypt(payload: SessionData): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

// Decrypt and verify a session JWT
async function decrypt(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

/**
 * `Domain=.localhost` is only applied for tenant-bound sessions in dev. Using it for
 * every login can break host-only cookies on bare `http://localhost` in some browsers
 * (session never stored → `/api/auth/me` 401). Super-admin stays host-only.
 */
function resolvedSessionCookieDomain(
  portalSubdomain: string | null | undefined,
): string | undefined {
  const explicit = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV !== "development") return undefined;
  const rootHost = getPortalRootDomain().split(":")[0].toLowerCase();
  if (rootHost !== "localhost") return undefined;
  const sub = portalSubdomain?.trim().toLowerCase();
  if (sub) return ".localhost";
  return undefined;
}

function sessionCookieBase(portalSubdomain: string | null | undefined) {
  const domain = resolvedSessionCookieDomain(portalSubdomain);
  return {
    httpOnly: true as const,
    // Secure=true in production. __Host- prefix additionally enforces this
    // browser-side for production deployments (see cookieName.ts).
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path:     "/",
    ...(domain ? { domain } : {}),
  };
}

/** JWT string + `Set-Cookie` options (single encrypt for login + optional body echo). */
export async function createSessionCookieParts(data: SessionData): Promise<{
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    expires: Date;
    domain?: string;
  };
}> {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const value = await encrypt(data);
  return {
    value,
    options: {
      ...sessionCookieBase(data.portalSubdomain),
      expires,
    },
  };
}

function withoutDomain<T extends { domain?: string }>(opts: T): Omit<T, "domain"> {
  const { domain: _domain, ...rest } = opts;
  return rest;
}

/** Verify a session JWT (e.g. one-off cross-host sync from apex login). */
export async function decodeSessionToken(
  token: string,
): Promise<SessionData | null> {
  return decrypt(token);
}

/**
 * Prefer this in Route Handlers that return `NextResponse.*`: in Next.js 15+,
 * `cookies().set()` alone may not attach to `NextResponse.json()` / redirects.
 */
export async function attachSessionCookie(
  res: NextResponse,
  data: SessionData,
): Promise<void> {
  const { value, options } = await createSessionCookieParts(data);
  const name = sessionCookieNameForWrite(options.domain);
  res.cookies.set(name, value, options);
}

/** Host-only cookie (no Domain=...), for localhost/subdomain quirks. */
export async function attachSessionCookieHostOnly(
  res: NextResponse,
  data: SessionData,
): Promise<void> {
  const { value, options } = await createSessionCookieParts(data);
  const hostOnlyOpts = withoutDomain(options);
  // No Domain= → eligible for __Host- in production
  const name = activeSessionCookieName();
  res.cookies.set(name, value, hostOnlyOpts);
}

// Create session (sets HttpOnly cookie) — Server Components / non-Response flows
export async function createSession(data: SessionData): Promise<void> {
  const { value, options } = await createSessionCookieParts(data);
  const name = sessionCookieNameForWrite(options.domain);
  const cookieStore = await cookies();
  cookieStore.set(name, value, options);
}

// Read current session (Server Components / API Routes)
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  // Use the same name that was used at write time (deterministic per environment)
  const token = cookieStore.get(activeSessionCookieName())?.value;
  if (!token) return null;
  return decrypt(token);
}

// Delete session cookie
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  // Read with the active name (matches what was set)
  const name    = activeSessionCookieName();
  const existing = cookieStore.get(name)?.value;
  let portalSubdomain: string | null | undefined;
  if (existing) {
    portalSubdomain = (await decrypt(existing))?.portalSubdomain;
  }
  const base       = sessionCookieBase(portalSubdomain);
  const deleteName = sessionCookieNameForWrite((base as { domain?: string }).domain);
  cookieStore.set(deleteName, "", {
    ...base,
    expires: new Date(0),
  });
}

// Helpers
export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export async function isSuperAdmin(): Promise<boolean> {
  const s = await getSession();
  return s?.role === "super-admin";
}

export async function getUserClubId(): Promise<string | null> {
  const s = await getSession();
  return s?.clubId || null;
}
