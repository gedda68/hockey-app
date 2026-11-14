// Member documents hold `roles` either as role assignments ({ role, scopeType, scopeId… }) or, for imported
// records, as plain strings such as "role-player" / "role-coach". Sessions and the persona list expect
// assignments, so strings are converted here. Only roles the portal recognises are mapped — anything else
// (e.g. "role-admin") is ignored rather than guessed into elevated access.

import type { RoleAssignment, UserRole } from "@/lib/types/roles";

const MAP: Record<string, UserRole> = {
  player: "player", "junior-player": "player", "senior-player": "player", "masters-player": "player",
  member: "member", parent: "parent",
  volunteer: "volunteer", umpire: "umpire", "technical-official": "technical-official",
  coach: "coach", "assistant-coach": "coach",
  manager: "manager", "team-manager": "manager",
  "team-selector": "team-selector", selector: "team-selector",
};

export function normalizeMemberRoles(roles: unknown, clubId?: string | null): RoleAssignment[] {
  if (!Array.isArray(roles)) return [];
  const out: RoleAssignment[] = [];
  const seen = new Set<string>();
  for (const r of roles) {
    if (r && typeof r === "object" && typeof (r as any).role === "string") {
      out.push(r as RoleAssignment);
      continue;
    }
    if (typeof r !== "string") continue;
    const mapped = MAP[r.trim().toLowerCase().replace(/^role-/, "")];
    if (!mapped || seen.has(mapped)) continue;
    seen.add(mapped);
    out.push({
      role: mapped,
      scopeType: clubId ? "club" : "global",
      ...(clubId ? { scopeId: clubId } : {}),
      grantedAt: "",
    });
  }
  return out;
}
