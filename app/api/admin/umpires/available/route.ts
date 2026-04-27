/**
 * GET /api/admin/umpires/available
 *
 * Returns all officials from the association's official register for a given
 * fixture, categorised by whether they have blocking COI issues, warnings only,
 * or are fully clear.
 *
 * Query parameters (all required):
 *   fixtureId            — ID of the league fixture
 *   seasonCompetitionId  — used to resolve the fixture and its association
 *
 * Response shape:
 *   {
 *     fixtureId, seasonCompetitionId, associationId,
 *     available:    OfficialEntry[],   // no blocking issues
 *     hasWarnings:  OfficialEntry[],   // warnings only (e.g. limited availability)
 *     blocked:      OfficialEntry[],   // one or more blocking issues
 *   }
 *
 * OfficialEntry:
 *   { officialRecordId, displayName, memberId, umpireNumber, primaryClubId,
 *     qualificationCodes, levelLabel, allocationAvailability, umpireId,
 *     issues: CoiIssue[] }
 *
 * Requires: competitions.manage | competitions.fixtures
 *           + resource access to the fixture's owningAssociationId
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import {
  evaluateFixtureUmpireAssignments,
  type ProposedUmpireSlot,
  type CoiIssue,
} from "@/lib/officiating/umpireCoiAndAvailability";

const REGISTER_COL = "association_official_register";

export interface OfficialEntry {
  officialRecordId: string;
  displayName: string;
  memberId: string | null;
  umpireNumber: string | null;
  primaryClubId: string | null;
  qualificationCodes: string[];
  levelLabel: string | null;
  allocationAvailability: string;
  /** The id value as it should be stored on fixture slots (memberId preferred). */
  umpireId: string;
  issues: CoiIssue[];
}

export async function GET(request: NextRequest) {
  const { response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const fixtureId = searchParams.get("fixtureId")?.trim();
  const seasonCompetitionId = searchParams.get("seasonCompetitionId")?.trim();

  if (!fixtureId || !seasonCompetitionId) {
    return NextResponse.json(
      { error: "fixtureId and seasonCompetitionId are required" },
      { status: 400 },
    );
  }

  const client = await clientPromise;
  const db = client.db();

  // ── Load fixture ────────────────────────────────────────────────────────────
  const fixture = await db.collection("league_fixtures").findOne({
    fixtureId,
    seasonCompetitionId,
  });
  if (!fixture) {
    return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
  }

  const associationId = String(fixture.owningAssociationId ?? "");
  const homeTeamId = String(fixture.homeTeamId ?? "");
  const awayTeamId = String(fixture.awayTeamId ?? "");

  // ── Scope check ─────────────────────────────────────────────────────────────
  const scope = await requireResourceAccess(request, "association", associationId);
  if (scope.response) return scope.response;

  // ── Load all active officials for the association ────────────────────────────
  const registerRows = await db
    .collection(REGISTER_COL)
    .find({ associationId, isActive: { $ne: false } })
    .sort({ displayName: 1 })
    .toArray();

  if (registerRows.length === 0) {
    return NextResponse.json({
      fixtureId,
      seasonCompetitionId,
      associationId,
      available: [],
      hasWarnings: [],
      blocked: [],
    });
  }

  // ── Build proposed slot array for batch COI evaluation ─────────────────────
  // We use a generic umpireType here — COI doesn't depend on slot type.
  const proposedUmpires: ProposedUmpireSlot[] = registerRows.map((row) => {
    // Prefer memberId as the canonical umpireId; fall back to umpireNumber.
    const umpireId =
      (typeof row.memberId === "string" && row.memberId.trim()
        ? row.memberId.trim()
        : null) ??
      (typeof row.umpireNumber === "string" && row.umpireNumber.trim()
        ? row.umpireNumber.trim()
        : String(row.officialRecordId ?? ""));
    return {
      umpireType: "umpire",
      umpireId,
    };
  });

  // ── Run batch COI evaluation ────────────────────────────────────────────────
  const { slots } = await evaluateFixtureUmpireAssignments(db, {
    associationId,
    homeTeamId,
    awayTeamId,
    proposedUmpires,
  });

  // ── Build a map from umpireId → issues ─────────────────────────────────────
  const issuesByUmpireId = new Map<string, CoiIssue[]>();
  for (const slot of slots) {
    issuesByUmpireId.set(slot.umpireId, [
      ...slot.blockingIssues,
      ...slot.warnings,
    ]);
  }

  // ── Categorise officials ────────────────────────────────────────────────────
  const available: OfficialEntry[] = [];
  const hasWarnings: OfficialEntry[] = [];
  const blocked: OfficialEntry[] = [];

  for (let i = 0; i < registerRows.length; i++) {
    const row = registerRows[i];
    const proposed = proposedUmpires[i];
    const issues = issuesByUmpireId.get(proposed.umpireId) ?? [];

    const entry: OfficialEntry = {
      officialRecordId: String(row.officialRecordId ?? ""),
      displayName: String(row.displayName ?? ""),
      memberId: typeof row.memberId === "string" ? row.memberId.trim() || null : null,
      umpireNumber:
        typeof row.umpireNumber === "string" ? row.umpireNumber.trim() || null : null,
      primaryClubId:
        typeof row.primaryClubId === "string" ? row.primaryClubId.trim() || null : null,
      qualificationCodes: Array.isArray(row.qualificationCodes)
        ? (row.qualificationCodes as unknown[]).map(String)
        : [],
      levelLabel:
        typeof row.levelLabel === "string" ? row.levelLabel.trim() || null : null,
      allocationAvailability:
        typeof row.allocationAvailability === "string"
          ? row.allocationAvailability
          : "available",
      umpireId: proposed.umpireId,
      issues,
    };

    const hasBlocking = issues.some((i) => i.severity === "block");
    const hasWarnOnly = !hasBlocking && issues.some((i) => i.severity === "warn");

    if (hasBlocking) {
      blocked.push(entry);
    } else if (hasWarnOnly) {
      hasWarnings.push(entry);
    } else {
      available.push(entry);
    }
  }

  return NextResponse.json({
    fixtureId,
    seasonCompetitionId,
    associationId,
    available,
    hasWarnings,
    blocked,
  });
}
