import clientPromise from "@/lib/mongodb";

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

export async function listPublicTournaments(opts?: {
  season?: string;
  limit?: number;
}): Promise<PublicTournamentRow[]> {
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const q: Record<string, string> = {};
  if (opts?.season) q.season = opts.season;

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
