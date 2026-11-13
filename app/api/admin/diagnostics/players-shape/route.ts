// Diagnostic: shows how separate "player" records are stored, WITHOUT returning any personal data.
// Returns collection names, counts, the field names seen, and how many records already link to a member.
// Settings admins only.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requirePermission } from "@/lib/auth/middleware";

const LINK_FIELDS = ["linkedMemberId", "memberId", "member_id", "linkedMember"];

function paths(doc: Record<string, unknown>, prefix = "", depth = 0, out = new Set<string>()) {
  for (const [k, v] of Object.entries(doc)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && depth < 2 && !("_bsontype" in (v as object))) {
      paths(v as Record<string, unknown>, p, depth + 1, out);
    } else out.add(p);
  }
  return out;
}

export async function GET(request: NextRequest) {
  const { response: authRes } = await requirePermission(request, "system.settings");
  if (authRes) return authRes;
  try {
    const db = (await clientPromise).db("hockey-app");
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    const candidates = names.filter((n) => /player/i.test(n));
    const result: Record<string, unknown> = {};
    for (const name of candidates) {
      const col = db.collection(name);
      const total = await col.countDocuments({});
      const sample = await col.find({}).limit(25).toArray();
      const fields = new Set<string>();
      for (const d of sample) paths(d as Record<string, unknown>, "", 0, fields);
      const linked: Record<string, number> = {};
      for (const f of LINK_FIELDS) {
        linked[f] = await col.countDocuments({ [f]: { $exists: true, $nin: [null, ""] } });
      }
      result[name] = { total, fields: [...fields].sort(), withLink: linked };
    }
    return NextResponse.json({ collectionsMatchingPlayer: candidates, details: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
