/**
 * GET/PUT /api/member/fan-preferences
 * B3 — follow teams, favourite clubs, notification toggles, push subscription storage (via dedicated push routes).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDatabase } from "@/lib/mongodb";
import { listAssociationClubsForMemberClub } from "@/lib/member/associationClubsForFan";
import {
  MAX_FAVOURITE_CLUBS,
  MAX_FOLLOWED_TEAMS,
  normalizeFanPreferences,
  type FanPreferences,
} from "@/lib/member/fanPreferences";

type TeamOption = { teamId: string; name: string; clubId: string };

export async function GET() {
  const session = await getSession();
  if (!session?.memberId) {
    return NextResponse.json({ error: "Member session required" }, { status: 401 });
  }

  const db = await getDatabase();
  const member = await db.collection("members").findOne(
    { memberId: session.memberId },
    { projection: { clubId: 1, fanPreferences: 1 } },
  );
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const clubId = String((member as { clubId?: string }).clubId ?? "").trim();
  const prefs = normalizeFanPreferences((member as { fanPreferences?: unknown }).fanPreferences);

  let teams: TeamOption[] = [];
  if (clubId) {
    const rows = await db
      .collection("teams")
      .find({ clubId }, { projection: { teamId: 1, name: 1, clubId: 1 } })
      .sort({ name: 1 })
      .limit(200)
      .toArray();
    teams = rows
      .map((t) => ({
        teamId: String((t as { teamId?: string }).teamId ?? "").trim(),
        name: String((t as { name?: string }).name ?? "Team").trim(),
        clubId: String((t as { clubId?: string }).clubId ?? clubId).trim(),
      }))
      .filter((t) => t.teamId);
  }

  const associationClubs = clubId ? await listAssociationClubsForMemberClub(db, clubId) : [];

  return NextResponse.json({
    preferences: prefs,
    teams,
    associationClubs,
    clubId: clubId || null,
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session?.memberId) {
    return NextResponse.json({ error: "Member session required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<FanPreferences> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = await getDatabase();
  const member = await db.collection("members").findOne(
    { memberId: session.memberId },
    { projection: { clubId: 1, fanPreferences: 1 } },
  );
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const clubId = String((member as { clubId?: string }).clubId ?? "").trim();
  const cur = normalizeFanPreferences((member as { fanPreferences?: unknown }).fanPreferences);

  const followedTeamIds = Array.isArray(body.followedTeamIds)
    ? [...new Set(body.followedTeamIds.map((x) => String(x).trim()).filter(Boolean))].slice(
        0,
        MAX_FOLLOWED_TEAMS,
      )
    : cur.followedTeamIds;

  if (clubId && followedTeamIds.length > 0) {
    const valid = await db
      .collection("teams")
      .countDocuments({ clubId, teamId: { $in: followedTeamIds } });
    if (valid !== followedTeamIds.length) {
      return NextResponse.json(
        { error: "One or more team IDs are invalid for your club." },
        { status: 400 },
      );
    }
  } else if (!clubId && followedTeamIds.length > 0) {
    return NextResponse.json(
      { error: "Member has no primary club; cannot follow teams yet." },
      { status: 400 },
    );
  }

  const allowedClubIds = new Set(
    (clubId ? await listAssociationClubsForMemberClub(db, clubId) : []).map((c) => c.clubId),
  );

  const favouriteClubIds = Array.isArray(body.favouriteClubIds)
    ? [...new Set(body.favouriteClubIds.map((x) => String(x).trim()).filter(Boolean))].slice(
        0,
        MAX_FAVOURITE_CLUBS,
      )
    : cur.favouriteClubIds;

  if (favouriteClubIds.length > 0) {
    if (!clubId || allowedClubIds.size === 0) {
      return NextResponse.json(
        { error: "Member has no association clubs list; cannot save favourites yet." },
        { status: 400 },
      );
    }
    for (const id of favouriteClubIds) {
      if (!allowedClubIds.has(id)) {
        return NextResponse.json(
          { error: "One or more favourite club IDs are not in your association." },
          { status: 400 },
        );
      }
    }
  }

  const merged: FanPreferences = {
    followedTeamIds,
    favouriteClubIds,
    notifyFixtureChangesEmail:
      typeof body.notifyFixtureChangesEmail === "boolean"
        ? body.notifyFixtureChangesEmail
        : cur.notifyFixtureChangesEmail,
    notifyFixtureChangesPush:
      typeof body.notifyFixtureChangesPush === "boolean"
        ? body.notifyFixtureChangesPush
        : cur.notifyFixtureChangesPush,
    pushSubscriptions: cur.pushSubscriptions,
    weeklyTipsEmail:
      typeof body.weeklyTipsEmail === "boolean" ? body.weeklyTipsEmail : cur.weeklyTipsEmail,
    showMatchDayTips:
      typeof body.showMatchDayTips === "boolean" ? body.showMatchDayTips : cur.showMatchDayTips,
    updatedAt: new Date().toISOString(),
  };

  await db.collection("members").updateOne(
    { memberId: session.memberId },
    { $set: { fanPreferences: merged, updatedAt: merged.updatedAt } },
  );

  return NextResponse.json({ preferences: merged });
}
