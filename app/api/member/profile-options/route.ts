// GET /api/member/profile-options — titles, genders and relationship names for the My Details type-aheads.
// Any signed-in person may read these (they are plain pick-lists, not member data).

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import {
  DEFAULT_GENDER_ROWS, DEFAULT_RELATIONSHIPS, DEFAULT_SALUTATION_ROWS, mergeOptions, namesToOptions,
} from "@/lib/members/profileOptions";
import { loadPickLists } from "@/lib/members/profileOptionsServer";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const db = (await clientPromise).db("hockey-app");
    return NextResponse.json(await loadPickLists(db));
  } catch {
    return NextResponse.json({
      salutations: mergeOptions(DEFAULT_SALUTATION_ROWS, []),
      genders: mergeOptions(DEFAULT_GENDER_ROWS, []),
      relationships: namesToOptions(DEFAULT_RELATIONSHIPS),
    });
  }
}
