// Read-only list of relationship types for forms (member edit, emergency contacts).
// Any signed-in admin may read it; managing the list stays under /api/admin/relationship-types.

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { RELATIONSHIP_COLLECTIONS, normaliseRelationship } from "@/lib/members/relationshipLookup";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db("hockey-app");

  for (const name of RELATIONSHIP_COLLECTIONS) {
    const docs = await db.collection(name).find({}).limit(500).toArray();
    const items = docs.map((d) => normaliseRelationship(d)).filter((x): x is NonNullable<typeof x> => !!x && x.isActive);
    if (items.length) {
      items.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999) || a.name.localeCompare(b.name));
      return NextResponse.json({ source: name, items });
    }
  }
  // Older installs kept them in the shared config collection.
  const cfg = await db.collection("config").find({ configType: "relationship-type" }).limit(500).toArray();
  const items = cfg.map((d) => normaliseRelationship(d)).filter((x): x is NonNullable<typeof x> => !!x && x.isActive);
  return NextResponse.json({ source: items.length ? "config" : null, items });
}
