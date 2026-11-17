// lib/auth/logoutDestination.ts
// Where a person should land after signing out: back on the club / association site they were using,
// not the generic base site. Pure, so the logout route and the tests share it.

import { extractPortalSlugFromHost, sanitizeDevPortalToken } from "@/lib/tenant/portalHost";

export type LogoutTarget = "home" | "login";

export interface LogoutDestinationInput {
  target: LogoutTarget;
  /** Host header of the logout request (tells us whether we are already on a club/association host). */
  hostHeader: string | null;
  /** Page the person was on, as sent by the browser. */
  pathname?: string | null;
  search?: string | null;
  /** From the session being ended. */
  session?: {
    portalSubdomain?: string | null;
    clubSlug?: string | null;
    associationId?: string | null;
  } | null;
  /** Origin of a club/association host, e.g. slug "chc" -> http://chc.localhost:3001. */
  tenantOrigin: (slug: string) => string;
  /** The reason shown on the login page, e.g. "idle". */
  reason?: string | null;
}

const SAFE_SEGMENT = /^[A-Za-z0-9._~-]+$/;
const sub = (v: string | null | undefined) => (v && /^[a-z0-9-]+$/i.test(v.trim()) ? v.trim().toLowerCase() : null);

export function logoutDestination(i: LogoutDestinationInput): string {
  const tail = i.target === "login" ? `/login${i.reason && /^[a-z-]+$/.test(i.reason) ? `?reason=${i.reason}` : ""}` : "/";

  // 1. Already on a club/association host: stay on it.
  if (extractPortalSlugFromHost(i.hostHeader)) return tail;

  // 2. Dev: plain localhost with ?portal=slug — keep it.
  const q = new URLSearchParams(i.search ?? "");
  const devPortal = sanitizeDevPortalToken(q.get("portal"));
  if (devPortal) return i.target === "login" ? `${tail}${tail.includes("?") ? "&" : "?"}portal=${devPortal}` : `/?portal=${devPortal}`;

  // 3. On a public club or association page: go back to that page's home.
  const m = (i.pathname ?? "").match(/^\/(clubs|associations)\/([^/?#]+)/);
  if (m && SAFE_SEGMENT.test(m[2]) && m[2] !== "new") {
    return i.target === "home" ? `/${m[1]}/${m[2]}` : tail;
  }

  // 4. The person belongs to a club/association host: send them to it.
  const host = sub(i.session?.portalSubdomain);
  if (host) return `${i.tenantOrigin(host).replace(/\/$/, "")}${tail}`;

  // 5. No host, but we know their club or association.
  if (i.target === "home") {
    const club = i.session?.clubSlug?.trim();
    if (club && SAFE_SEGMENT.test(club)) return `/clubs/${club}`;
    const assoc = i.session?.associationId?.trim();
    if (assoc && SAFE_SEGMENT.test(assoc)) return `/associations/${assoc}`;
  }

  return tail;
}
