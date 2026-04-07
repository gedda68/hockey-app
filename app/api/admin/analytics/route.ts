// app/api/admin/analytics/route.ts
// Real member/player analytics with breakdown by gender, age group, role, and time.
//
// GET /api/admin/analytics?scope=association&scopeId=xxx&season=2026
//
// Scope can be:
//   "global"       — all data (super-admin)
//   "association"  — scoped to one association + its child clubs
//   "club"         — scoped to one club

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// ── Age-group classification ───────────────────────────────────────────────────
// Season year − birth year = age-for-season (Hockey convention)
function ageGroup(dob: string, seasonYear: number): string {
  if (!dob) return "Unknown";
  const birthYear = new Date(dob).getFullYear();
  const age = seasonYear - birthYear;
  if (age < 6)  return "Under 6";
  if (age < 8)  return "Under 8";
  if (age < 10) return "Under 10";
  if (age < 12) return "Under 12";
  if (age < 14) return "Under 14";
  if (age < 16) return "Under 16";
  if (age < 18) return "Under 18";
  if (age < 21) return "Under 21";
  if (age >= 35 && age < 40) return "Masters 35+";
  if (age >= 40 && age < 45) return "Masters 40+";
  if (age >= 45 && age < 50) return "Masters 45+";
  if (age >= 50 && age < 55) return "Masters 50+";
  if (age >= 55 && age < 60) return "Masters 55+";
  if (age >= 60 && age < 65) return "Masters 60+";
  if (age >= 65)             return "Masters 65+";
  return "Open"; // 21–34
}

function genderLabel(g: string | undefined): string {
  const s = (g ?? "").toLowerCase();
  if (s.includes("female") || s.includes("women") || s === "f") return "Female";
  if (s.includes("male")   || s.includes("men")   || s === "m") return "Male";
  if (s.includes("non") || s.includes("x"))                     return "Non-binary";
  return "Unknown";
}

function isMemberActive(m: Record<string, any>): boolean {
  const st = (m.membership?.status ?? "").toLowerCase();
  return st === "active" || st === "life";
}

// ── Role classification ───────────────────────────────────────────────────────
function classifyRoles(roles: string[]): {
  isPlayer: boolean;
  isUmpire: boolean;
  isTechnicalOfficial: boolean;
  isCoach: boolean;
  isAdmin: boolean;
} {
  const rs = new Set(roles);
  return {
    isPlayer:            rs.has("player") || rs.has("role-player"),
    isUmpire:            rs.has("umpire"),
    isTechnicalOfficial: rs.has("technical-official"),
    isCoach:             rs.has("coach") || rs.has("assoc-coach"),
    isAdmin:             rs.has("club-admin") || rs.has("association-admin") ||
                         rs.has("club-committee") || rs.has("assoc-committee") ||
                         rs.has("registrar") || rs.has("assoc-registrar"),
  };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope     = searchParams.get("scope")     || "global";
    const scopeId   = searchParams.get("scopeId")   || null;
    const seasonStr = searchParams.get("season")    || new Date().getFullYear().toString();
    const season    = parseInt(seasonStr, 10);
    const includeHistoric = searchParams.get("historic") === "true";

    const client = await clientPromise;
    const db     = client.db("hockey-app");

    // ── Build member query based on scope ───────────────────────────────────
    const memberQuery: Record<string, any> = {};

    if (scope === "club" && scopeId) {
      memberQuery["membership.clubId"] = scopeId;
    } else if (scope === "association" && scopeId) {
      // Find all club IDs under this association
      const clubs = await db
        .collection("clubs")
        .find({ parentAssociationId: scopeId }, { projection: { id: 1, clubId: 1 } })
        .toArray();
      const clubIds = clubs.map((c) => c.id ?? c.clubId).filter(Boolean);
      // Include direct association members + all club members
      memberQuery.$or = [
        { "membership.associationId": scopeId },
        { "membership.clubId": { $in: clubIds } },
      ];
    }
    // global: no filter

    // ── Fetch all members ────────────────────────────────────────────────────
    const members = await db
      .collection("members")
      .find(memberQuery, {
        projection: {
          memberId:    1,
          personalInfo: 1,
          membership:  1,
          roles:       1,
          createdAt:   1,
        },
      })
      .toArray();

    // ── Counters ────────────────────────────────────────────────────────────
    const totals = {
      totalMembers:   0,
      activeMembers:  0,
      players:        0,
      umpires:        0,
      technicalOfficials: 0,
      coaches:        0,
      admins:         0,
    };

    // Gender breakdown (all active members)
    const byGender: Record<string, number> = {};

    // Age-group breakdown (active players only)
    const byAgeGroup: Record<string, { male: number; female: number; other: number; total: number }> = {};

    // Role breakdown (unique people by primary function)
    const byRole: Record<string, number> = {};

    // Club breakdown (for association/global scope)
    const byClub: Record<string, { name: string; total: number; active: number; players: number }> = {};

    // Monthly registration trend (current season window)
    const byMonth: Record<string, number> = {};

    for (const m of members) {
      totals.totalMembers++;

      const active = isMemberActive(m);
      if (active) totals.activeMembers++;

      const pi     = m.personalInfo ?? {};
      const gender = genderLabel(pi.gender);
      const dob    = pi.dateOfBirth ?? "";
      const ag     = ageGroup(dob, season);
      const roles  = Array.isArray(m.roles) ? m.roles : [];
      const rc     = classifyRoles(roles);

      if (active) {
        // Gender
        byGender[gender] = (byGender[gender] ?? 0) + 1;

        // Age group (players)
        if (rc.isPlayer) {
          totals.players++;
          if (!byAgeGroup[ag]) byAgeGroup[ag] = { male: 0, female: 0, other: 0, total: 0 };
          byAgeGroup[ag].total++;
          if (gender === "Male")   byAgeGroup[ag].male++;
          else if (gender === "Female") byAgeGroup[ag].female++;
          else byAgeGroup[ag].other++;
        }

        // Other role counts
        if (rc.isUmpire)            totals.umpires++;
        if (rc.isTechnicalOfficial) totals.technicalOfficials++;
        if (rc.isCoach)             totals.coaches++;
        if (rc.isAdmin)             totals.admins++;

        // Primary role bucket
        const primary = rc.isPlayer ? "Player"
          : rc.isUmpire ? "Umpire"
          : rc.isTechnicalOfficial ? "Technical Official"
          : rc.isCoach ? "Coach"
          : rc.isAdmin ? "Administrator"
          : "Member";
        byRole[primary] = (byRole[primary] ?? 0) + 1;

        // Club breakdown
        const clubId   = m.membership?.clubId;
        const clubName = m.membership?.clubName ?? "Unaffiliated";
        if (clubId) {
          if (!byClub[clubId]) byClub[clubId] = { name: clubName, total: 0, active: 0, players: 0 };
          byClub[clubId].total++;
          byClub[clubId].active++;
          if (rc.isPlayer) byClub[clubId].players++;
        }
      }

      // Monthly trend (by createdAt)
      if (m.createdAt) {
        const d = new Date(m.createdAt);
        if (d.getFullYear() === season) {
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          byMonth[monthKey] = (byMonth[monthKey] ?? 0) + 1;
        }
      }
    }

    // ── Sort age groups canonically ──────────────────────────────────────────
    const AGE_ORDER = [
      "Under 6","Under 8","Under 10","Under 12","Under 14","Under 16","Under 18","Under 21",
      "Open",
      "Masters 35+","Masters 40+","Masters 45+","Masters 50+","Masters 55+","Masters 60+","Masters 65+",
      "Unknown",
    ];
    const ageGroupTable = AGE_ORDER
      .filter((ag) => byAgeGroup[ag])
      .map((ag) => ({ ageGroup: ag, ...byAgeGroup[ag] }));

    // ── Club table (sorted by active desc) ──────────────────────────────────
    const clubTable = Object.values(byClub)
      .sort((a, b) => b.active - a.active);

    // ── Historic data (year-on-year active member count) ────────────────────
    let historic: { season: number; totalMembers: number; players: number }[] = [];
    if (includeHistoric) {
      // Sample by counting members with createdAt before end of each season year
      const currentYear = season;
      const years = Array.from({ length: 5 }, (_, i) => currentYear - i).reverse();

      historic = await Promise.all(
        years.map(async (yr) => {
          const endOfYear = new Date(`${yr}-12-31T23:59:59Z`);
          const [totalCount, playerCount] = await Promise.all([
            db.collection("members").countDocuments({
              ...memberQuery,
              createdAt: { $lte: endOfYear },
            }),
            db.collection("members").countDocuments({
              ...memberQuery,
              createdAt: { $lte: endOfYear },
              roles: { $in: ["player", "role-player"] },
            }),
          ]);
          return { season: yr, totalMembers: totalCount, players: playerCount };
        })
      );
    }

    // ── Counts for top-level entities (global/assoc scope) ───────────────────
    let entityCounts: Record<string, number> = {};
    if (scope === "global" || scope === "association") {
      const [assocCount, clubCount, teamCount] = await Promise.all([
        scope === "global"
          ? db.collection("associations").countDocuments({ status: "active" })
          : Promise.resolve(1),
        scope === "global"
          ? db.collection("clubs").countDocuments({ active: true })
          : db.collection("clubs").countDocuments({ parentAssociationId: scopeId, active: true }),
        scope === "global"
          ? db.collection("teams").countDocuments({})
          : db.collection("teams").countDocuments(
              scopeId ? { $or: [{ associationId: scopeId }, { clubId: { $in: Object.keys(byClub) } }] } : {}
            ),
      ]);
      entityCounts = { associations: assocCount, clubs: clubCount, teams: teamCount };
    } else if (scope === "club") {
      const teamCount = await db.collection("teams").countDocuments({ clubId: scopeId });
      entityCounts = { teams: teamCount };
    }

    return NextResponse.json({
      scope,
      scopeId,
      season: seasonStr,
      totals,
      entityCounts,
      byGender,
      byAgeGroup: ageGroupTable,
      byRole,
      byMonth,
      clubTable,
      historic,
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
