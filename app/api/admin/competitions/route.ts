// app/api/admin/competitions/route.ts
// Competition + SeasonCompetition admin API (association-owned).

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission, requirePermission } from "@/lib/auth/middleware";
import {
  CreateCompetitionRequestSchema,
  CreateSeasonCompetitionRequestSchema,
  CompetitionSchema,
  FinalsSeriesConfigSchema,
  SeasonCompetitionSchema,
  type Competition,
  type SeasonCompetition,
} from "@/lib/db/schemas/competition.schema";
import { ZodError } from "zod";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * GET /api/admin/competitions
 * Query:
 * - owningAssociationId (optional)
 * - season (optional; returns seasonCompetitions)
 * - include=base|season|all (default: all)
 */
export async function GET(request: NextRequest) {
  const { user, response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const owningAssociationId = searchParams.get("owningAssociationId");
    const season = searchParams.get("season");
    const include = (searchParams.get("include") ?? "all") as
      | "base"
      | "season"
      | "all";

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Club-scoped admins cannot manage competitions.
    if (
      ["club-admin", "registrar", "coach", "manager"].includes(user.role) &&
      user.clubId
    ) {
      return NextResponse.json(
        { error: "Forbidden - club roles cannot manage competitions" },
        { status: 403 },
      );
    }

    const competitionQuery: Record<string, unknown> = {};
    const seasonCompQuery: Record<string, unknown> = {};

    if (owningAssociationId) {
      competitionQuery.owningAssociationId = owningAssociationId;
      seasonCompQuery.owningAssociationId = owningAssociationId;
    } else if (user.role === "association-admin" && user.associationId) {
      competitionQuery.owningAssociationId = user.associationId;
      seasonCompQuery.owningAssociationId = user.associationId;
    }

    if (season) seasonCompQuery.season = season;

    const [competitions, seasonCompetitions] = await Promise.all([
      include === "season"
        ? Promise.resolve([])
        : db.collection("competitions").find(competitionQuery).toArray(),
      include === "base"
        ? Promise.resolve([])
        : db
            .collection("season_competitions")
            .find(seasonCompQuery)
            .toArray(),
    ]);

    return NextResponse.json({
      competitions:
        competitions?.map((c) => ({ ...c, _id: c._id?.toString?.() })) ?? [],
      seasonCompetitions:
        seasonCompetitions?.map((sc) => ({ ...sc, _id: sc._id?.toString?.() })) ??
        [],
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/competitions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/competitions
 * Body can be:
 * - { kind: "competition", ...CreateCompetitionRequest }
 * - { kind: "seasonCompetition", ...CreateSeasonCompetitionRequest }
 *
 * Product rule (Epic C2):
 * Primary season league competitions are owned by the city/region association,
 * i.e. the association creating the SeasonCompetition is the owningAssociationId.
 */
export async function POST(request: NextRequest) {
  const { user, response } = await requirePermission(
    request,
    "competitions.manage",
  );
  if (response) return response;

  try {
    const body = await request.json();
    const kind = body?.kind;

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Club-scoped admins cannot manage competitions.
    if (
      ["club-admin", "registrar", "coach", "manager"].includes(user.role) &&
      user.clubId
    ) {
      return NextResponse.json(
        { error: "Forbidden - club roles cannot manage competitions" },
        { status: 403 },
      );
    }

    if (kind === "competition") {
      const req = CreateCompetitionRequestSchema.parse(body);

      // Association admins can only create for their own association
      if (user.role === "association-admin" && user.associationId) {
        if (req.owningAssociationId !== user.associationId) {
          return NextResponse.json(
            {
              error:
                "Forbidden - cannot create competitions for another association",
            },
            { status: 403 },
          );
        }
      }

      const now = new Date();
      const competition: Competition = CompetitionSchema.parse({
        competitionId: newId("comp"),
        owningAssociationId: req.owningAssociationId,
        name: req.name,
        sport: req.sport ?? "hockey",
        geographyScope: req.geographyScope,
        status: "draft",
        createdAt: now,
        updatedAt: now,
        createdBy: user.userId,
      });

      const { _id: _omit, ...doc } = competition;
      await db.collection("competitions").insertOne(doc);

      await logPlatformAudit({
        userId: user.userId,
        userEmail: user.email,
        category: "competition",
        action: "create",
        resourceType: "competition",
        resourceId: competition.competitionId,
        summary: `Created competition "${competition.name}"`,
        after: { competition },
      });

      return NextResponse.json({ competition }, { status: 201 });
    }

    if (kind === "seasonCompetition") {
      const req = CreateSeasonCompetitionRequestSchema.parse(body);

      // Product rule: season competition ownership must match creator's association scope
      if (user.role === "association-admin" && user.associationId) {
        if (req.owningAssociationId !== user.associationId) {
          return NextResponse.json(
            {
              error:
                "Invalid owningAssociationId for season competition (must be your association)",
            },
            { status: 403 },
          );
        }
      }

      // Ensure base competition exists and matches ownership
      const base = await db.collection("competitions").findOne({
        competitionId: req.competitionId,
      });
      if (!base) {
        return NextResponse.json(
          { error: "Competition not found" },
          { status: 404 },
        );
      }
      if (base.owningAssociationId !== req.owningAssociationId) {
        return NextResponse.json(
          {
            error:
              "Season competition owner must match the base competition owner",
          },
          { status: 400 },
        );
      }

      // Prevent duplicates for (competitionId, season)
      const existing = await db.collection("season_competitions").findOne({
        competitionId: req.competitionId,
        season: req.season,
      });
      if (existing) {
        return NextResponse.json(
          { error: "Season competition already exists for this season" },
          { status: 409 },
        );
      }

      const ownerAssoc = await db.collection("associations").findOne({
        associationId: req.owningAssociationId,
      });
      if (!ownerAssoc || typeof ownerAssoc.level !== "number") {
        return NextResponse.json(
          {
            error:
              "Owning association must exist with a numeric hierarchy level before creating a season league.",
          },
          { status: 400 },
        );
      }
      if (ownerAssoc.level <= 1) {
        return NextResponse.json(
          {
            error:
              "Season league competitions must be owned by a regional/metro association (stored level ≥ 2). National/state bodies should use tournaments or other products for rep play.",
          },
          { status: 400 },
        );
      }

      const now = new Date();
      const seasonCompetition: SeasonCompetition = SeasonCompetitionSchema.parse({
        seasonCompetitionId: newId("scomp"),
        competitionId: req.competitionId,
        owningAssociationId: req.owningAssociationId,
        season: req.season,
        divisions: req.divisions ?? [],
        homeAndAway: req.homeAndAway ?? false,
        blockoutPeriods: req.blockoutPeriods ?? [],
        specialMatchPeriods: req.specialMatchPeriods ?? [],
        finalsSeries:
          req.finalsSeries !== undefined
            ? FinalsSeriesConfigSchema.parse(req.finalsSeries)
            : FinalsSeriesConfigSchema.parse({}),
        clubNominatedVenues: req.clubNominatedVenues ?? [],
        ...(req.resultApprovalRequired !== undefined
          ? { resultApprovalRequired: req.resultApprovalRequired }
          : {}),
        ...(req.ladderRules !== undefined ? { ladderRules: req.ladderRules } : {}),
        ...(req.logoUrl?.trim() ? { logoUrl: req.logoUrl.trim() } : {}),
        ...(req.displayName?.trim() ? { displayName: req.displayName.trim() } : {}),
        status: "draft",
        createdAt: now,
        updatedAt: now,
        createdBy: user.userId,
      });

      const { _id: _omit, ...doc } = seasonCompetition;
      await db.collection("season_competitions").insertOne(doc);

      await logPlatformAudit({
        userId: user.userId,
        userEmail: user.email,
        category: "season_competition",
        action: "create",
        resourceType: "season_competition",
        resourceId: seasonCompetition.seasonCompetitionId,
        summary: `Created season competition season=${seasonCompetition.season}`,
        after: { seasonCompetition },
      });

      return NextResponse.json({ seasonCompetition }, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Invalid kind. Use "competition" or "seasonCompetition".' },
      { status: 400 },
    );
  } catch (error: unknown) {
    console.error("POST /api/admin/competitions error:", error);
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

