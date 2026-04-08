// app/api/admin/nominations/available/route.ts
// GET - Return all currently open nomination opportunities with tournament info

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";
import { getEligibilityRange } from "@/types/nominations";
import type { OpenOpportunity, TournamentGender } from "@/types/tournaments";

// ─── GET /api/admin/nominations/available ─────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { response: authRes } = await requirePermission(
      request,
      "selection.view",
    );
    if (authRes) return authRes;

    const { searchParams } = new URL(request.url);
    const season =
      searchParams.get("season") ?? new Date().getFullYear().toString();

    // Today as YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // Find all nomination periods that are currently open (startDate <= today <= endDate)
    // Optionally filter by season if provided
    const periodQuery: Record<string, any> = {
      startDate: { $lte: today },
      endDate: { $gte: today },
    };
    if (season) {
      periodQuery.season = season;
    }

    const openPeriods = await db
      .collection("rep_nomination_periods")
      .find(periodQuery)
      .toArray();

    const opportunities: OpenOpportunity[] = [];

    for (const period of openPeriods) {
      // Compute days remaining until period end
      const endDate = new Date(period.endDate + "T00:00:00");
      const todayDate = new Date(today + "T00:00:00");
      const msPerDay = 86_400_000;
      const daysRemaining = Math.max(
        0,
        Math.round((endDate.getTime() - todayDate.getTime()) / msPerDay),
      );

      // Look up the matching tournament (same season + ageGroup)
      const tournament = await db.collection("rep_tournaments").findOne({
        season: period.season,
        ageGroup: period.ageGroup,
      });

      // Get eligibility range
      const eligibilityRange = getEligibilityRange(period.ageGroup);

      const opp: OpenOpportunity = {
        ageGroup: period.ageGroup,
        season: period.season,
        tournamentId: tournament?.tournamentId ?? period.linkedTournamentId ?? "",
        tournamentTitle: tournament?.title ?? "TBA",
        tournamentGender: (tournament?.gender as TournamentGender) ?? "mixed",
        tournamentLocation: tournament?.location ?? "",
        tournamentStartDate: tournament?.startDate ?? "",
        tournamentEndDate: tournament?.endDate ?? "",
        nominationPeriodStart: period.startDate,
        nominationPeriodEnd: period.endDate,
        daysRemaining,
        nominationFee: tournament?.nominationFee ?? 0,
        eligibilityRange: eligibilityRange ?? {
          minAge: 0,
          maxAge: null,
          divisionType: "opens",
          description: period.ageGroup,
        },
      };

      opportunities.push(opp);
    }

    // Sort by daysRemaining ascending (most urgent first)
    opportunities.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return NextResponse.json({ opportunities });
  } catch (error: unknown) {
    console.error("GET /api/admin/nominations/available error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available nominations" },
      { status: 500 },
    );
  }
}
