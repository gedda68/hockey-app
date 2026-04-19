import type { Db } from "mongodb";
import { generateSlug } from "@/lib/utils/slug";
import type { ImportResult, ImportRow } from "@/lib/bulk-import/types";
import { norm, uid } from "@/lib/bulk-import/helpers";

export async function importAssociations(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = norm(r["name"] || r["Name"] || r["Association Name"]);
    if (!name) {
      result.errors.push({ row: i + 2, message: "Missing required field: name" });
      continue;
    }

    const shortName = norm(r["shortName"] || r["Short Name"] || r["code"] || r["Code"]);
    if (!shortName) {
      result.errors.push({ row: i + 2, message: "Missing required field: shortName" });
      continue;
    }

    const slug = generateSlug(name);
    const existing = await db.collection("associations").findOne({ $or: [{ slug }, { name }] });

    const doc = {
      name,
      shortName,
      slug,
      email: norm(r["email"] || r["Email"]),
      phone: norm(r["phone"] || r["Phone"]),
      website: norm(r["website"] || r["Website"]),
      address: norm(r["address"] || r["Address"]),
      suburb: norm(r["suburb"] || r["Suburb"]),
      state: norm(r["state"] || r["State"]),
      postcode: norm(r["postcode"] || r["Postcode"]),
      branding: {
        primaryColor: norm(r["primaryColor"] || r["Primary Color"] || "#06054e"),
        secondaryColor: norm(r["secondaryColor"] || r["Secondary Color"] || "#FFD700"),
      },
      active: true,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.collection("associations").updateOne({ _id: existing._id }, { $set: doc });
      result.updated++;
    } else {
      await db
        .collection("associations")
        .insertOne({ ...doc, associationId: uid(), createdAt: new Date() });
      result.imported++;
    }
  }

  return result;
}

export async function importClubs(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = norm(r["name"] || r["Club Name"] || r["club_name"]);
    if (!name) {
      result.errors.push({ row: i + 2, message: "Missing required field: name" });
      continue;
    }

    const shortName = norm(r["shortName"] || r["Short Name"] || r["short_name"] || r["code"]);
    if (!shortName) {
      result.errors.push({ row: i + 2, message: `Row ${i + 2}: Missing required field: shortName` });
      continue;
    }

    const parentAssociationId = norm(
      r["parentAssociationId"] || r["associationId"] || r["Association ID"] || r["owningAssociationId"],
    );

    const slug = generateSlug(name);
    const existing = await db.collection("clubs").findOne({ $or: [{ slug }, { name }] });

    const doc: Record<string, unknown> = {
      name,
      shortName,
      slug,
      email: norm(r["email"] || r["Email"]),
      phone: norm(r["phone"] || r["Phone"]),
      website: norm(r["website"] || r["Website"]),
      address: norm(r["address"] || r["Address"]),
      suburb: norm(r["suburb"] || r["Suburb"]),
      state: norm(r["state"] || r["State"]),
      postcode: norm(r["postcode"] || r["Postcode"]),
      colors: {
        primaryColor: norm(r["primaryColor"] || r["Primary Color"] || "#06054e"),
        secondaryColor: norm(r["secondaryColor"] || r["Secondary Color"] || "#FFD700"),
      },
      active: true,
      updatedAt: new Date(),
    };

    if (parentAssociationId) {
      doc.parentAssociationId = parentAssociationId;
    }

    if (existing) {
      await db.collection("clubs").updateOne({ _id: existing._id }, { $set: doc });
      result.updated++;
    } else {
      await db.collection("clubs").insertOne({ ...doc, id: uid(), createdAt: new Date() });
      result.imported++;
    }
  }

  return result;
}
