// app/api/admin/bulk-import/[entity]/route.ts
// Unified bulk-import endpoint for all entity types.
// Accepts: POST { rows: Record<string, string>[] }
// Returns: { imported, updated, skipped, errors }

import { NextRequest, NextResponse } from "next/server";
import type { Db } from 'mongodb';
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
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
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // DD/MM/YYYY or DD-MM-YYYY (Australian locale)
  const slashMatch = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/** Parse "yes"/"no"/"true"/"false"/"1"/"0" → boolean */
function toBool(v: string): boolean {
  const s = (v ?? "").toString().toLowerCase().trim();
  return s === "yes" || s === "true" || s === "1";
}

// ── importers ─────────────────────────────────────────────────────────────────

async function importClubs(db: Db, rows: ImportRow[]): Promise<ImportResult> {
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

async function importAssociations(db: Db, rows: ImportRow[]): Promise<ImportResult> {
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

async function importMembers(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    // ── Required fields ───────────────────────────────────────────────────────
    const firstName = norm(r["firstName"] || r["First Name"]);
    const lastName  = norm(r["lastName"]  || r["Last Name"]);
    if (!firstName || !lastName) {
      result.errors.push({ row: i + 2, message: "Missing required fields: firstName, lastName" });
      continue;
    }

    const primaryEmail = norm(r["primaryEmail"] || r["Email"] || r["email"]);
    const dob          = toDate(norm(r["dateOfBirth"] || r["Date of Birth"] || r["DOB"]));
    const today        = new Date().toISOString().split("T")[0];

    // ── Resolve club ──────────────────────────────────────────────────────────
    const clubName  = norm(r["clubName"] || r["Club Name"]);
    const clubIdRaw = norm(r["clubId"]   || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({
        $or: [{ name: clubName }, { shortName: clubName }, { slug: generateSlug(clubName) }],
      });
      clubId = club?.id ?? null;
    }

    // ── Deduplicate: email → memberId → name+DOB ──────────────────────────────
    const existing = primaryEmail
      ? await db.collection("members").findOne({ "contact.primaryEmail": primaryEmail })
      : await db.collection("members").findOne({
          "personalInfo.firstName": firstName,
          "personalInfo.lastName":  lastName,
          "personalInfo.dateOfBirth": dob,
        });

    const memberId =
      (existing?.memberId ?? norm(r["memberId"] || r["Member ID"])) ||
      `MBR-${uid().toUpperCase()}`;

    // ── Roles — accept comma-separated list ───────────────────────────────────
    const rolesRaw = norm(r["roles"] || r["Roles"]);
    const roles = rolesRaw
      ? rolesRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : existing?.roles ?? ["role-player"];

    // ── Emergency contacts ────────────────────────────────────────────────────
    const ecName     = norm(r["emergencyContactName"]         || r["Emergency Contact Name"]);
    const ecRelation = norm(r["emergencyContactRelationship"] || r["Emergency Contact Relationship"]);
    const ecPhone    = norm(r["emergencyContactPhone"]        || r["Emergency Contact Phone"]);
    const ecMobile   = norm(r["emergencyContactMobile"]       || r["Emergency Contact Mobile"]);
    const ecEmail    = norm(r["emergencyContactEmail"]        || r["Emergency Contact Email"]);

    const emergencyContacts = ecName
      ? [{
          contactId:    `emerg-${Date.now()}`,
          priority:     1,
          name:         ecName,
          relationship: ecRelation,
          phone:        ecPhone,
          mobile:       ecMobile,
          email:        ecEmail,
        }]
      : existing?.emergencyContacts ?? [];

    // ── Build document matching actual member DB schema ───────────────────────
    const doc: Record<string, unknown> = {
      memberId,
      clubId,

      // ── personalInfo (nested) ──────────────────────────────────────────────
      personalInfo: {
        firstName,
        lastName,
        displayName:  norm(r["displayName"] || r["Display Name"]) || `${firstName} ${lastName}`,
        dateOfBirth:  dob ?? "",
        gender:       norm(r["gender"] || r["Gender"]),   // e.g. "gender-male", "gender-female"
        photoUrl:     existing?.personalInfo?.photoUrl ?? "",
        socialMedia:  existing?.personalInfo?.socialMedia ?? [],
      },

      // ── contact (nested) ───────────────────────────────────────────────────
      contact: {
        primaryEmail,
        emailOwnership:   norm(r["emailOwnership"] || r["Email Ownership"] || "Own"),
        additionalEmails: existing?.contact?.additionalEmails ?? [],
        phone:  norm(r["phone"]   || r["Phone"]),
        mobile: norm(r["mobile"]  || r["Mobile"] || r["phone"] || r["Phone"]),
        emergencyContact: {
          name:         ecName  || existing?.contact?.emergencyContact?.name  || "",
          relationship: ecRelation || existing?.contact?.emergencyContact?.relationship || "",
          phone:        ecPhone || existing?.contact?.emergencyContact?.phone || "",
        },
      },

      // ── address (nested) ───────────────────────────────────────────────────
      address: {
        street:   norm(r["street"]   || r["Street"]   || r["address"] || r["Address"]),
        suburb:   norm(r["suburb"]   || r["Suburb"]),
        state:    norm(r["state"]    || r["State"]),
        postcode: norm(r["postcode"] || r["Postcode"]),
        country:  norm(r["country"]  || r["Country"]  || "Australia"),
      },

      // ── membership (nested) ────────────────────────────────────────────────
      membership: {
        joinDate:       toDate(norm(r["joinDate"] || r["Join Date"])) ?? today,
        membershipType: norm(r["membershipType"] || r["Membership Type"] || "senior"),
        status:         norm(r["membershipStatus"] || r["Membership Status"] || "Active"),
        expiryDate:     toDate(norm(r["expiryDate"] || r["Expiry Date"])) ?? null,
        renewalDate:    toDate(norm(r["renewalDate"] || r["Renewal Date"])) ?? null,
      },

      // ── roles (array) ──────────────────────────────────────────────────────
      roles,

      // ── playerInfo (nested) ────────────────────────────────────────────────
      playerInfo: {
        primaryPosition:   norm(r["primaryPosition"]   || r["Primary Position"]),
        secondaryPosition: norm(r["secondaryPosition"] || r["Secondary Position"]),
        jerseyNumber:      norm(r["jerseyNumber"] || r["Jersey Number"])   || null,
        preferredFoot:     norm(r["preferredFoot"] || r["Preferred Foot"]) || null,
        position:          norm(r["position"] || r["Position"]),
      },

      // ── socialMedia (nested) ───────────────────────────────────────────────
      socialMedia: {
        facebook:  norm(r["facebook"]  || r["Facebook"]),
        instagram: norm(r["instagram"] || r["Instagram"]),
        twitter:   norm(r["twitter"]   || r["Twitter"]),
        tiktok:    norm(r["tiktok"]    || r["TikTok"]),
        linkedin:  norm(r["linkedin"]  || r["LinkedIn"]),
      },

      // ── communicationPreferences (nested) ──────────────────────────────────
      communicationPreferences: {
        preferredMethod:     norm(r["preferredMethod"]     || r["Preferred Method"]     || "Email"),
        emailFrequency:      norm(r["emailFrequency"]      || r["Email Frequency"]      || "All"),
        smsNotifications:    toBool(norm(r["smsNotifications"]    || r["SMS Notifications"]    || "true")),
        pushNotifications:   toBool(norm(r["pushNotifications"]   || r["Push Notifications"]   || "true")),
        socialMediaUpdates:  toBool(norm(r["socialMediaUpdates"]  || r["Social Media Updates"])),
      },

      // ── medical (nested) ───────────────────────────────────────────────────
      medical: {
        conditions:  norm(r["medicalConditions"]  || r["Medical Conditions"]),
        medications: norm(r["medicalMedications"] || r["Medications"]),
        allergies:   norm(r["medicalAllergies"]   || r["Allergies"]),
        doctorName:  norm(r["doctorName"]         || r["Doctor Name"]),
        doctorPhone: norm(r["doctorPhone"]        || r["Doctor Phone"]),
      },

      // ── healthcare (nested) ────────────────────────────────────────────────
      healthcare: {
        medicare: {
          number:      norm(r["medicareNumber"]      || r["Medicare Number"]),
          position:    norm(r["medicarePosition"]    || r["Medicare Position"]),
          expiryMonth: norm(r["medicareExpiryMonth"] || r["Medicare Expiry Month"]),
          expiryYear:  norm(r["medicareExpiryYear"]  || r["Medicare Expiry Year"]),
        },
        privateHealth: {
          provider:         norm(r["privateHealthProvider"]   || r["Private Health Provider"]),
          membershipNumber: norm(r["privateHealthNumber"]     || r["Private Health Number"]),
          expiryDate:       toDate(norm(r["privateHealthExpiry"] || r["Private Health Expiry"])) ?? null,
        },
      },

      // ── emergencyContacts (array) ──────────────────────────────────────────
      emergencyContacts,
      familyRelationships: existing?.familyRelationships ?? [],

      // ── notes (plain string) ───────────────────────────────────────────────
      notes: norm(r["notes"] || r["Notes"]) || existing?.notes || "",

      // ── status (ban tracking — default safe values) ────────────────────────
      status: existing?.status ?? {
        banned:      false,
        bannedUntil: null,
        banReason:   null,
        bannedBy:    null,
      },

      // ── Misc preserved ────────────────────────────────────────────────────
      teams:  existing?.teams  ?? [],
      family: existing?.family ?? null,
      userId: existing?.userId ?? null,

      updatedAt: new Date(),
      updatedBy: "bulk-import",
    };

    if (existing) {
      const { _id, memberId: _m, createdAt, createdBy, migratedFrom, ...update } = doc;
      await db.collection("members").updateOne({ _id: existing._id }, { $set: update });
      result.updated++;
    } else {
      await db.collection("members").insertOne({
        ...doc,
        createdAt: new Date(),
        createdBy: "bulk-import",
      });
      result.imported++;
    }
  }

  return result;
}

async function importPlayers(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const firstName = norm(r["firstName"] || r["First Name"]);
    const lastName  = norm(r["lastName"]  || r["Last Name"]);

    if (!firstName || !lastName) {
      result.errors.push({ row: i + 2, message: "Missing required fields: firstName, lastName" });
      continue;
    }

    const dob = toDate(norm(r["dateOfBirth"] || r["Date of Birth"] || r["DOB"]));
    if (!dob) {
      result.errors.push({ row: i + 2, message: "Missing or invalid dateOfBirth (use DD/MM/YYYY or YYYY-MM-DD)" });
      continue;
    }

    // ── Resolve club ──────────────────────────────────────────────────────────
    const clubName  = norm(r["clubName"] || r["Club Name"]);
    const clubIdRaw = norm(r["clubId"]   || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({
        $or: [{ name: clubName }, { shortName: clubName }, { slug: generateSlug(clubName) }],
      });
      clubId = club?.id ?? null;
    }

    // ── Deduplicate: email first, then name+DOB ───────────────────────────────
    const email = norm(r["email"] || r["Email"]);
    const existing = email
      ? await db.collection("players").findOne({ email })
      : await db.collection("players").findOne({ firstName, lastName, dateOfBirth: dob });

    // ── Registration number — auto-increment if not supplied ─────────────────
    let registrationNumber = norm(r["registrationNumber"] || r["Registration Number"] || r["memberNumber"] || r["Member Number"]);
    if (!registrationNumber && !existing) {
      const last = await db
        .collection("players")
        .find({ registrationNumber: { $exists: true, $ne: "" } })
        .sort({ registrationNumber: -1 })
        .limit(1)
        .toArray();
      const lastNum = last[0]?.registrationNumber ? parseInt(last[0].registrationNumber, 10) : 1000;
      registrationNumber = String(isNaN(lastNum) ? 1001 : lastNum + 1);
    }

    const today = new Date().toISOString().split("T")[0];

    // ── Build emergency contact if columns provided ───────────────────────────
    const ecName  = norm(r["emergencyContactName"]  || r["Emergency Contact Name"]);
    const ecPhone = norm(r["emergencyContactPhone"] || r["Emergency Contact Phone"]);
    const emergencyContacts = ecName
      ? [{
          id:           `emergency-${Date.now()}-${uid()}`,
          name:         ecName,
          relationship: norm(r["emergencyContactRelationship"] || r["Emergency Contact Relationship"]),
          phone:        ecPhone,
          email:        norm(r["emergencyContactEmail"] || r["Emergency Contact Email"]),
        }]
      : existing?.emergencyContacts ?? [];

    // ── Flat document matching real DB schema ─────────────────────────────────
    const doc: Record<string, unknown> = {
      // ── Personal (flat top-level) ──────────────────────────────────────────
      firstName,
      lastName,
      preferredName:    norm(r["preferredName"]    || r["Preferred Name"])    || firstName,
      dateOfBirth:      dob,
      gender:           norm(r["gender"]           || r["Gender"]),
      email,
      phone:            norm(r["phone"]            || r["Phone"] || r["mobile"] || r["Mobile"]),

      // ── Address (flat top-level) ───────────────────────────────────────────
      street:   norm(r["street"]   || r["Street"]   || r["address"] || r["Address"]),
      suburb:   norm(r["suburb"]   || r["Suburb"]),
      city:     norm(r["city"]     || r["City"]     || r["suburb"]  || r["Suburb"]),
      state:    norm(r["state"]    || r["State"]),
      postcode: norm(r["postcode"] || r["Postcode"]),
      country:  norm(r["country"]  || r["Country"]  || "Australia"),

      // ── Club / association ─────────────────────────────────────────────────
      clubId,
      teamIds: existing?.teamIds ?? [],

      // ── Playing details ────────────────────────────────────────────────────
      primaryPosition:   norm(r["primaryPosition"]   || r["Primary Position"]   || r["position"] || r["Position"]),
      secondaryPosition: norm(r["secondaryPosition"] || r["Secondary Position"]),

      // ── Registration ───────────────────────────────────────────────────────
      registrationStatus: norm(r["registrationStatus"] || r["Registration Status"] || "pending"),
      registrationDate:   norm(r["registrationDate"]   || r["Registration Date"])  || new Date().toISOString(),

      // ── Club sub-object ────────────────────────────────────────────────────
      club: {
        registrationDate:    norm(r["clubRegistrationDate"]    || r["Club Registration Date"]     || today),
        registrationEndDate: norm(r["clubRegistrationEndDate"] || r["Club Registration End Date"]  || `${new Date().getFullYear()}-12-30`),
        registrationNumber:  norm(r["clubRegistrationNumber"]  || r["Club Registration Number"]),
        memberNumber:        norm(r["memberNumber"] || r["Member Number"]) || existing?.club?.memberNumber || registrationNumber,
        transferHistory:     existing?.club?.transferHistory ?? [],
      },

      // ── Medical (nested) ───────────────────────────────────────────────────
      medical: {
        conditions:       norm(r["medicalConditions"]  || r["Medical Conditions"]),
        allergies:        norm(r["medicalAllergies"]   || r["Allergies"]),
        medications:      norm(r["medicalMedications"] || r["Medications"]),
        doctorName:       norm(r["doctorName"]         || r["Doctor Name"]),
        doctorPhone:      norm(r["doctorPhone"]        || r["Doctor Phone"]),
        healthFundName:   norm(r["healthFundName"]     || r["Health Fund"]),
        healthFundNumber: norm(r["healthFundNumber"]   || r["Health Fund Number"]),
        medicareNumber:   norm(r["medicareNumber"]     || r["Medicare Number"]),
      },

      // ── Emergency contacts ─────────────────────────────────────────────────
      emergencyContacts,
      guardians: existing?.guardians ?? [],

      // ── Consents ───────────────────────────────────────────────────────────
      consents: {
        photoConsent:              toBool(norm(r["photoConsent"]              || r["Photo Consent"])),
        mediaConsent:              toBool(norm(r["mediaConsent"]              || r["Media Consent"])),
        transportConsent:          toBool(norm(r["transportConsent"]          || r["Transport Consent"])),
        firstAidConsent:           toBool(norm(r["firstAidConsent"]           || r["First Aid Consent"])),
        emergencyTreatmentConsent: toBool(norm(r["emergencyTreatmentConsent"] || r["Emergency Treatment Consent"]) || "yes"),
        updatedAt: new Date().toISOString(),
      },

      // ── Status (nested) ────────────────────────────────────────────────────
      status: {
        current:             norm(r["statusCurrent"]          || r["Status"]             || "active"),
        registrationDate:    norm(r["statusRegistrationDate"] || r["Registration Date"]  || today),
        expiryDate:          norm(r["statusExpiryDate"]       || r["Expiry Date"]        || `${new Date().getFullYear()}-12-30`),
        renewalReminderDate: norm(r["renewalReminderDate"]    || r["Renewal Reminder Date"]),
        seasons:             existing?.status?.seasons ?? [],
        updatedAt:           new Date().toISOString(),
      },

      // ── Linked member & misc ───────────────────────────────────────────────
      linkedMemberId:      norm(r["linkedMemberId"] || r["Linked Member ID"]) || existing?.linkedMemberId || "",
      active:              true,
      documents:           existing?.documents           ?? [],
      notes:               existing?.notes               ?? [],
      playHistory:         existing?.playHistory         ?? [],
      teamSelectionHistory: existing?.teamSelectionHistory ?? [],

      updatedAt: new Date(),
    };

    // Preserve registrationNumber (don't overwrite if already set)
    if (registrationNumber) doc.registrationNumber = registrationNumber;

    if (existing) {
      const { _id, playerId: _pid, createdAt, ...update } = doc;
      await db.collection("players").updateOne({ _id: existing._id }, { $set: update });
      result.updated++;
    } else {
      await db.collection("players").insertOne({
        ...doc,
        playerId: `player-${Date.now()}-${uid()}`,
        createdAt: new Date(),
      });
      result.imported++;
    }
  }

  return result;
}

async function importUsers(db: Db, rows: ImportRow[]): Promise<ImportResult> {
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

async function importTeams(db: Db, rows: ImportRow[], isRep: boolean): Promise<ImportResult> {
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

    const query: Record<string, unknown> = { name, ageGroup, season };
    if (!isRep) query.clubId = clubId;

    const existing = await db.collection(collection).findOne(query);

    const doc: Record<string, unknown> = {
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
    const { response: authRes } = await requirePermission(req, "system.manage");
    if (authRes) return authRes;

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
      // "players" redirects to members — members collection is the source of truth
      case "players":      result = await importMembers(db, rows);       break;
      case "users":        result = await importUsers(db, rows);         break;
      case "teams":        result = await importTeams(db, rows, false);  break;
      case "rep-teams":    result = await importTeams(db, rows, true);   break;
      default:
        return NextResponse.json({ error: `Unknown entity type: ${entity}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Bulk import error:", err);
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
