import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import type { TournamentFeeCategory } from "@/types/teamTournament";
import type { ImportResult, ImportRow } from "@/lib/bulk-import/types";
import { norm, uid, toDate } from "@/lib/bulk-import/helpers";
import { CreateCompetitionAwardBodySchema } from "@/lib/db/schemas/competitionAwards.schema";
import {
  fetchMemberDisplayName,
  insertCompetitionAward,
  upsertPlayerOfMatchAward,
  mergeAwardsLabels,
  labelForAwardType,
  DEFAULT_AWARDS_LABELS,
  DEFAULT_AWARDS_LABELS_LEAGUE,
  validateLeagueAwardMember,
  validateTournamentAwardMember,
  resolveTeamName,
} from "@/lib/competitions/competitionAwards";

function splitList(v: string): string[] {
  return v
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function importAssociationRegistrations(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const associationId = norm(r["associationId"] || r["Association ID"]);
    const memberId = norm(r["memberId"] || r["Member ID"]);
    const seasonYear = norm(r["seasonYear"] || r["Season Year"] || r["season"]);
    if (!associationId || !memberId || !seasonYear) {
      result.errors.push({ row: i + 2, message: "associationId, memberId, and seasonYear are required" });
      continue;
    }
    const assoc = await db.collection("associations").findOne({ associationId });
    const associationName = norm(r["associationName"]) || (assoc?.name as string) || associationId;
    const regId =
      norm(r["registrationId"]) ||
      `AREG-BULK-${associationId}-${memberId}-${seasonYear}-${uid()}`;
    const status = norm(r["status"] || "active");
    const roleIds = splitList(norm(r["roleIds"] || r["Roles"] || ""));
    const ageCategory = norm(r["ageCategory"] || r["Age Category"] || "senior");
    const playerClassification = norm(r["playerClassification"] || "");

    const doc = {
      registrationId: regId,
      memberId,
      associationId,
      associationName,
      seasonYear,
      status,
      roleIds: roleIds.length ? roleIds : ["role-player"],
      ageCategory,
      playerClassification,
      fees: [],
      registeredDate: new Date(),
      approvedDate: status === "active" ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ex = await db.collection("association-registrations").findOne({ registrationId: regId });
    if (ex) {
      await db.collection("association-registrations").updateOne({ registrationId: regId }, { $set: doc });
      result.updated++;
    } else {
      await db.collection("association-registrations").insertOne(doc);
      result.imported++;
    }

    await db.collection("members").updateOne(
      { memberId },
      {
        $addToSet: {
          associationRegistrations: {
            registrationId: regId,
            associationId,
            associationName,
            seasonYear,
            status,
          },
        } as never,
      },
    );
  }
  return result;
}

export async function importClubRegistrations(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const clubId = norm(r["clubId"] || r["Club ID"]);
    const memberId = norm(r["memberId"] || r["Member ID"]);
    const seasonYear = norm(r["seasonYear"] || r["Season Year"] || r["season"]);
    const registrationType = norm(r["registrationType"] || r["Registration Type"] || "primary") as
      | "primary"
      | "secondary";
    if (!clubId || !memberId || !seasonYear) {
      result.errors.push({ row: i + 2, message: "clubId, memberId, and seasonYear are required" });
      continue;
    }
    const club = await db.collection("clubs").findOne({ id: clubId });
    const clubName = norm(r["clubName"]) || (club?.name as string) || clubId;
    const regId = norm(r["registrationId"]) || `CREG-BULK-${clubId}-${memberId}-${seasonYear}-${uid()}`;
    const status = norm(r["status"] || "pending");
    const roleIds = splitList(norm(r["roleIds"] || r["Roles"] || ""));
    const doc = {
      registrationId: regId,
      memberId,
      clubId,
      clubName,
      registrationType,
      seasonYear,
      status,
      roleIds: roleIds.length ? roleIds : [],
      ageCategory: norm(r["ageCategory"] || r["Age Category"] || ""),
      fees: [],
      membershipType: norm(r["membershipType"] || r["Membership Type"] || "senior"),
      registeredDate: new Date(),
      approvedDate: status === "active" ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ex = await db.collection("club-registrations").findOne({ registrationId: regId });
    if (ex) {
      await db.collection("club-registrations").updateOne({ registrationId: regId }, { $set: doc });
      result.updated++;
    } else {
      await db.collection("club-registrations").insertOne(doc);
      result.imported++;
    }
    await db.collection("members").updateOne(
      { memberId },
      {
        $addToSet: {
          clubRegistrations: {
            registrationId: regId,
            clubId,
            clubName,
            registrationType,
            seasonYear,
            status,
          },
        } as never,
      },
    );
  }
  return result;
}

export async function importLeagueVenues(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const seasonCompetitionId = norm(r["seasonCompetitionId"] || r["Season Competition ID"]);
    const clubId = norm(r["clubId"] || r["Club ID"]);
    const venueName = norm(r["venueName"] || r["Venue"]);
    if (!seasonCompetitionId || !clubId || !venueName) {
      result.errors.push({
        row: i + 2,
        message: "seasonCompetitionId, clubId, and venueName are required",
      });
      continue;
    }
    const entry = {
      clubId,
      venueName,
      addressLine: norm(r["addressLine"] || r["Address"] || ""),
      notes: norm(r["notes"] || r["Notes"] || ""),
    };
    const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
    if (!sc) {
      result.errors.push({ row: i + 2, message: "Season competition not found" });
      continue;
    }
    const existing = ((sc as { clubNominatedVenues?: unknown[] }).clubNominatedVenues ?? []) as {
      clubId: string;
      venueName: string;
      addressLine?: string;
      notes?: string;
    }[];
    const filtered = existing.filter((v) => !(v.clubId === clubId && v.venueName === venueName));
    const next = [...filtered, entry];
    await db.collection("season_competitions").updateOne(
      { seasonCompetitionId },
      { $set: { clubNominatedVenues: next, updatedAt: new Date() } },
    );
    result.imported++;
  }
  return result;
}

export async function importTournaments(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tournamentId = norm(r["tournamentId"] || r["Tournament ID"]) || `tmt-${uid()}`;
    const season = norm(r["season"] || r["Season"]);
    const ageGroup = norm(r["ageGroup"] || r["Age Group"]);
    const title = norm(r["title"] || r["Title"]);
    const startDate = norm(r["startDate"] || r["Start Date"]);
    const endDate = norm(r["endDate"] || r["End Date"]);
    const location = norm(r["location"] || r["Location"]);
    if (!season || !ageGroup || !title || !startDate || !endDate || !location) {
      result.errors.push({
        row: i + 2,
        message: "season, ageGroup, title, startDate, endDate, location are required",
      });
      continue;
    }
    const hostType = (norm(r["hostType"] || "association") || "association") as "association" | "club";
    const hostId = norm(r["hostId"] || r["Host ID"]);
    const brandingAssociationId = norm(r["brandingAssociationId"] || r["Branding Association ID"]) || hostId;
    if (!hostId) {
      result.errors.push({ row: i + 2, message: "hostId is required" });
      continue;
    }
    const gender = norm(r["gender"] || "mixed") as "male" | "female" | "mixed";
    const doc = {
      tournamentId,
      season,
      ageGroup,
      gender,
      title,
      startDate,
      endDate,
      location,
      additionalInfo: norm(r["additionalInfo"] || r["HTML"] || ""),
      hostType,
      hostId,
      brandingAssociationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const ex = await db.collection("rep_tournaments").findOne({ tournamentId });
    if (ex) {
      await db.collection("rep_tournaments").updateOne({ tournamentId }, { $set: { ...doc, updatedAt: new Date().toISOString() } });
      result.updated++;
    } else {
      await db.collection("rep_tournaments").insertOne(doc);
      result.imported++;
    }
  }
  return result;
}

export async function importTournamentFixtures(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tournamentId = norm(r["tournamentId"] || r["Tournament ID"]);
    const fixtureId = norm(r["fixtureId"] || r["Fixture ID"]);
    if (!tournamentId || !fixtureId) {
      result.errors.push({ row: i + 2, message: "tournamentId and fixtureId are required" });
      continue;
    }
    const phase = (norm(r["phase"] || "pool") as "pool" | "knockout") || "pool";
    const poolRound = parseInt(norm(r["poolRound"] || r["Pool Round"] || "1"), 10) || 1;
    const sequence = parseInt(norm(r["sequence"] || "0"), 10) || 0;
    const doc = {
      fixtureId,
      tournamentId,
      phase,
      poolRound,
      sequence,
      homeTeamName: norm(r["homeTeamName"] || r["Home"]) || null,
      awayTeamName: norm(r["awayTeamName"] || r["Away"]) || null,
      homeEntryId: null,
      awayEntryId: null,
      homeTeamId: null,
      awayTeamId: null,
      status: norm(r["status"] || "scheduled") || "scheduled",
      published:
        norm(r["published"]).toLowerCase() === "true" || norm(r["published"]) === "1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ex = await db.collection("rep_tournament_fixtures").findOne({ tournamentId, fixtureId });
    if (ex) {
      await db.collection("rep_tournament_fixtures").updateOne({ tournamentId, fixtureId }, { $set: doc });
      result.updated++;
    } else {
      await db.collection("rep_tournament_fixtures").insertOne(doc);
      result.imported++;
    }
  }
  return result;
}

export async function importTournamentResults(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tournamentId = norm(r["tournamentId"] || r["Tournament ID"]);
    const fixtureId = norm(r["fixtureId"] || r["Fixture ID"]);
    const homeScore = parseInt(norm(r["homeScore"] || r["Home Score"] || "0"), 10);
    const awayScore = parseInt(norm(r["awayScore"] || r["Away Score"] || "0"), 10);
    if (!tournamentId || !fixtureId) {
      result.errors.push({ row: i + 2, message: "tournamentId and fixtureId are required" });
      continue;
    }
    const res = await db.collection("rep_tournament_fixtures").updateOne(
      { tournamentId, fixtureId },
      {
        $set: {
          "result.homeScore": homeScore,
          "result.awayScore": awayScore,
          "result.resultType": norm(r["resultType"] || "normal") || "normal",
          resultStatus: norm(r["resultStatus"] || r["Result Status"] || "submitted") || "submitted",
          status: "completed",
          updatedAt: new Date(),
        },
      },
    );
    if (res.matchedCount === 0) {
      result.errors.push({ row: i + 2, message: "Fixture not found" });
      continue;
    }
    result.updated++;
  }
  return result;
}

export async function importLeagueFixtureResults(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const seasonCompetitionId = norm(r["seasonCompetitionId"] || r["Season Competition ID"]);
    const fixtureId = norm(r["fixtureId"] || r["Fixture ID"]);
    const homeScore = parseInt(norm(r["homeScore"] || "0"), 10);
    const awayScore = parseInt(norm(r["awayScore"] || "0"), 10);
    if (!seasonCompetitionId || !fixtureId) {
      result.errors.push({ row: i + 2, message: "seasonCompetitionId and fixtureId are required" });
      continue;
    }
    const patch: Record<string, unknown> = {
      "result.homeScore": homeScore,
      "result.awayScore": awayScore,
      "result.resultType": norm(r["resultType"] || "normal") || "normal",
      resultStatus: norm(r["resultStatus"] || "submitted") || "submitted",
      status: norm(r["matchStatus"] || r["status"] || "completed") || "completed",
      updatedAt: new Date(),
    };
    const res = await db.collection("league_fixtures").updateOne({ seasonCompetitionId, fixtureId }, { $set: patch });
    if (res.matchedCount === 0) {
      result.errors.push({ row: i + 2, message: "League fixture not found" });
      continue;
    }
    result.updated++;
  }
  return result;
}

export async function importCompetitionAwardsBulk(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const raw = {
      awardType: norm(r["awardType"] || r["Award Type"]),
      fixtureId: norm(r["fixtureId"] || r["Fixture ID"]) || null,
      memberId: norm(r["memberId"] || r["Member ID"]),
      teamId: norm(r["teamId"] || r["Team ID"]) || null,
      notes: norm(r["notes"]) || null,
    };
    const parsed = CreateCompetitionAwardBodySchema.safeParse({
      awardType: raw.awardType,
      fixtureId: raw.fixtureId === "" ? null : raw.fixtureId,
      memberId: raw.memberId,
      teamId: raw.teamId === "" ? null : raw.teamId,
      notes: raw.notes,
    });
    if (!parsed.success) {
      result.errors.push({ row: i + 2, message: parsed.error.flatten().formErrors.join("; ") });
      continue;
    }
    const body = parsed.data;
    const context = norm(r["context"] || r["Context"]) as "league" | "tournament";
    const seasonCompetitionId = norm(r["seasonCompetitionId"] || r["Season Competition ID"]) || null;
    const tournamentId = norm(r["tournamentId"] || r["Tournament ID"]) || null;

    const memberDisplayName = await fetchMemberDisplayName(db, body.memberId);
    const teamId = body.teamId != null ? String(body.teamId).trim() : null;
    const teamName = await resolveTeamName(db, teamId);

    try {
      if (context === "league") {
        if (!seasonCompetitionId) throw new Error("seasonCompetitionId required for league");
        const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId });
        if (!sc) throw new Error("Season competition not found");
        const rawLabels = (sc as { awardsLabels?: unknown }).awardsLabels;
        const labels = mergeAwardsLabels(
          typeof rawLabels === "object" && rawLabels !== null ? (rawLabels as Record<string, string>) : {},
          DEFAULT_AWARDS_LABELS_LEAGUE,
        );
        const snapshot = norm(r["awardLabelSnapshot"]) || labelForAwardType(body.awardType, labels);
        if (body.awardType === "player_of_match") {
          const fixtureId = String(body.fixtureId ?? "");
          const fx = await db.collection("league_fixtures").findOne({ seasonCompetitionId, fixtureId });
          if (!fx) throw new Error("Fixture not found");
          const v = await validateLeagueAwardMember(
            db,
            seasonCompetitionId,
            body.awardType,
            fixtureId,
            body.memberId,
            teamId,
            String(fx.homeTeamId ?? ""),
            String(fx.awayTeamId ?? ""),
          );
          if (!v.ok) throw new Error(v.error);
          await upsertPlayerOfMatchAward(db, {
            context: "league",
            seasonCompetitionId,
            tournamentId: null,
            fixtureId,
            awardType: "player_of_match",
            memberId: body.memberId,
            memberDisplayName,
            teamId,
            teamName,
            awardLabelSnapshot: snapshot,
            notes: body.notes ?? null,
            createdBy: "bulk-import",
          });
        } else {
          const v = await validateLeagueAwardMember(
            db,
            seasonCompetitionId,
            body.awardType,
            null,
            body.memberId,
            teamId,
            "",
            "",
          );
          if (!v.ok) throw new Error(v.error);
          await insertCompetitionAward(db, {
            context: "league",
            seasonCompetitionId,
            tournamentId: null,
            awardType: body.awardType,
            fixtureId: null,
            memberId: body.memberId,
            memberDisplayName,
            teamId,
            teamName,
            awardLabelSnapshot: snapshot,
            notes: body.notes ?? null,
            createdBy: "bulk-import",
          });
        }
      } else {
        if (!tournamentId) throw new Error("tournamentId required for tournament");
        const t = await db.collection("rep_tournaments").findOne({ tournamentId });
        if (!t) throw new Error("Tournament not found");
        const rawLabels = (t as { awardsLabels?: unknown }).awardsLabels;
        const labels = mergeAwardsLabels(
          typeof rawLabels === "object" && rawLabels !== null ? (rawLabels as Record<string, string>) : {},
          DEFAULT_AWARDS_LABELS,
        );
        const snapshot = norm(r["awardLabelSnapshot"]) || labelForAwardType(body.awardType, labels);
        if (body.awardType === "player_of_match") {
          const fixtureId = String(body.fixtureId ?? "");
          const fx = await db.collection("rep_tournament_fixtures").findOne({ tournamentId, fixtureId });
          if (!fx) throw new Error("Fixture not found");
          const v = await validateTournamentAwardMember(
            db,
            tournamentId,
            body.awardType,
            fixtureId,
            body.memberId,
            teamId,
            fx.homeTeamId != null ? String(fx.homeTeamId) : null,
            fx.awayTeamId != null ? String(fx.awayTeamId) : null,
          );
          if (!v.ok) throw new Error(v.error);
          await upsertPlayerOfMatchAward(db, {
            context: "tournament",
            seasonCompetitionId: null,
            tournamentId,
            fixtureId,
            awardType: "player_of_match",
            memberId: body.memberId,
            memberDisplayName,
            teamId,
            teamName,
            awardLabelSnapshot: snapshot,
            notes: body.notes ?? null,
            createdBy: "bulk-import",
          });
        } else {
          const v = await validateTournamentAwardMember(
            db,
            tournamentId,
            body.awardType,
            null,
            body.memberId,
            teamId,
            null,
            null,
          );
          if (!v.ok) throw new Error(v.error);
          await insertCompetitionAward(db, {
            context: "tournament",
            seasonCompetitionId: null,
            tournamentId,
            awardType: body.awardType,
            fixtureId: null,
            memberId: body.memberId,
            memberDisplayName,
            teamId,
            teamName,
            awardLabelSnapshot: snapshot,
            notes: body.notes ?? null,
            createdBy: "bulk-import",
          });
        }
      }
      result.imported++;
    } catch (e) {
      result.errors.push({
        row: i + 2,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return result;
}

export async function importNominations(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const windowId = norm(r["windowId"] || r["Window ID"]);
    const nomineeId = norm(r["nomineeId"] || r["Nominee ID"] || r["memberId"]);
    const nomineeType = (norm(r["nomineeType"] || r["Nominee Type"] || "member") as "member" | "user") || "member";
    if (!windowId || !nomineeId) {
      result.errors.push({ row: i + 2, message: "windowId and nomineeId are required" });
      continue;
    }
    const win = await db.collection("nomination_windows").findOne({ windowId });
    if (!win) {
      result.errors.push({ row: i + 2, message: "nomination window not found" });
      continue;
    }
    const nomineeName = norm(r["nomineeName"] || r["Nominee Name"]) || nomineeId;
    const nominationId = norm(r["nominationId"]) || `nom-bulk-${uid()}`;
    const status = norm(r["status"] || "pending");
    const doc = {
      nominationId,
      windowId,
      season: String((win as { seasonYear?: string }).seasonYear ?? ""),
      ageGroup: String((win as { ageGroup?: string }).ageGroup ?? ""),
      clubId: (win as { scopeId?: string }).scopeId ?? "",
      clubName: (win as { scopeName?: string }).scopeName ?? "",
      nomineeId,
      nomineeName,
      nomineeType,
      memberId: nomineeType === "member" ? nomineeId : undefined,
      memberName: nomineeName,
      dateOfBirth: norm(r["dateOfBirth"] || ""),
      ageAtSeason: parseInt(norm(r["ageAtSeason"] || "0"), 10) || 0,
      nominatedBy: norm(r["nominatedBy"] || r["Nominator User ID"] || "bulk-import"),
      nominatedByName: norm(r["nominatedByName"] || r["Nominator Name"] || "Bulk import"),
      statement: norm(r["statement"] || r["Statement"] || ""),
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const ex = await db.collection("rep_nominations").findOne({ nominationId });
    if (ex) {
      await db.collection("rep_nominations").updateOne({ nominationId }, { $set: doc });
      result.updated++;
    } else {
      await db.collection("rep_nominations").insertOne(doc);
      result.imported++;
    }
  }
  return result;
}

export async function importFees(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const ownerType = norm(r["ownerType"] || r["Owner Type"]) as "association" | "club";
    const ownerId = norm(r["ownerId"] || r["Owner ID"]);
    const feesJson = norm(r["feesJson"] || r["Fees JSON"]);
    if (!ownerType || !ownerId || !feesJson) {
      result.errors.push({ row: i + 2, message: "ownerType, ownerId, and feesJson are required" });
      continue;
    }
    let fees: unknown;
    try {
      fees = JSON.parse(feesJson);
    } catch {
      result.errors.push({ row: i + 2, message: "feesJson must be valid JSON" });
      continue;
    }
    const collection = ownerType === "association" ? "associations" : "clubs";
    const filter =
      ownerType === "association" ? { associationId: ownerId } : { $or: [{ id: ownerId }, { slug: ownerId }] };
    const res = await db.collection(collection).updateOne(filter, {
      $set: { fees, updatedAt: new Date().toISOString() },
    });
    if (res.matchedCount === 0) {
      result.errors.push({ row: i + 2, message: "Owner not found" });
      continue;
    }
    result.updated++;
  }
  return result;
}

export async function importTournamentFees(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const entryId = norm(r["entryId"] || r["Entry ID"]);
    if (!entryId) {
      result.errors.push({ row: i + 2, message: "entryId is required" });
      continue;
    }
    const item = {
      itemId: norm(r["itemId"]) || `item-${Date.now()}`,
      category: (norm(r["category"] || "other") || "other") as TournamentFeeCategory,
      name: norm(r["name"] || r["Item Name"] || "Imported fee"),
      description: norm(r["description"] || ""),
      totalAmountCents: parseInt(norm(r["totalAmountCents"] || r["Amount Cents"] || "0"), 10) || 0,
      splitMethod: (norm(r["splitMethod"] || "equal") as "equal" | "manual") || "equal",
      gstIncluded: norm(r["gstIncluded"]) === "true" || norm(r["gstIncluded"]) === "1",
    };
    const entry = await db.collection("team_tournament_entries").findOne({ entryId });
    if (!entry) {
      result.errors.push({ row: i + 2, message: "team_tournament_entries row not found" });
      continue;
    }
    const existing = ((entry as { feeItems?: unknown[] }).feeItems ?? []) as unknown[];
    await db.collection("team_tournament_entries").updateOne(
      { entryId },
      { $set: { feeItems: [...existing, item], updatedAt: new Date() } },
    );
    result.imported++;
  }
  return result;
}

export async function importNews(db: Db, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, updated: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const title = norm(r["title"] || r["Title"]);
    const content = norm(r["content"] || r["Body"] || r["HTML"]);
    const publishDate = norm(r["publishDate"] || r["Publish Date"]);
    const expiryDate = norm(r["expiryDate"] || r["Expiry Date"]);
    if (!title || !content || !publishDate || !expiryDate) {
      result.errors.push({ row: i + 2, message: "title, content, publishDate, expiryDate are required" });
      continue;
    }
    const scopeType = norm(r["scopeType"] || r["Scope"] || "platform") as
      | "platform"
      | "association"
      | "club";
    const scopeId = norm(r["scopeId"] || r["Scope ID"]) || null;
    const id = norm(r["id"]) || new ObjectId().toString();
    const imageUrl = norm(r["imageUrl"] || r["Image URL"] || r["image"] || r["Image"]) || "";
    const doc = {
      id,
      title,
      content,
      publishDate,
      expiryDate,
      author: norm(r["author"] || r["Author"] || "Bulk import"),
      active: norm(r["active"] || "true") !== "false",
      image: imageUrl,
      imageUrl,
      videoUrl: norm(r["videoUrl"] || "") || "",
      scopeType,
      scopeId,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ex = await db.collection("news").findOne({ id });
    if (ex) {
      await db.collection("news").updateOne({ id }, { $set: { ...doc, updatedAt: new Date() } });
      result.updated++;
    } else {
      await db.collection("news").insertOne(doc);
      result.imported++;
    }
  }
  return result;
}
