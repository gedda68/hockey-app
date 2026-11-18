/**
 * GET  /api/member/awards   → my club's season awards: nominations open (with mine so far) and announced winners
 * POST /api/member/awards   { action: "nominate", programId, categoryId, nomineeId, reason } | { action: "withdraw", nominationId }
 */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { clubOfMember } from "@/lib/volunteers/access";
import { NOMS, PROGRAMS, namesFor, nominate, withdrawNomination } from "@/lib/awards/service";
import { windowState } from "@/lib/awards/logic";
import { MAX_NOMINATIONS_PER_CATEGORY } from "@/lib/awards/logic";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    const club = me ? await clubOfMember(db, me) : null;
    if (!me || !club) return NextResponse.json({ club: null, open: [], announced: [] });
    const now = new Date();
    const programs: any[] = await db.collection(PROGRAMS).find({ clubId: club.clubId, status: { $in: ["open", "judging", "announced"] } }, { projection: { _id: 0 } }).sort({ seasonYear: -1, createdAt: -1 }).limit(12).toArray();
    const mine: any[] = programs.length ? await db.collection(NOMS).find({ nominatorId: me, withdrawn: { $ne: true }, programId: { $in: programs.map((p) => String(p.programId)) } }, { projection: { _id: 0, nominationId: 1, programId: 1, categoryId: 1, nomineeId: 1, reason: 1 } }).toArray() : [];
    const names = await namesFor(db, [...mine.map((n) => String(n.nomineeId)), ...programs.flatMap((p) => Object.values(p.winners ?? {}).flat() as string[])]);
    const open = programs.filter((p) => p.status === "open" && windowState(p, now) === "open").map((p) => ({
      programId: p.programId, title: p.title, seasonYear: p.seasonYear, closesAt: p.closesAt ?? null, categories: p.categories, max: MAX_NOMINATIONS_PER_CATEGORY,
      mine: mine.filter((n) => n.programId === p.programId).map((n) => ({ ...n, nomineeName: names.get(String(n.nomineeId)) ?? "Member" })),
    }));
    const announced = programs.filter((p) => p.status === "announced").map((p) => ({
      programId: p.programId, title: p.title, seasonYear: p.seasonYear, announcedAt: p.announcedAt,
      awards: (p.categories ?? []).map((c: any) => ({ name: c.name, winners: ((p.winners ?? {})[c.categoryId] ?? []).map((id: string) => names.get(String(id)) ?? "Member") })).filter((a: any) => a.winners.length),
    }));
    return NextResponse.json({ club: { id: club.clubId, name: club.name }, open, announced });
  } catch (e) {
    console.error("member awards error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });
    const b = (await request.json().catch(() => ({}))) as Record<string, string>;
    const r = b.action === "withdraw" ? await withdrawNomination(db, String(b.nominationId ?? ""), me) : b.action === "nominate" ? await nominate(db, String(b.programId ?? ""), me, b) : null;
    if (!r) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    return r.ok ? NextResponse.json({ ok: true }, { status: b.action === "nominate" ? 201 : 200 }) : NextResponse.json({ error: r.error }, { status: r.status });
  } catch (e) {
    console.error("member awards post error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
