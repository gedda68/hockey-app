// Member logins store the member's Mongo _id (24-hex) as `session.memberId`, while member records,
// registrations, payments etc. are keyed by the member's own `memberId` string ("MBR-…"). This resolves
// the session to that string; a session that already holds a "MBR-…" style id is returned unchanged.

import { ObjectId, type Db } from "mongodb";

export async function resolveSessionMemberId(
  db: Db,
  session: { memberId?: string | null },
): Promise<string> {
  const raw = String(session.memberId ?? "").trim();
  if (!raw) return "";
  if (!ObjectId.isValid(raw) || raw.length !== 24) return raw;
  const m = await db.collection("members").findOne({ _id: new ObjectId(raw) }, { projection: { memberId: 1 } });
  return String(m?.memberId ?? raw);
}
