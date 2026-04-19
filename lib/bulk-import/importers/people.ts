import type { Db } from "mongodb";
import bcrypt from "bcryptjs";
import { generateSlug } from "@/lib/utils/slug";
import type { ImportResult, ImportRow } from "@/lib/bulk-import/types";
import { norm, uid, toDate, toBool } from "@/lib/bulk-import/helpers";
import type { ImportRuntimeContext } from "@/lib/bulk-import/helpers";

export async function importMembers(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const firstName = norm(r["firstName"] || r["First Name"]);
    const lastName = norm(r["lastName"] || r["Last Name"]);
    if (!firstName || !lastName) {
      result.errors.push({ row: i + 2, message: "Missing required fields: firstName, lastName" });
      continue;
    }

    const primaryEmail = norm(r["primaryEmail"] || r["Email"] || r["email"]);
    const dob = toDate(norm(r["dateOfBirth"] || r["Date of Birth"] || r["DOB"]));
    const today = new Date().toISOString().split("T")[0];

    const clubName = norm(r["clubName"] || r["Club Name"]);
    const clubIdRaw = norm(r["clubId"] || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({
        $or: [{ name: clubName }, { shortName: clubName }, { slug: generateSlug(clubName) }],
      });
      clubId = (club?.id as string | undefined) ?? null;
    }

    const existing = primaryEmail
      ? await db.collection("members").findOne({ "contact.primaryEmail": primaryEmail })
      : await db.collection("members").findOne({
          "personalInfo.firstName": firstName,
          "personalInfo.lastName": lastName,
          "personalInfo.dateOfBirth": dob,
        });

    const memberId =
      (existing?.memberId as string | undefined) ||
      norm(r["memberId"] || r["Member ID"]) ||
      `MBR-${uid().toUpperCase()}`;

    const rolesRaw = norm(r["roles"] || r["Roles"]);
    const roles = rolesRaw
      ? rolesRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : (existing?.roles as string[]) ?? ["role-player"];

    const ecName = norm(r["emergencyContactName"] || r["Emergency Contact Name"]);
    const ecRelation = norm(r["emergencyContactRelationship"] || r["Emergency Contact Relationship"]);
    const ecPhone = norm(r["emergencyContactPhone"] || r["Emergency Contact Phone"]);
    const ecMobile = norm(r["emergencyContactMobile"] || r["Emergency Contact Mobile"]);
    const ecEmail = norm(r["emergencyContactEmail"] || r["Emergency Contact Email"]);

    const emergencyContacts = ecName
      ? [
          {
            contactId: `emerg-${Date.now()}`,
            priority: 1,
            name: ecName,
            relationship: ecRelation,
            phone: ecPhone,
            mobile: ecMobile,
            email: ecEmail,
          },
        ]
      : (existing?.emergencyContacts as unknown[]) ?? [];

    const doc: Record<string, unknown> = {
      memberId,
      clubId,
      personalInfo: {
        firstName,
        lastName,
        displayName: norm(r["displayName"] || r["Display Name"]) || `${firstName} ${lastName}`,
        dateOfBirth: dob ?? "",
        gender: norm(r["gender"] || r["Gender"]),
        photoUrl: (existing as { personalInfo?: { photoUrl?: string } })?.personalInfo?.photoUrl ?? "",
        socialMedia: (existing as { personalInfo?: { socialMedia?: unknown[] } })?.personalInfo?.socialMedia ?? [],
      },
      contact: {
        primaryEmail,
        emailOwnership: norm(r["emailOwnership"] || r["Email Ownership"] || "Own"),
        additionalEmails:
          (existing as { contact?: { additionalEmails?: unknown[] } })?.contact?.additionalEmails ?? [],
        phone: norm(r["phone"] || r["Phone"]),
        mobile: norm(r["mobile"] || r["Mobile"] || r["phone"] || r["Phone"]),
        emergencyContact: {
          name: ecName || (existing as { contact?: { emergencyContact?: { name?: string } } })?.contact?.emergencyContact?.name || "",
          relationship:
            ecRelation ||
            (existing as { contact?: { emergencyContact?: { relationship?: string } } })?.contact?.emergencyContact?.relationship ||
            "",
          phone:
            ecPhone ||
            (existing as { contact?: { emergencyContact?: { phone?: string } } })?.contact?.emergencyContact?.phone ||
            "",
        },
      },
      address: {
        street: norm(r["street"] || r["Street"] || r["address"] || r["Address"]),
        suburb: norm(r["suburb"] || r["Suburb"]),
        state: norm(r["state"] || r["State"]),
        postcode: norm(r["postcode"] || r["Postcode"]),
        country: norm(r["country"] || r["Country"] || "Australia"),
      },
      membership: {
        joinDate: toDate(norm(r["joinDate"] || r["Join Date"])) ?? today,
        membershipType: norm(r["membershipType"] || r["Membership Type"] || "senior"),
        status: norm(r["membershipStatus"] || r["Membership Status"] || "Active"),
        expiryDate: toDate(norm(r["expiryDate"] || r["Expiry Date"])) ?? null,
        renewalDate: toDate(norm(r["renewalDate"] || r["Renewal Date"])) ?? null,
      },
      roles,
      playerInfo: {
        primaryPosition: norm(r["primaryPosition"] || r["Primary Position"]),
        secondaryPosition: norm(r["secondaryPosition"] || r["Secondary Position"]),
        jerseyNumber: norm(r["jerseyNumber"] || r["Jersey Number"]) || null,
        preferredFoot: norm(r["preferredFoot"] || r["Preferred Foot"]) || null,
        position: norm(r["position"] || r["Position"]),
      },
      socialMedia: {
        facebook: norm(r["facebook"] || r["Facebook"]),
        instagram: norm(r["instagram"] || r["Instagram"]),
        twitter: norm(r["twitter"] || r["Twitter"]),
        tiktok: norm(r["tiktok"] || r["TikTok"]),
        linkedin: norm(r["linkedin"] || r["LinkedIn"]),
      },
      communicationPreferences: {
        preferredMethod: norm(r["preferredMethod"] || r["Preferred Method"] || "Email"),
        emailFrequency: norm(r["emailFrequency"] || r["Email Frequency"] || "All"),
        smsNotifications: toBool(norm(r["smsNotifications"] || r["SMS Notifications"] || "true")),
        pushNotifications: toBool(norm(r["pushNotifications"] || r["Push Notifications"] || "true")),
        socialMediaUpdates: toBool(norm(r["socialMediaUpdates"] || r["Social Media Updates"])),
      },
      medical: {
        conditions: norm(r["medicalConditions"] || r["Medical Conditions"]),
        medications: norm(r["medicalMedications"] || r["Medications"]),
        allergies: norm(r["medicalAllergies"] || r["Allergies"]),
        doctorName: norm(r["doctorName"] || r["Doctor Name"]),
        doctorPhone: norm(r["doctorPhone"] || r["Doctor Phone"]),
      },
      healthcare: {
        medicare: {
          number: norm(r["medicareNumber"] || r["Medicare Number"]),
          position: norm(r["medicarePosition"] || r["Medicare Position"]),
          expiryMonth: norm(r["medicareExpiryMonth"] || r["Medicare Expiry Month"]),
          expiryYear: norm(r["medicareExpiryYear"] || r["Medicare Expiry Year"]),
        },
        privateHealth: {
          provider: norm(r["privateHealthProvider"] || r["Private Health Provider"]),
          membershipNumber: norm(r["privateHealthNumber"] || r["Private Health Number"]),
          expiryDate: toDate(norm(r["privateHealthExpiry"] || r["Private Health Expiry"])) ?? null,
        },
      },
      emergencyContacts,
      familyRelationships: (existing as { familyRelationships?: unknown[] })?.familyRelationships ?? [],
      notes: norm(r["notes"] || r["Notes"]) || (existing as { notes?: string })?.notes || "",
      status: (existing as { status?: unknown })?.status ?? {
        banned: false,
        bannedUntil: null,
        banReason: null,
        bannedBy: null,
      },
      teams: (existing as { teams?: unknown[] })?.teams ?? [],
      family: (existing as { family?: unknown })?.family ?? null,
      userId: (existing as { userId?: string })?.userId ?? null,
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

export async function importPlayers(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const firstName = norm(r["firstName"] || r["First Name"]);
    const lastName = norm(r["lastName"] || r["Last Name"]);

    if (!firstName || !lastName) {
      result.errors.push({ row: i + 2, message: "Missing required fields: firstName, lastName" });
      continue;
    }

    const dob = toDate(norm(r["dateOfBirth"] || r["Date of Birth"] || r["DOB"]));
    if (!dob) {
      result.errors.push({
        row: i + 2,
        message: "Missing or invalid dateOfBirth (use DD/MM/YYYY or YYYY-MM-DD)",
      });
      continue;
    }

    const clubName = norm(r["clubName"] || r["Club Name"]);
    const clubIdRaw = norm(r["clubId"] || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({
        $or: [{ name: clubName }, { shortName: clubName }, { slug: generateSlug(clubName) }],
      });
      clubId = (club?.id as string | undefined) ?? null;
    }

    const email = norm(r["email"] || r["Email"]);
    const existing = email
      ? await db.collection("players").findOne({ email })
      : await db.collection("players").findOne({ firstName, lastName, dateOfBirth: dob });

    let registrationNumber = norm(
      r["registrationNumber"] || r["Registration Number"] || r["memberNumber"] || r["Member Number"],
    );
    if (!registrationNumber && !existing) {
      const last = await db
        .collection("players")
        .find({ registrationNumber: { $exists: true, $ne: "" } })
        .sort({ registrationNumber: -1 })
        .limit(1)
        .toArray();
      const lastNum = last[0]?.registrationNumber ? parseInt(String(last[0].registrationNumber), 10) : 1000;
      registrationNumber = String(Number.isNaN(lastNum) ? 1001 : lastNum + 1);
    }

    const today = new Date().toISOString().split("T")[0];

    const ecName = norm(r["emergencyContactName"] || r["Emergency Contact Name"]);
    const ecPhone = norm(r["emergencyContactPhone"] || r["Emergency Contact Phone"]);
    const emergencyContacts = ecName
      ? [
          {
            id: `emergency-${Date.now()}-${uid()}`,
            name: ecName,
            relationship: norm(r["emergencyContactRelationship"] || r["Emergency Contact Relationship"]),
            phone: ecPhone,
            email: norm(r["emergencyContactEmail"] || r["Emergency Contact Email"]),
          },
        ]
      : (existing as { emergencyContacts?: unknown[] })?.emergencyContacts ?? [];

    const doc: Record<string, unknown> = {
      firstName,
      lastName,
      preferredName: norm(r["preferredName"] || r["Preferred Name"]) || firstName,
      dateOfBirth: dob,
      gender: norm(r["gender"] || r["Gender"]),
      email,
      phone: norm(r["phone"] || r["Phone"] || r["mobile"] || r["Mobile"]),
      street: norm(r["street"] || r["Street"] || r["address"] || r["Address"]),
      suburb: norm(r["suburb"] || r["Suburb"]),
      city: norm(r["city"] || r["City"] || r["suburb"] || r["Suburb"]),
      state: norm(r["state"] || r["State"]),
      postcode: norm(r["postcode"] || r["Postcode"]),
      country: norm(r["country"] || r["Country"] || "Australia"),
      clubId,
      teamIds: (existing as { teamIds?: unknown[] })?.teamIds ?? [],
      primaryPosition: norm(r["primaryPosition"] || r["Primary Position"] || r["position"] || r["Position"]),
      secondaryPosition: norm(r["secondaryPosition"] || r["Secondary Position"]),
      registrationStatus: norm(r["registrationStatus"] || r["Registration Status"] || "pending"),
      registrationDate: norm(r["registrationDate"] || r["Registration Date"]) || new Date().toISOString(),
      club: {
        registrationDate: norm(r["clubRegistrationDate"] || r["Club Registration Date"] || today),
        registrationEndDate:
          norm(r["clubRegistrationEndDate"] || r["Club Registration End Date"]) ||
          `${new Date().getFullYear()}-12-30`,
        registrationNumber: norm(r["clubRegistrationNumber"] || r["Club Registration Number"]),
        memberNumber:
          norm(r["memberNumber"] || r["Member Number"]) ||
          (existing as { club?: { memberNumber?: string } })?.club?.memberNumber ||
          registrationNumber,
        transferHistory: (existing as { club?: { transferHistory?: unknown[] } })?.club?.transferHistory ?? [],
      },
      medical: {
        conditions: norm(r["medicalConditions"] || r["Medical Conditions"]),
        allergies: norm(r["medicalAllergies"] || r["Allergies"]),
        medications: norm(r["medicalMedications"] || r["Medications"]),
        doctorName: norm(r["doctorName"] || r["Doctor Name"]),
        doctorPhone: norm(r["doctorPhone"] || r["Doctor Phone"]),
        healthFundName: norm(r["healthFundName"] || r["Health Fund"]),
        healthFundNumber: norm(r["healthFundNumber"] || r["Health Fund Number"]),
        medicareNumber: norm(r["medicareNumber"] || r["Medicare Number"]),
      },
      emergencyContacts,
      guardians: (existing as { guardians?: unknown[] })?.guardians ?? [],
      consents: {
        photoConsent: toBool(norm(r["photoConsent"] || r["Photo Consent"])),
        mediaConsent: toBool(norm(r["mediaConsent"] || r["Media Consent"])),
        transportConsent: toBool(norm(r["transportConsent"] || r["Transport Consent"])),
        firstAidConsent: toBool(norm(r["firstAidConsent"] || r["First Aid Consent"])),
        emergencyTreatmentConsent: toBool(
          norm(r["emergencyTreatmentConsent"] || r["Emergency Treatment Consent"]) || "yes",
        ),
        updatedAt: new Date().toISOString(),
      },
      status: {
        current: norm(r["statusCurrent"] || r["Status"] || "active"),
        registrationDate: norm(r["statusRegistrationDate"] || r["Registration Date"] || today),
        expiryDate:
          norm(r["statusExpiryDate"] || r["Expiry Date"]) || `${new Date().getFullYear()}-12-30`,
        renewalReminderDate: norm(r["renewalReminderDate"] || r["Renewal Reminder Date"]),
        seasons: (existing as { status?: { seasons?: unknown[] } })?.status?.seasons ?? [],
        updatedAt: new Date().toISOString(),
      },
      linkedMemberId:
        norm(r["linkedMemberId"] || r["Linked Member ID"]) ||
        (existing as { linkedMemberId?: string })?.linkedMemberId ||
        "",
      active: true,
      documents: (existing as { documents?: unknown[] })?.documents ?? [],
      notes: (existing as { notes?: unknown[] })?.notes ?? [],
      playHistory: (existing as { playHistory?: unknown[] })?.playHistory ?? [],
      teamSelectionHistory: (existing as { teamSelectionHistory?: unknown[] })?.teamSelectionHistory ?? [],
      updatedAt: new Date(),
    };

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

export async function importUsers(
  db: Db,
  rows: ImportRow[],
  ctx: ImportRuntimeContext,
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const email = norm(r["email"] || r["Email"]);
    const firstName = norm(r["firstName"] || r["First Name"] || r["first_name"]);
    const lastName = norm(r["lastName"] || r["Last Name"] || r["last_name"]);
    const role = norm(r["role"] || r["Role"] || "club-admin");

    if (!email) {
      result.errors.push({ row: i + 2, message: "Missing required field: email" });
      continue;
    }
    if (!firstName || !lastName) {
      result.errors.push({ row: i + 2, message: "Missing required fields: firstName, lastName" });
      continue;
    }

    const clubName = norm(r["clubName"] || r["Club Name"] || r["club"]);
    const clubIdRaw = norm(r["clubId"] || r["Club ID"]);
    let clubId: string | null = clubIdRaw || null;
    let clubSlug: string | null = null;
    if (!clubId && clubName) {
      const club = await db.collection("clubs").findOne({ $or: [{ name: clubName }, { shortName: clubName }] });
      clubId = (club?.id as string | undefined) ?? null;
      clubSlug = (club?.slug as string | undefined) ?? null;
    }

    const assocName = norm(r["associationName"] || r["Association Name"]);
    const assocIdRaw = norm(r["associationId"] || r["Association ID"]);
    let associationId: string | null = assocIdRaw || null;
    if (!associationId && assocName) {
      const assoc = await db.collection("associations").findOne({ $or: [{ name: assocName }, { shortName: assocName }] });
      associationId = (assoc?.associationId as string | undefined) ?? null;
    }

    const existing = await db.collection("users").findOne({ email });

    if (existing) {
      await db.collection("users").updateOne(
        { _id: existing._id },
        { $set: { firstName, lastName, role, clubId, clubSlug, associationId, updatedAt: new Date() } },
      );
      result.updated++;
    } else {
      const rowPwd = norm(r["initialPassword"] || r["Initial Password"]);
      const useStatic = ctx.allowStaticPassword && rowPwd.length >= 8;
      const tempPassword = useStatic ? rowPwd : `${Math.random().toString(36).slice(2, 10)}A1!`;
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
        forcePasswordChange: !useStatic,
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
