/**
 * GET  /api/admin/award-programs?clubId=   → the club's season award programs
 * POST /api/admin/award-programs           { seasonYear, title?, categories?, opensAt?, closesAt? }  (starts as a draft)
 */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { awardsClub } from "@/lib/awards/access";
import { PROGRAMS, cleanCategories } from "@/lib/awards/service";
import { DEFAULT_CATEGORIES } from "@/lib/awards/logic";
import { randomBytes } from "node:crypto";

const iso = (v: unknown) => { const t = Date.parse(String(v ?? "")); return Number.isNaN(t) ? null : new Date(t).toISOString(); };

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const club = await awardsClub(session, db, request.nextUrl.searchParams.get("clubId"));
    if (!club) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const programs = await db.collection(PROGRAMS).find({ clubId: club.clubId }, { projection: { _id: 0 } }).sort({ seasonYear: -1, createdAt: -1 }).limit(50).toArray();
    return NextResponse.json({ club: { id: club.clubId, name: club.name }, programs, defaultCategories: DEFAULT_CATEGORIES });
  } catch (e) {
    console.error("award programs list error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const club = await awardsClub(session, db, String(b.clubId ?? "") || null);
    if (!club) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const seasonYear = String(b.seasonYear ?? "").trim();
    if (!/^\d{4}$/.test(seasonYear)) return NextResponse.json({ error: "Enter the season year, like 2026" }, { status: 400 });
    const categories = cleanCategories(Array.isArray(b.categories) && b.categories.length ? b.categories : DEFAULT_CATEGORIES);
    if (!categories.length) return NextResponse.json({ error: "Add at least one award" }, { status: 400 });
    const doc = {
      programId: `AWD-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`, clubId: club.clubId, clubName: club.name, seasonYear,
      title: String(b.title ?? "").trim().slice(0, 100) || `${club.name} ${seasonYear} awards`, categories, opensAt: iso(b.opensAt), closesAt: iso(b.closesAt),
      status: "draft", winners: {}, createdBy: String(session.memberId ?? session.userId ?? ""), createdAt: new Date().toISOString(),
    };
    await db.collection(PROGRAMS).insertOne(doc);
    return NextResponse.json({ program: doc }, { status: 201 });
  } catch (e) {
    console.error("award program create error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
