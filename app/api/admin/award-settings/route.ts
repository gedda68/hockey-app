/** GET / PUT /api/admin/award-settings?clubId=  → whether player-of-the-match votes open after each game, and for how long */
import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { awardsClub } from "@/lib/awards/access";
import { loadAwardSettings, saveAwardSettings } from "@/lib/awards/service";

async function ctx(request: NextRequest) {
  const session = await getSession();
  if (!session) return { ok: false as const, res: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  const db = await getDatabase();
  const club = await awardsClub(session, db, request.nextUrl.searchParams.get("clubId"));
  if (!club) return { ok: false as const, res: NextResponse.json({ error: "Not allowed" }, { status: 403 }) } as const;
  return { ok: true as const, db, club } as const;
}
export async function GET(request: NextRequest): Promise<NextResponse> {
  const c = await ctx(request);
  if (!c.ok) return c.res;
  return NextResponse.json({ club: { id: c.club.clubId, name: c.club.name }, settings: await loadAwardSettings(c.db, c.club.clubId) });
}
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const c = await ctx(request);
  if (!c.ok) return c.res;
  return NextResponse.json({ settings: await saveAwardSettings(c.db, c.club.clubId, await request.json().catch(() => ({}))) });
}
