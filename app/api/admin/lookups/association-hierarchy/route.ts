// Read-only associations + clubs for the member Membership step cascade.
// Any signed-in admin may read it; managing associations stays under /api/admin/associations.

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = (await clientPromise).db("hockey-app");
    const inactive = { $nin: ["inactive", "suspended", "archived"] };
    const [assocDocs, clubDocs] = await Promise.all([
      db.collection("associations").find({ status: inactive }).limit(2000).toArray(),
      db.collection("clubs").find({ status: inactive }).limit(5000).toArray(),
    ]);
    const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    const associations = assocDocs
      .map((a) => ({
        associationId: s(a.associationId) ?? String(a._id),
        name: s(a.name) ?? s(a.fullName) ?? "",
        code: s(a.code),
        parentAssociationId: s(a.parentAssociationId) ?? null,
      }))
      .filter((a) => a.name);
    const clubs = clubDocs
      .map((c) => ({
        id: s(c.id) ?? s(c.clubId) ?? String(c._id),
        name: s(c.name) ?? "",
        shortName: s(c.shortName),
        parentAssociationId: s(c.parentAssociationId) ?? null,
      }))
      .filter((c) => c.name);
    return NextResponse.json({ associations, clubs });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), associations: [], clubs: [] }, { status: 500 });
  }
}
