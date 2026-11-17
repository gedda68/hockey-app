/**
 * GET /api/member/sponsors
 * The partners and sponsors of the signed-in person's club and the associations above it, for the bottom bar.
 * Logos and links are public information (the same ones shown on the public site); nothing personal is returned.
 */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { sponsorGroups, associationOnlyGroups } from "@/lib/sponsors/groups";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();

    const assocDocs = await db.collection("associations").find({}, { projection: { associationId: 1, name: 1, parentAssociationId: 1, branding: 1 } }).toArray();
    const byId = new Map(assocDocs.map((a: any) => [String(a.associationId), a]));

    const clubRef = session.clubId || session.clubSlug || "";
    if (clubRef) {
      const club = await db.collection("clubs").findOne({ $or: [{ id: clubRef }, { clubId: clubRef }, { slug: clubRef }] }, { projection: { id: 1, clubId: 1, slug: 1, name: 1, publicPartners: 1, parentAssociationId: 1 } });
      return NextResponse.json({ groups: sponsorGroups(club, byId) });
    }
    if (session.associationId) {
      return NextResponse.json({ groups: associationOnlyGroups({ associationId: session.associationId }, byId) });
    }
    return NextResponse.json({ groups: [] });
  } catch (e) {
    console.error("sponsors GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
