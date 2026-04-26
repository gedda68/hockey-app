// GET — O4 aggregated partner strip clicks for a club.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { resolveClubByIdOrSlug } from "@/lib/volunteerDuty/resolveClub";
import {
  PARTNER_STRIP_CLICK_COLLECTION,
  utcDayString,
} from "@/lib/analytics/partnerStripClick";

const READ_PERMS = ["club.edit", "club.members"] as const;

type Params = { params: Promise<{ id: string }> };

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  return { from: utcDayString(from), to: utcDayString(to) };
}

export async function GET(request: NextRequest, { params }: Params) {
  const { response } = await requireAnyPermission(request, [...READ_PERMS]);
  if (response) return response;

  try {
    const { id } = await params;
    const ref = id.trim();
    if (!ref) {
      return NextResponse.json({ error: "club id required" }, { status: 400 });
    }

    const scope = await requireResourceAccess(request, "club", ref);
    if (scope.response) return scope.response;

    const { searchParams } = new URL(request.url);
    const dr = defaultRange();
    const from = (searchParams.get("from") ?? dr.from).slice(0, 10);
    const to = (searchParams.get("to") ?? dr.to).slice(0, 10);

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const club = await resolveClubByIdOrSlug(db, ref);
    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const rows = await db
      .collection(PARTNER_STRIP_CLICK_COLLECTION)
      .aggregate([
        {
          $match: {
            scopeType: "club",
            scopeId: club.clubId,
            day: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: "$partnerRef",
            clicks: { $sum: "$clicks" },
            label: { $first: "$label" },
          },
        },
        { $sort: { clicks: -1 } },
      ])
      .toArray();

    return NextResponse.json({
      club: { id: club.clubId, name: club.name },
      range: { from, to },
      rows: rows.map((r) => ({
        partnerRef: String(r._id ?? ""),
        clicks: Number(r.clicks ?? 0),
        label: typeof r.label === "string" ? r.label : "",
      })),
    });
  } catch (e) {
    console.error("GET partner-click-stats (club) error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
