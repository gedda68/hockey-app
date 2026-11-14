/**
 * GET /api/member/club-options?q=cam
 * Club type-ahead for signed-in members (used when adding a related person from another club).
 * Public-directory fields only: id, name, city. Requires at least 2 characters.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.memberId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
    if (q.length < 2) return NextResponse.json({ clubs: [] });

    const re = new RegExp(esc(q), "i");
    const db = (await clientPromise).db("hockey-app");
    const clubs = await db.collection("clubs")
      .find({ status: { $ne: "inactive" }, $or: [{ name: re }, { shortName: re }, { city: re }] },
        { projection: { _id: 0, id: 1, name: 1, city: 1, suburb: 1 } })
      .sort({ name: 1 })
      .limit(15)
      .toArray();

    return NextResponse.json({
      clubs: clubs.filter((c) => c.id && c.name).map((c) => ({ id: String(c.id), name: String(c.name), city: String(c.city ?? c.suburb ?? "") })),
    });
  } catch (e) {
    console.error("club-options error:", e);
    return NextResponse.json({ clubs: [] });
  }
}
