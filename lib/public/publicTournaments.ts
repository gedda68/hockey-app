import clientPromise from "@/lib/mongodb";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";

export type PublicTournamentRow = {
  tournamentId: string;
  season: string;
  ageGroup: string;
  gender: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  championTeamName: string | null;
  hostType: string | null;
  hostId: string | null;
  brandingAssociationId: string | null;
};

function associationTournamentScope(associationId: string) {
  return {
    $or: [
      { brandingAssociationId: associationId },
      { hostId: associationId },
    ],
  };
}

export async function listPublicTournaments(opts?: {
  season?: string;
  limit?: number;
  /**
   * When resolving from a portal host (API or server page), restrict rows to that tenant.
   * Apex / no tenant: no extra filter (full public directory).
   */
  tenant?: PublicTenantPayload | null;
  /**
   * When loading an association hub without a tenant context (e.g. apex URL), scope the same
   * way as an association portal: branding or host matches this association id.
   */
  associationId?: string;
}): Promise<PublicTournamentRow[]> {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const parts: Record<string, unknown>[] = [];
  if (opts?.season?.trim()) {
    parts.push({ season: opts.season.trim() });
  }

  const tenant = opts?.tenant ?? null;
  if (tenant?.kind === "association") {
    parts.push(associationTournamentScope(tenant.id));
  } else if (tenant?.kind === "club") {
    const club = await db.collection("clubs").findOne(
      { id: tenant.id },
      { projection: { associationId: 1, parentAssociationId: 1 } },
    );
    const parent = String(
      club?.associationId != null
        ? club.associationId
        : club?.parentAssociationId != null
          ? club.parentAssociationId
          : "",
    ).trim();
    const or: Record<string, unknown>[] = [{ hostId: tenant.id }];
    if (parent) {
      or.push({ brandingAssociationId: parent });
    }
    parts.push({ $or: or });
  } else {
    const assocOnly = opts?.associationId?.trim();
    if (assocOnly) {
      parts.push(associationTournamentScope(assocOnly));
    }
  }

  const q: Record<string, unknown> =
    parts.length === 0
      ? {}
      : parts.length === 1
        ? parts[0]!
        : { $and: parts };

  const rows = await db
    .collection("rep_tournaments")
    .find(q)
    .project({
      tournamentId: 1,
      season: 1,
      ageGroup: 1,
      gender: 1,
      title: 1,
      startDate: 1,
      endDate: 1,
      location: 1,
      championTeamName: 1,
      hostType: 1,
      hostId: 1,
      brandingAssociationId: 1,
    })
    .sort({ season: -1, startDate: -1 })
    .limit(opts?.limit ?? 200)
    .toArray();

  return rows.map((t) => ({
    tournamentId: String(t.tournamentId),
    season: String(t.season ?? ""),
    ageGroup: String(t.ageGroup ?? ""),
    gender: String(t.gender ?? "mixed"),
    title: String(t.title ?? ""),
    startDate: String(t.startDate ?? ""),
    endDate: String(t.endDate ?? ""),
    location: String(t.location ?? ""),
    championTeamName: t.championTeamName != null ? String(t.championTeamName) : null,
    hostType: t.hostType != null ? String(t.hostType) : null,
    hostId: t.hostId != null ? String(t.hostId) : null,
    brandingAssociationId:
      t.brandingAssociationId != null ? String(t.brandingAssociationId) : null,
  }));
}
