/**
 * Injuries for a club's members.
 *   GET  ?status=&memberId=   → injuries (people at "own" level see only their own and their children's)
 *   GET  ?people=<text>       → club members matching a name, for the add form (edit level)
 *   POST { memberId, occurredAt, bodyPart, description?, severity?, teamId?, expectedReturn? }  (edit level)
 * Collection: member_injuries.
 */

import { NextRequest, NextResponse } from "next/server";
import { recordsContext, isDenied } from "@/lib/records/context";
import { atLeast } from "@/lib/records/access";
import { childrenOf } from "@/lib/access/guardians";
import { cleanInjury } from "@/lib/records/validate";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import { escapeRegex } from "@/lib/utils/regex";

const COL = "member_injuries";
const nameOf = (m: any) => `${m?.personalInfo?.firstName ?? ""} ${m?.personalInfo?.lastName ?? ""}`.trim() || String(m?.memberId ?? "");

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "injuries", "own");
    if (isDenied(c)) return c.response;
    const sp = new URL(request.url).searchParams;

    const search = (sp.get("people") ?? "").trim();
    if (search) {
      if (!atLeast(c.level, "edit")) return NextResponse.json({ error: "Your role doesn't allow this here" }, { status: 403 });
      if (search.length < 2) return NextResponse.json({ people: [] });
      const rx = new RegExp(escapeRegex(search), "i");
      const people = await c.db
        .collection("members")
        .find({ $and: [memberBelongsToClubFilter(c.clubId), { $or: [{ "personalInfo.firstName": rx }, { "personalInfo.lastName": rx }, { memberId: rx }] }] }, { projection: { memberId: 1, personalInfo: 1 } })
        .limit(10)
        .toArray();
      return NextResponse.json({ people: people.map((m) => ({ memberId: String(m.memberId), name: nameOf(m) })) });
    }

    const q: Record<string, unknown> = { clubId: c.clubId };
    if (sp.get("status")) q.status = sp.get("status");
    if (sp.get("memberId")) q.memberId = sp.get("memberId");
    if (!atLeast(c.level, "read")) {
      const kids = c.me ? (await childrenOf(c.db, c.me)).map((k) => String(k.memberId)) : [];
      const mine = [c.me, ...kids].filter(Boolean);
      q.memberId = sp.get("memberId") && mine.includes(String(sp.get("memberId"))) ? sp.get("memberId") : { $in: mine.length ? mine : ["__none__"] };
    }
    const injuries = await c.db.collection(COL).find(q, { projection: { _id: 0 } }).sort({ occurredAt: -1 }).limit(300).toArray();
    return NextResponse.json({ injuries, level: c.level });
  } catch (e) {
    console.error("injuries GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const c = await recordsContext(request, "injuries", "edit");
    if (isDenied(c)) return c.response;
    const v = cleanInjury(await request.json().catch(() => null));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const person = await c.db.collection("members").findOne({ $and: [{ memberId: v.value.memberId }, memberBelongsToClubFilter(c.clubId)] }, { projection: { memberId: 1, personalInfo: 1 } });
    if (!person) return NextResponse.json({ error: "That person isn't a member of this club" }, { status: 400 });
    const now = new Date().toISOString();
    const doc = {
      injuryId: `INJ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      clubId: c.clubId,
      ...v.value,
      memberName: nameOf(person),
      status: "active",
      clearedAt: null,
      reportedBy: c.me || c.session.userId,
      reportedByName: c.session.name,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, by: c.session.name, status: "active", note: "Injury recorded" }],
    };
    await c.db.collection(COL).insertOne({ ...doc });
    return NextResponse.json({ success: true, injury: doc }, { status: 201 });
  } catch (e) {
    console.error("injuries POST error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
