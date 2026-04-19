import type { Db } from "mongodb";

/** Active venue row for this association that contains the pitch. */
export async function assertVenuePitchForAssociation(
  db: Db,
  associationId: string,
  venueId: string,
  pitchId: string,
): Promise<boolean> {
  const v = await db.collection("association_venues").findOne({
    associationId,
    venueId,
    status: "active",
    pitches: { $elemMatch: { pitchId } },
  });
  return Boolean(v);
}

export async function clubBelongsToAssociation(
  db: Db,
  clubKey: string,
  associationId: string,
): Promise<boolean> {
  const c = await db.collection("clubs").findOne({
    $and: [
      { $or: [{ id: clubKey }, { clubId: clubKey }] },
      {
        $or: [{ parentAssociationId: associationId }, { associationId: associationId }],
      },
    ],
  });
  return Boolean(c);
}
