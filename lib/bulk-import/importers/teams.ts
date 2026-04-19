import type { Db } from "mongodb";
import type { ImportResult, ImportRow } from "@/lib/bulk-import/types";
import { norm, uid } from "@/lib/bulk-import/helpers";

export async function importTeams(db: Db, rows: ImportRow[], isRep: boolean): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  const collection = isRep ? "rep_teams" : "teams";

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = norm(r["name"] || r["Team Name"] || r["team_name"]);
    const ageGroup = norm(r["ageGroup"] || r["Age Group"] || r["age_group"]);
    const season = norm(r["season"] || r["Season"] || new Date().getFullYear().toString());

    if (!name) {
      result.errors.push({ row: i + 2, message: "Missing required field: name" });
      continue;
    }
    if (!ageGroup) {
      result.errors.push({ row: i + 2, message: "Missing required field: ageGroup" });
      continue;
    }

    const clubName = norm(r["clubName"] || r["Club Name"] || r["club"]);
    const clubIdRaw = norm(r["clubId"] || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({ $or: [{ name: clubName }, { shortName: clubName }] });
      clubId = (club?.id as string | undefined) ?? null;
    }

    if (!isRep && !clubId) {
      result.errors.push({ row: i + 2, message: "Cannot resolve club — provide clubId or clubName" });
      continue;
    }

    const associationId = norm(r["associationId"] || r["Association ID"]);

    const query: Record<string, unknown> = { name, ageGroup, season };
    if (!isRep) query.clubId = clubId;

    const existing = await db.collection(collection).findOne(query);

    const doc: Record<string, unknown> = {
      name,
      ageGroup,
      season,
      division: norm(r["division"] || r["Division"]),
      gender: norm(r["gender"] || r["Gender"]),
      coach: norm(r["coach"] || r["Coach"]),
      manager: norm(r["manager"] || r["Manager"]),
      status: "active",
      updatedAt: new Date(),
    };
    if (!isRep) doc.clubId = clubId;
    if (isRep && associationId) doc.associationId = associationId;

    if (existing) {
      await db.collection(collection).updateOne({ _id: existing._id }, { $set: doc });
      result.updated++;
    } else {
      await db.collection(collection).insertOne({ ...doc, teamId: uid(), createdAt: new Date() });
      result.imported++;
    }
  }

  return result;
}
