// Builds club + association registration documents for members that don't have one yet.
// Pure functions so they can be unit-tested; scripts/backfill-registrations.ts does the DB work.

export interface BackfillMember {
  memberId?: string;
  clubId?: string;
  roles?: string[];
  createdAt?: unknown;
  membership?: {
    clubId?: string;
    status?: string;
    joinDate?: string;
    membershipType?: string;
    memberTypes?: string[];
  };
}

export const ACTIVE_STATUSES = new Set(["active", "life"]);

export const memberClubId = (m: BackfillMember): string =>
  String(m.membership?.clubId || m.clubId || "").trim();

export interface BackfillOptions {
  season: number;
  /** clubId -> parent association id (city/region level). */
  clubAssociation: Map<string, string>;
  now: Date;
}

export function buildRegistrations(m: BackfillMember, o: BackfillOptions) {
  const memberId = String(m.memberId ?? "").trim();
  const clubId = memberClubId(m);
  if (!memberId || !clubId) return null;

  const active = ACTIVE_STATUSES.has(String(m.membership?.status ?? "").toLowerCase());
  const status = active ? "active" : "inactive";
  const joined = m.membership?.joinDate ? new Date(m.membership.joinDate) : null;
  const registeredDate =
    joined && !Number.isNaN(joined.getTime())
      ? joined
      : m.createdAt instanceof Date
        ? m.createdAt
        : o.now;
  const membershipType = m.membership?.membershipType || m.membership?.memberTypes?.[0] || "";
  const common = {
    memberId,
    seasonYear: o.season,
    status,
    roleIds: Array.isArray(m.roles) ? m.roles : [],
    ageCategory: membershipType,
    fees: [] as unknown[],
    source: "backfill",
    registeredDate,
    approvedDate: registeredDate,
  };

  const club = {
    ...common,
    registrationId: `CREG-${clubId}-${memberId}-${o.season}`,
    clubId,
    registrationType: "primary",
    membershipType,
  };
  const associationId = o.clubAssociation.get(clubId);
  const association = associationId
    ? {
        ...common,
        registrationId: `AREG-${associationId}-${memberId}-${o.season}`,
        associationId,
        playerClassification: "",
      }
    : null;
  return { club, association };
}
