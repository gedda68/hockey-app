// Read-only membership types and roles for the member Membership step.
// Any signed-in admin may read it; managing them stays under /api/admin/config.

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { normalisePicks } from "@/lib/members/membershipOptions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = (await clientPromise).db("hockey-app");
    const [types, roles] = await Promise.all([
      db.collection("membership_types").find({}).limit(500).toArray(),
      db.collection("member_roles").find({}).limit(500).toArray(),
    ]);
    return NextResponse.json({
      membershipTypes: normalisePicks(types, ["typeId"]),
      roles: normalisePicks(roles, ["roleId"]),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), membershipTypes: [], roles: [] }, { status: 500 });
  }
}
