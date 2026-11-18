/**
 * GET   /api/admin/award-programs/[id]   → the program with every nominee, how often they were nominated, and why
 * PATCH /api/admin/award-programs/[id]   { action: "update", title?, categories?, opensAt?, closesAt? }
 *                                        | { action: "open" | "judging" | "reopen" }
 *                                        | { action: "winners", categoryId, memberIds }
 *                                        | { action: "announce" }
 */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { awardsClub } from "@/lib/awards/access";
import { PROGRAMS, announce, cleanCategories, namesFor, nominationsView, setWinners } from "@/lib/awards/service";

type Ctx = { params: Promise<{ id: string }> };
const iso = (v: unknown) => { const t = Date.parse(String(v ?? "")); return Number.isNaN(t) ? null : new Date(t).toISOString(); };

async function load(id: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, res: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  const db = await getDatabase();
  const program: any = await db.collection(PROGRAMS).findOne({ programId: id }, { projection: { _id: 0 } });
  if (!program) return { ok: false as const, res: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  const club = await awardsClub(session, db, program.clubId);
  if (!club) return { ok: false as const, res: NextResponse.json({ error: "Not allowed" }, { status: 403 }) } as const;
  return { ok: true as const, db, program } as const;
}

export async function GET(_req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const c = await load((await params).id);
    if (!c.ok) return c.res;
    const nominees = await nominationsView(c.db, c.program.programId);
    const names = await namesFor(c.db, Object.values(c.program.winners ?? {}).flat() as string[]);
    const winners = Object.fromEntries(Object.entries(c.program.winners ?? {}).map(([k, ids]) => [k, (ids as string[]).map((id) => ({ memberId: id, name: names.get(id) ?? "Member" }))]));
    return NextResponse.json({ program: { ...c.program, winners }, nominees });
  } catch (e) {
    console.error("award program get error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx): Promise<NextResponse> {
  try {
    const c = await load((await params).id);
    if (!c.ok) return c.res;
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const id = c.program.programId as string;
    const set = (patch: Record<string, unknown>) => c.db.collection(PROGRAMS).updateOne({ programId: id }, { $set: patch });
    if (c.program.status === "announced" && b.action !== "update") return NextResponse.json({ error: "These awards have been announced" }, { status: 409 });
    switch (b.action) {
      case "update": {
        const patch: Record<string, unknown> = {};
        if (typeof b.title === "string" && b.title.trim()) patch.title = b.title.trim().slice(0, 100);
        if ("opensAt" in b) patch.opensAt = iso(b.opensAt);
        if ("closesAt" in b) patch.closesAt = iso(b.closesAt);
        if (Array.isArray(b.categories)) {
          if (c.program.status !== "draft") return NextResponse.json({ error: "Awards can only be changed before nominations open" }, { status: 409 });
          const cats = cleanCategories(b.categories);
          if (!cats.length) return NextResponse.json({ error: "Add at least one award" }, { status: 400 });
          patch.categories = cats;
        }
        await set(patch);
        return NextResponse.json({ ok: true });
      }
      case "open": await set({ status: "open", openedAt: new Date().toISOString() }); return NextResponse.json({ ok: true });
      case "reopen": await set({ status: "open" }); return NextResponse.json({ ok: true });
      case "judging": await set({ status: "judging" }); return NextResponse.json({ ok: true });
      case "winners": { const r = await setWinners(c.db, id, String(b.categoryId ?? ""), Array.isArray(b.memberIds) ? (b.memberIds as string[]) : []); return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status }); }
      case "announce": { const r = await announce(c.db, id); return r.ok ? NextResponse.json({ ok: true, emailed: r.emailed ?? 0 }) : NextResponse.json({ error: r.error }, { status: r.status }); }
      default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    console.error("award program patch error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
