// lib/auth/logoutDestination.ts
// Where a person lands after signing out: always the top-level site (e.g. http://localhost:3001/), never a
// club or association site. Pure, so the logout route and the tests share it.

export type LogoutTarget = "home" | "login";

export interface LogoutDestinationInput {
  target: LogoutTarget;
  /** Top-level site origin, e.g. http://localhost:3001 (no club/association subdomain). */
  apexOrigin: string;
  /** Reason shown on the sign-in page, e.g. "idle". */
  reason?: string | null;
}

export function logoutDestination(i: LogoutDestinationInput): string {
  const origin = i.apexOrigin.replace(/\/+$/, "");
  if (i.target === "login") {
    const reason = i.reason && /^[a-z-]+$/.test(i.reason) ? `?reason=${i.reason}` : "";
    return `${origin}/login${reason}`;
  }
  return `${origin}/`;
}
