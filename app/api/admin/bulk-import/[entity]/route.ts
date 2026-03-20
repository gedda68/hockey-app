// app/api/admin/bulk-import/[entity]/route.ts
// Unified bulk-import endpoint for all entity types.
// Accepts: POST { rows: Record<string, string>[] }
// Returns: { imported, updated, skipped, errors }

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { generateSlug } from "@/lib/utils/slug";
import bcrypt from "bcryptjs";

type Ctx = { params: Promise<{ entity: string }> };

interface ImportRow   { [key: string]: string }
interface ImportResult {
  imported: number;
  updated:  number;
  skipped:  number;
  errors:   Array<{ row: number; message: string }>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function norm(v: unknown): string {
  return (v ?? "").toString().trim();
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toDate(v: string): string | null {
  if (!v) return null;
  // accept DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
  const isoMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return v;
  const slashMatch = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const [, a, b, c] = slashMatch;
    const year = c.length === 2 ? `20${c}` : c;
    // Assume DD/MM/YYYY for Australian locale
    return `${year}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  }
  return null;
}

// ── importers ─────────────────────────────────────────────────────────────────

async function importClubs(db: any, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = norm(r["name"] || r["Club Name"] || r["club_name"]);
    if (!name) { result.errors.push({ row: i + 2, message: "Missing required field: name" }); continue; }

    const shortName = norm(r["shortName"] || r["Short Name"] || r["short_name"] || r["code"]);
    if (!shortName) { result.errors.push({ row: i + 2, message: `Row ${i + 2}: Missing required field: shortName` }); continue; }

    const slug = generateSlug(name);
    const existing = await db.collection("clubs").findOne({ $or: [{ slug }, { name }] });

    const doc = {
      name,
      shortName,
      slug,
      email:        norm(r["email"] || r["Email"]),
      phone:        norm(r["phone"] || r["Phone"]),
      website:      norm(r["website"] || r["Website"]),
      address:      norm(r["address"] || r["Address"]),
      suburb:       norm(r["suburb"] || r["Suburb"]),
      state:        norm(r["state"] || r["State"]),
      postcode:     norm(r["postcode"] || r["Postcode"]),
      colors: {
        primaryColor:   norm(r["primaryColor"] || r["Primary Color"] || "#06054e"),
        secondaryColor: norm(r["secondaryColor"] || r["Secondary Color"] || "#FFD700"),
      },
      active: true,
      updatedAt: new Date(),
    };

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

async function importAssociations(db: any, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = norm(r["name"] || r["Name"] || r["Association Name"]);
    if (!name) { result.errors.push({ row: i + 2, message: "Missing required field: name" }); continue; }

    const shortName = norm(r["shortName"] || r["Short Name"] || r["code"] || r["Code"]);
    if (!shortName) { result.errors.push({ row: i + 2, message: "Missing required field: shortName" }); continue; }

    const slug = generateSlug(name);
    const existing = await db.collection("associations").findOne({ $or: [{ slug }, { name }] });

    const doc = {
      name,
      shortName,
      slug,
      email:    norm(r["email"] || r["Email"]),
      phone:    norm(r["phone"] || r["Phone"]),
      website:  norm(r["website"] || r["Website"]),
      address:  norm(r["address"] || r["Address"]),
      suburb:   norm(r["suburb"] || r["Suburb"]),
      state:    norm(r["state"] || r["State"]),
      postcode: norm(r["postcode"] || r["Postcode"]),
      branding: {
        primaryColor:   norm(r["primaryColor"] || r["Primary Color"] || "#06054e"),
        secondaryColor: norm(r["secondaryColor"] || r["Secondary Color"] || "#FFD700"),
      },
      active: true,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.collection("associations").updateOne({ _id: existing._id }, { $set: doc });
      result.updated++;
    } else {
      await db.collection("associations").insertOne({ ...doc, associationId: uid(), createdAt: new Date() });
      result.imported++;
    }
  }

  return result;
}

async function importMembers(db: any, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const firstName = norm(r["firstName"] || r["First Name"] || r["first_name"]);
    const lastName  = norm(r["lastName"]  || r["Last Name"]  || r["last_name"]);
    const email     = norm(r["email"] || r["Email"]);

    if (!firstName || !lastName) { result.errors.push({ row: i + 2, message: "Missing required fields: firstName, lastName" }); continue; }

    // Resolve club
    const clubName = norm(r["clubName"] || r["Club Name"] || r["club"]);
    const clubIdRaw = norm(r["clubId"] || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({ $or: [{ name: clubName }, { shortName: clubName }, { slug: generateSlug(clubName) }] });
      clubId = club?.id ?? null;
    }

    const dob = toDate(norm(r["dateOfBirth"] || r["Date of Birth"] || r["dob"] || r["DOB"]));
    const gender = norm(r["gender"] || r["Gender"]);

    const existing = email
      ? await db.collection("members").findOne({ "personalInfo.email": email })
      : null;

    const memberId = existing?.memberId ?? `MBR-${uid().toUpperCase()}`;

    const doc: any = {
      memberId,
      clubId,
      personalInfo: {
        firstName,
        lastName,
        email,
        phone:       norm(r["phone"] || r["Phone"]),
        dateOfBirth: dob,
        gender,
        address: {
          street:   norm(r["address"]  || r["Address"]),
          suburb:   norm(r["suburb"]   || r["Suburb"]),
          state:    norm(r["state"]    || r["State"]),
          postcode: norm(r["postcode"] || r["Postcode"]),
          country:  norm(r["country"]  || r["Country"] || "Australia"),
        },
      },
      membership: {
        membershipType: norm(r["membershipType"] || r["Membership Type"] || "standard"),
        status: "active",
        joinDate: new Date().toISOString().split("T")[0],
      },
      updatedAt: new Date(),
    };

    if (existing) {
      await db.collection("members").updateOne({ _id: existing._id }, { $set: doc });
      result.updated++;
    } else {
      await db.collection("members").insertOne({ ...doc, createdAt: new Date() });
      result.imported++;
    }
  }

  return result;
}

async function importPlayers(db: any, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const firstName = norm(r["firstName"] || r["First Name"] || r["first_name"]);
    const lastName  = norm(r["lastName"]  || r["Last Name"]  || r["last_name"]);

    if (!firstName || !lastName) { result.errors.push({ row: i + 2, message: "Missing required fields: firstName, lastName" }); continue; }

    const dob = toDate(norm(r["dateOfBirth"] || r["Date of Birth"] || r["dob"] || r["DOB"]));
    if (!dob) { result.errors.push({ row: i + 2, message: `Row ${i + 2}: Missing or invalid dateOfBirth` }); continue; }

    // Resolve club
    const clubName = norm(r["clubName"] || r["Club Name"] || r["club"]);
    const clubIdRaw = norm(r["clubId"] || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({ $or: [{ name: clubName }, { shortName: clubName }] });
      clubId = club?.id ?? null;
    }

    const email = norm(r["email"] || r["Email"]);
    const existing = email
      ? await db.collection("players").findOne({ "personalInfo.email": email })
      : await db.collection("players").findOne({ "personalInfo.firstName": firstName, "personalInfo.lastName": lastName, "personalInfo.dateOfBirth": dob });

    // Next reg number
    let registrationNumber = norm(r["registrationNumber"] || r["Registration Number"]);
    if (!registrationNumber && !existing) {
      const last = await db.collection("players").find({ registrationNumber: { $exists: true } }).sort({ registrationNumber: -1 }).limit(1).toArray();
      const lastNum = last[0]?.registrationNumber ? parseInt(last[0].registrationNumber, 10) : 1000;
      registrationNumber = String(isNaN(lastNum) ? 1001 : lastNum + 1);
    }

    const doc: any = {
      clubId,
      registrationNumber: registrationNumber || existing?.registrationNumber,
      personalInfo: {
        firstName,
        lastName,
        email,
        phone:       norm(r["phone"] || r["Phone"]),
        dateOfBirth: dob,
        gender:      norm(r["gender"] || r["Gender"]),
        address: {
          street:   norm(r["address"]  || r["Address"]),
          suburb:   norm(r["suburb"]   || r["Suburb"]),
          state:    norm(r["state"]    || r["State"]),
          postcode: norm(r["postcode"] || r["Postcode"]),
          country:  norm(r["country"]  || r["Country"] || "Australia"),
        },
      },
      position:      norm(r["position"] || r["Position"]),
      preferredHand: norm(r["preferredHand"] || r["Preferred Hand"]),
      status: { current: "active" },
      updatedAt: new Date(),
    };

    if (existing) {
      await db.collection("players").updateOne({ _id: existing._id }, { $set: doc });
      result.updated++;
    } else {
      await db.collection("players").insertOne({ ...doc, playerId: uid(), createdAt: new Date() });
      result.imported++;
    }
  }

  return result;
}

async function importUsers(db: any, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const email = norm(r["email"] || r["Email"]);
    const firstName = norm(r["firstName"] || r["First Name"] || r["first_name"]);
    const lastName  = norm(r["lastName"]  || r["Last Name"]  || r["last_name"]);
    const role      = norm(r["role"] || r["Role"] || "club-admin");

    if (!email) { result.errors.push({ row: i + 2, message: "Missing required field: email" }); continue; }
    if (!firstName || !lastName) { result.errors.push({ row: i + 2, message: "Missing required fields: firstName, lastName" }); continue; }

    // Resolve club
    const clubName = norm(r["clubName"] || r["Club Name"] || r["club"]);
    const clubIdRaw = norm(r["clubId"] || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    let clubSlug: string | null = null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({ $or: [{ name: clubName }, { shortName: clubName }] });
      clubId = club?.id ?? null;
      clubSlug = club?.slug ?? null;
    }

    // Resolve association
    const assocName = norm(r["associationName"] || r["Association Name"]);
    const assocIdRaw = norm(r["associationId"] || r["Association ID"]);
    let associationId: string | null = assocIdRaw || null;
    if (!associationId && assocName) {
      const assoc = await db.collection("associations").findOne({ $or: [{ name: assocName }, { shortName: assocName }] });
      associationId = assoc?.associationId ?? null;
    }

    const existing = await db.collection("users").findOne({ email });

    if (existing) {
      await db.collection("users").updateOne(
        { _id: existing._id },
        { $set: { firstName, lastName, role, clubId, clubSlug, associationId, updatedAt: new Date() } }
      );
      result.updated++;
    } else {
      // Generate a temp password
      const tempPassword = Math.random().toString(36).slice(2, 10) + "A1!";
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await db.collection("users").insertOne({
        userId: uid(),
        email,
        firstName,
        lastName,
        role,
        clubId,
        clubSlug,
        associationId,
        passwordHash,
        forcePasswordChange: true,
        emailVerified: false,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      result.imported++;
    }
  }

  return result;
}

async function importTeams(db: any, rows: ImportRow[], isRep: boolean): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  const collection = isRep ? "rep_teams" : "teams";

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name     = norm(r["name"] || r["Team Name"] || r["team_name"]);
    const ageGroup = norm(r["ageGroup"] || r["Age Group"] || r["age_group"]);
    const season   = norm(r["season"] || r["Season"] || new Date().getFullYear().toString());

    if (!name) { result.errors.push({ row: i + 2, message: "Missing required field: name" }); continue; }
    if (!ageGroup) { result.errors.push({ row: i + 2, message: "Missing required field: ageGroup" }); continue; }

    // Resolve club (not required for rep teams)
    const clubName = norm(r["clubName"] || r["Club Name"] || r["club"]);
    const clubIdRaw = norm(r["clubId"] || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({ $or: [{ name: clubName }, { shortName: clubName }] });
      clubId = club?.id ?? null;
    }

    if (!isRep && !clubId) { result.errors.push({ row: i + 2, message: "Cannot resolve club — provide clubId or clubName" }); continue; }

    const query: any = { name, ageGroup, season };
    if (!isRep) query.clubId = clubId;

    const existing = await db.collection(collection).findOne(query);

    const doc: any = {
      name,
      ageGroup,
      season,
      division:  norm(r["division"] || r["Division"]),
      gender:    norm(r["gender"] || r["Gender"]),
      coach:     norm(r["coach"] || r["Coach"]),
      manager:   norm(r["manager"] || r["Manager"]),
      status: "active",
      updatedAt: new Date(),
    };
    if (!isRep) doc.clubId = clubId;

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

// ── main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { entity } = await ctx.params;
    const { rows } = await req.json() as { rows: ImportRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    let result: ImportResult;

    switch (entity) {
      case "clubs":        result = await importClubs(db, rows);         break;
      case "associations": result = await importAssociations(db, rows);  break;
      case "members":      result = await importMembers(db, rows);       break;
      case "players":      result = await importPlayers(db, rows);       break;
      case "users":        result = await importUsers(db, rows);         break;
      case "teams":        result = await importTeams(db, rows, false);  break;
      case "rep-teams":    result = await importTeams(db, rows, true);   break;
      default:
        return NextResponse.json({ error: `Unknown entity type: ${entity}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Bulk import error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
