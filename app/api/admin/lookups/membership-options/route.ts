// Read-only membership types and roles for the member Membership step.
// Any signed-in admin may read it; managing them stays under /api/admin/config.

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { normalisePicks, normaliseAllPicks } from "@/lib/members/membershipOptions";

const TYPE_COLLECTIONS = ["member_types", "membership_types"] as const;

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = (await clientPromise).db("hockey-app");
    // Membership types live in `member_types`; the older `membership_types` is only a fallback.
    let membershipTypes: ReturnType<typeof normalisePicks> = [];
    let typesSource: string | null = null;
    for (const name of TYPE_COLLECTIONS) {
      const docs = await db.collection(name).find({}).limit(500).toArray();
      const items = normalisePicks(docs, ["typeId", "memberTypeId"]);
      if (items.length) {
        membershipTypes = items;
        typesSource = name;
        break;
      }
    }
    const roleDocs = await db
      .collection("member_roles")
      .find({})
      .limit(500)
      .toArray();
    return NextResponse.json({
      membershipTypes,
      roles: normalisePicks(roleDocs, ["roleId"]),
      // Every role, including inactive ones, so roles already saved on a member show their name.
      allRoles: normaliseAllPicks(roleDocs, ["roleId"]),
      sources: { membershipTypes: typesSource, roles: "member_roles" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : String(e),
        membershipTypes: [],
        roles: [],
      },
      { status: 500 },
    );
  }
}
