// lib/member/myAppointments.ts
// How a role holding reads to the person who holds it.

export type HoldingState = "active" | "pending" | "expired" | "ended";

export function holdingState(h: { status?: string; expiresAt?: string }, now: Date = new Date()): HoldingState {
  if (h.status === "ended") return "ended";
  if (h.expiresAt && new Date(h.expiresAt) <= now) return "expired";
  if (h.status === "pending") return "pending";
  return "active";
}

const ORDER: Record<HoldingState, number> = { active: 0, pending: 1, expired: 2, ended: 3 };
export const byState = <T extends { state: HoldingState }>(a: T, b: T) => ORDER[a.state] - ORDER[b.state];
