/**
 * GET /api/member/my-nominations
 * Every rep nomination that involves the signed-in person: ones where they are the nominee (their own, or put
 * forward by someone else) and ones they made for other people. Scoped to the session, with no lookup form.
 */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { splitNominations, type RawNomination } from "@/lib/nominations/myNominations";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const memberKey = await resolveSessionMemberId(db, session);
    const ids = [...new Set([memberKey, session.memberId, session.userId].filter(Boolean).map(String))];
    if (ids.length === 0) return NextResponse.json({ aboutMe: [], madeByMe: [] });

    const rows = (await db
      .collection("rep_nominations")
      .find({ $or: [{ memberId: { $in: ids } }, { playerId: { $in: ids } }, { nomineeId: { $in: ids } }, { nominatedBy: { $in: ids } }] })
      .sort({ season: -1, nominatedAt: -1 })
      .limit(300)
      .toArray()) as unknown as RawNomination[];

    const pairs = [...new Set(rows.map((n) => `${n.season}||${n.ageGroup}`))];
    const tournaments = new Map<string, string>();
    if (pairs.length) {
      const docs = await db
        .collection("rep_tournaments")
        .find({ $or: pairs.map((p) => { const [season, ageGroup] = p.split("||"); return { season, ageGroup }; }) })
        .toArray();
      for (const t of docs as any[]) {
        const title = t.tournamentTitle ?? t.title ?? t.name;
        if (title) tournaments.set(`${t.season}||${t.ageGroup}`, String(title));
      }
    }
    return NextResponse.json(splitNominations(rows, ids, tournaments));
  } catch (e) {
    console.error("my-nominations GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
