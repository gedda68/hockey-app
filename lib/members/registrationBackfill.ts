// Builds club + association registration documents (with category and itemised fees) for members.
// Pure functions; scripts/backfill-registrations.ts does the DB work.
import { categorise, feeLines, sumFees, CURRENCY, type Level } from "@/lib/registrations/pricing";

export interface BackfillMember {
  memberId?: string;
  clubId?: string;
  roles?: string[];
  createdAt?: unknown;
  personalInfo?: { dateOfBirth?: string };
  membership?: {
    clubId?: string;
    status?: string;
    joinDate?: string;
    membershipType?: string;
    memberTypes?: string[];
    roles?: string[];
  };
}

export const ACTIVE_STATUSES = new Set(["active", "life"]);
export const memberClubId = (m: BackfillMember): string =>
  String(m.membership?.clubId || m.clubId || "").trim();

export interface BackfillOptions {
  season: number;
  /** clubId -> [club level, then associations nearest-first (city, state, national)] */
  levelsByClub: Map<string, Level[]>;
  now: Date;
}

export function buildRegistrations(m: BackfillMember, o: BackfillOptions) {
  const memberId = String(m.memberId ?? "").trim();
  const clubId = memberClubId(m);
  if (!memberId || !clubId) return null;

  const status = ACTIVE_STATUSES.has(String(m.membership?.status ?? "").toLowerCase()) ? "active" : "inactive";
  const joined = m.membership?.joinDate ? new Date(m.membership.joinDate) : null;
  const registeredDate =
    joined && !Number.isNaN(joined.getTime()) ? joined : m.createdAt instanceof Date ? m.createdAt : o.now;
  const category = categorise(m, o.season);
  const levels = o.levelsByClub.get(clubId) ?? [{ kind: "club" as const, id: clubId, name: clubId }];
  const lines = feeLines(category, levels);
  const common = {
    memberId,
    seasonYear: o.season,
    status,
    roleIds: Array.isArray(m.roles) ? m.roles : [],
    registrationCategory: category,
    ageCategory: category,
    currency: CURRENCY,
    source: "backfill",
    registeredDate,
    approvedDate: registeredDate,
  };

  // The club registration carries the full itemised stack (club + every association above).
  const club = {
    ...common,
    registrationId: `CREG-${clubId}-${memberId}-${o.season}`,
    clubId,
    registrationType: "primary",
    membershipType: m.membership?.membershipType || m.membership?.memberTypes?.[0] || "",
    fees: lines,
    totalFee: sumFees(lines),
  };
  // Each association registration holds its own line; volunteers are club-level only.
  const associations = lines
    .filter((l) => l.type === "association")
    .map((l) => ({
      ...common,
      registrationId: `AREG-${l.associationId}-${memberId}-${o.season}`,
      associationId: l.associationId!,
      clubId,
      // Associations don't hold player roles — the role is held at the club.
      roleIds: [] as string[],
      playerClassification: "",
      fees: [l],
      totalFee: l.amount,
    }));
  return { club, associations };
}
