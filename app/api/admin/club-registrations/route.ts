// Club registrations list (club-registrations collection) with member names.
// Club users see their own club; super-admin may see all clubs or pick one with ?clubId=.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requireResourceAccess } from "@/lib/auth/middleware";

const PAGE = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = new URL(request.url).searchParams;
  const isSuper = session.role === "super-admin";
  const clubId = (sp.get("clubId") || (isSuper ? "" : session.clubId || "")).trim();
  if (!clubId && !isSuper) {
    return NextResponse.json({ error: "No club selected" }, { status: 400 });
  }
  if (clubId) {
    const { response } = await requireResourceAccess(request, "club", clubId);
    if (response) return response;
  }

  const season = parseInt(sp.get("season") || "", 10);
  const status = sp.get("status") || "";
  const q = (sp.get("q") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);

  const filter: Record<string, unknown> = {};
  if (clubId) filter.clubId = clubId;
  // seasonYear may be stored as a number or a string depending on the source.
  if (Number.isFinite(season)) filter.seasonYear = { $in: [season, String(season)] };
  if (status) filter.status = status;

  try {
    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const col = db.collection("club-registrations");

    // Name search: resolve matching members first, then filter registrations by memberId.
    if (q) {
      const ms = await db
        .collection("members")
        .find(
          {
            $or: [
              { "personalInfo.firstName": { $regex: q, $options: "i" } },
              { "personalInfo.lastName": { $regex: q, $options: "i" } },
              { memberId: { $regex: q, $options: "i" } },
            ],
          },
          { projection: { memberId: 1 } },
        )
        .limit(500)
        .toArray();
      filter.memberId = { $in: ms.map((m) => m.memberId) };
    }

    const [total, seasons, rows] = await Promise.all([
      col.countDocuments(filter),
      col.distinct("seasonYear", clubId ? { clubId } : {}),
      col
        .find(filter)
        .sort({ seasonYear: -1, registeredDate: -1 })
        .skip((page - 1) * PAGE)
        .limit(PAGE)
        .toArray(),
    ]);

    const ids = [...new Set(rows.map((r) => String(r.memberId)))];
    const members = ids.length
      ? await db
          .collection("members")
          .find({ memberId: { $in: ids } }, { projection: { memberId: 1, personalInfo: 1 } })
          .toArray()
      : [];
    const names = new Map(
      members.map((m) => [
        String(m.memberId),
        `${m.personalInfo?.lastName ?? ""}, ${m.personalInfo?.firstName ?? ""}`.replace(/^, |, $/g, ""),
      ]),
    );

    return NextResponse.json({
      total,
      page,
      pageSize: PAGE,
      seasons: [...new Set((seasons as (number | string)[]).map(Number).filter(Number.isFinite))].sort((a, b) => b - a),
      registrations: rows.map(({ _id, ...r }) => ({
        ...r,
        memberName: names.get(String(r.memberId)) || "",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
