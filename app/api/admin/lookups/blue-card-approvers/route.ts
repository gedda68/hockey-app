// Active members who hold the Admin role (role-admin): the people who can approve a blue card.
// Any signed-in admin may read it. Returns names, member ids and club only.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

const ADMIN_ROLES = ["role-admin", "admin"];

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clubId = new URL(request.url).searchParams.get("clubId")?.trim() ?? "";

  try {
    const db = (await clientPromise).db("hockey-app");
    const docs = await db
      .collection("members")
      .find(
        {
          $or: [
            { roles: { $in: ADMIN_ROLES } },
            { "membership.roles": { $in: ADMIN_ROLES } },
          ],
          $and: [
            {
              $or: [
                { "membership.status": { $in: ["Active", "Life"] } },
                { "membership.status": { $exists: false } },
                { "membership.status": null },
              ],
            },
          ],
        },
        {
          projection: {
            memberId: 1,
            personalInfo: 1,
            clubId: 1,
            membership: 1,
          },
        },
      )
      .limit(500)
      .toArray();

    const clubIds = [
      ...new Set(
        docs
          .map((m) => String(m.membership?.clubId ?? m.clubId ?? ""))
          .filter(Boolean),
      ),
    ];
    const clubs = clubIds.length
      ? await db
          .collection("clubs")
          .find(
            { $or: [{ id: { $in: clubIds } }, { clubId: { $in: clubIds } }] },
            { projection: { id: 1, clubId: 1, name: 1 } },
          )
          .toArray()
      : [];
    const clubName = new Map<string, string>();
    for (const c of clubs)
      for (const k of [c.id, c.clubId])
        if (k) clubName.set(String(k), String(c.name ?? ""));

    const items = docs
      .map((m) => {
        const cid = String(m.membership?.clubId ?? m.clubId ?? "");
        return {
          memberId: String(m.memberId),
          name: `${m.personalInfo?.firstName ?? ""} ${m.personalInfo?.lastName ?? ""}`.trim(),
          clubId: cid,
          clubName: clubName.get(cid) ?? "",
        };
      })
      .filter((m) => m.name)
      // the member's own club first, then alphabetical
      .sort(
        (a, b) =>
          Number(b.clubId === clubId) - Number(a.clubId === clubId) ||
          a.name.localeCompare(b.name),
      );
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), items: [] },
      { status: 500 },
    );
  }
}
