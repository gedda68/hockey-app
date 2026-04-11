// G2 — WWCC / working-with-children style expiry helpers (roster staff).

export type WwccComplianceStatus = "missing" | "expired" | "expiring" | "ok";

/**
 * @param expiresAt ISO date/datetime string or null/undefined if not recorded
 * @param expiringWithinDays threshold for `expiring` (default 90)
 */
export function wwccComplianceStatus(
  expiresAt: string | null | undefined,
  now: Date,
  expiringWithinDays = 90,
): WwccComplianceStatus {
  if (expiresAt == null || String(expiresAt).trim() === "") return "missing";
  const t = Date.parse(String(expiresAt));
  if (Number.isNaN(t)) return "missing";
  const end = new Date(t);
  if (end.getTime() < now.getTime()) return "expired";
  const ms = expiringWithinDays * 24 * 60 * 60 * 1000;
  if (end.getTime() <= now.getTime() + ms) return "expiring";
  return "ok";
}

export function daysUntilExpiry(
  expiresAt: string | null | undefined,
  now: Date,
): number | null {
  if (expiresAt == null || String(expiresAt).trim() === "") return null;
  const t = Date.parse(String(expiresAt));
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now.getTime()) / (24 * 60 * 60 * 1000));
}

export type RosterStaffRow = {
  id?: string;
  role?: string;
  staffRoleCode?: string;
  memberId?: string;
  memberName?: string;
  wwccExpiresAt?: string | null;
  wwccCardNumber?: string | null;
};

export type StaffComplianceRow = {
  staffId: string;
  teamIndex: number;
  teamName: string;
  memberId: string;
  memberName: string | null;
  role: string | null;
  staffRoleCode: string | null;
  wwccExpiresAt: string | null;
  wwccStatus: WwccComplianceStatus;
  daysUntilWwccExpiry: number | null;
};

/** Flatten staff from a roster document for compliance reporting. */
export function collectStaffComplianceRows(
  roster: {
    teams?: Array<{ name?: string; staff?: RosterStaffRow[] }>;
  },
  now: Date,
  expiringWithinDays = 90,
): StaffComplianceRow[] {
  const out: StaffComplianceRow[] = [];
  const teams = roster.teams ?? [];
  teams.forEach((team, teamIndex) => {
    const teamName =
      typeof team.name === "string" && team.name.trim()
        ? team.name.trim()
        : `Team ${teamIndex}`;
    for (const s of team.staff ?? []) {
      const staffId = typeof s.id === "string" ? s.id : "";
      if (!staffId) continue;
      const memberId = typeof s.memberId === "string" ? s.memberId : "";
      if (!memberId) continue;
      const exp = s.wwccExpiresAt ?? null;
      out.push({
        staffId,
        teamIndex,
        teamName,
        memberId,
        memberName:
          typeof s.memberName === "string" && s.memberName.trim()
            ? s.memberName.trim()
            : null,
        role: typeof s.role === "string" ? s.role : null,
        staffRoleCode:
          typeof s.staffRoleCode === "string" ? s.staffRoleCode : null,
        wwccExpiresAt: exp,
        wwccStatus: wwccComplianceStatus(exp, now, expiringWithinDays),
        daysUntilWwccExpiry: daysUntilExpiry(exp, now),
      });
    }
  });
  const order: Record<WwccComplianceStatus, number> = {
    expired: 0,
    missing: 1,
    expiring: 2,
    ok: 3,
  };
  out.sort((a, b) => {
    const d = order[a.wwccStatus] - order[b.wwccStatus];
    if (d !== 0) return d;
    const da = a.daysUntilWwccExpiry;
    const db = b.daysUntilWwccExpiry;
    if (da != null && db != null) return da - db;
    if (da != null) return -1;
    if (db != null) return 1;
    return a.teamName.localeCompare(b.teamName);
  });
  return out;
}
