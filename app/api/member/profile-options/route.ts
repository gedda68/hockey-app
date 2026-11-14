// GET /api/member/profile-options — titles, genders and relationship names for the My Details type-aheads.
// Any signed-in person may read these (they are plain pick-lists, not member data).

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import {
  DEFAULT_GENDERS, DEFAULT_RELATIONSHIPS, DEFAULT_SALUTATIONS, mergeOptions,
} from "@/lib/members/profileOptions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const db = (await clientPromise).db("hockey-app");
    const names = async (configType: string) =>
      (await db.collection("config").find({ configType, isActive: { $ne: false } }).sort({ sortOrder: 1, name: 1 }).toArray())
        .map((d) => d.name);
    const [sal, gen, rel] = await Promise.all([names("salutation"), names("gender"), names("relationship-type")]);
    return NextResponse.json({
      salutations: mergeOptions(sal, DEFAULT_SALUTATIONS),
      genders: mergeOptions(gen, DEFAULT_GENDERS),
      relationships: mergeOptions(rel, DEFAULT_RELATIONSHIPS),
    });
  } catch {
    return NextResponse.json({
      salutations: DEFAULT_SALUTATIONS, genders: DEFAULT_GENDERS, relationships: DEFAULT_RELATIONSHIPS,
    });
  }
}
