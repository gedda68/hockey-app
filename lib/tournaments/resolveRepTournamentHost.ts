// D1 — Validate host ids against Mongo and derive brandingAssociationId.

import type { Db } from "mongodb";
import type { TournamentHostType } from "@/lib/db/schemas/repTournament.schema";

export type NormalizedRepTournamentHost = {
  hostType: TournamentHostType;
  hostId: string;
  brandingAssociationId: string;
};

export class RepTournamentHostError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = "RepTournamentHostError";
  }
}

/**
 * Resolve and validate host + branding. `brandingAssociationId` optional on input;
 * always returned on success.
 */
export async function normalizeRepTournamentHost(
  db: Db,
  input: {
    hostType: TournamentHostType;
    hostId: string;
    brandingAssociationId?: string | undefined;
  },
): Promise<NormalizedRepTournamentHost> {
  const hostId = input.hostId.trim();
  if (!hostId) {
    throw new RepTournamentHostError("hostId is required", 400);
  }

  if (input.hostType === "association") {
    const assoc = await db.collection("associations").findOne({ associationId: hostId });
    if (!assoc) {
      throw new RepTournamentHostError(`Association not found: ${hostId}`, 404);
    }
    const brandingAssociationId =
      input.brandingAssociationId?.trim() || hostId;
    const branding = await db
      .collection("associations")
      .findOne({ associationId: brandingAssociationId });
    if (!branding) {
      throw new RepTournamentHostError(
        `Branding association not found: ${brandingAssociationId}`,
        404,
      );
    }
    return { hostType: "association", hostId, brandingAssociationId };
  }

  const club = await db.collection("clubs").findOne({
    $or: [{ id: hostId }, { clubId: hostId }, { slug: hostId }],
  });
  if (!club) {
    throw new RepTournamentHostError(`Club not found: ${hostId}`, 404);
  }
  const canonicalClubId = typeof club.id === "string" ? club.id : hostId;
  const parentAssociationId = club.parentAssociationId as string | undefined;
  if (!parentAssociationId?.trim()) {
    throw new RepTournamentHostError(
      "Club has no parentAssociationId; cannot derive branding association",
      400,
    );
  }
  const brandingAssociationId =
    input.brandingAssociationId?.trim() || parentAssociationId.trim();
  if (brandingAssociationId !== parentAssociationId.trim()) {
    throw new RepTournamentHostError(
      "brandingAssociationId must match the club's parentAssociationId for club-hosted tournaments",
      400,
    );
  }
  const branding = await db
    .collection("associations")
    .findOne({ associationId: brandingAssociationId });
  if (!branding) {
    throw new RepTournamentHostError(
      `Branding association not found: ${brandingAssociationId}`,
      404,
    );
  }
  return {
    hostType: "club",
    hostId: canonicalClubId,
    brandingAssociationId,
  };
}
