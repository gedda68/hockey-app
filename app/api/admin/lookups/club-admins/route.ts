// People who hold a club admin role at a club — used to nominate a blue card verifier.
// Any signed-in admin may read it. Returns names and member ids only.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

const ADMIN_ROLES = ["club-admin", "role-club-admin"];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clubId = new URL(request.url).searchParams.get("clubId")?.trim();
  if (!clubId) return NextResponse.json({ items: [] });

  try {
    const db = (await clientPromise).db("hockey-app");

    // 1. Members who hold the club admin role and belong to the club.
    const byRole = await db
      .collection("members")
      .find({ roles: { $in: ADMIN_ROLES }, $or: [{ clubId }, { "membership.clubId": clubId }] }, { projection: { memberId: 1, personalInfo: 1 } })
      .limit(200)
      .toArray();

    // 2. Login accounts with a club-admin role scoped to the club that are linked to a member.
    const users = await db
      .collection("users")
      .find(
        { memberId: { $exists: true, $nin: [null, ""] }, $or: [{ role: "club-admin", clubId }, { roles: { $elemMatch: { role: "club-admin", scopeType: "club", scopeId: clubId } } }] },
        { projection: { memberId: 1 } },
      )
      .limit(200)
      .toArray();
    const extraIds = users.map((u) => String(u.memberId)).filter((id) => !byRole.some((m) => m.memberId === id));
    const extra = extraIds.length
      ? await db.collection("members").find({ memberId: { $in: extraIds } }, { projection: { memberId: 1, personalInfo: 1 } }).toArray()
      : [];

    const items = [...byRole, ...extra]
      .map((m) => ({ memberId: String(m.memberId), name: `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim() }))
      .filter((m) => m.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), items: [] }, { status: 500 });
  }
}
