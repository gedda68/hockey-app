/**
 * GET /api/member/my-children
 * People I'm a recorded parent/guardian of, with what is waiting for my approval. Scoped to the signed-in member.
 */

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { childrenOf, isMinor } from "@/lib/access/guardians";
import { getMatrixRole } from "@/lib/access/matrix";
import { holdingState } from "@/lib/member/myAppointments";

const ageOf = (dob: unknown, now = new Date()): number | null => {
  const d = new Date(String(dob ?? ""));
  if (Number.isNaN(d.getTime())) return null;
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const me = await resolveSessionMemberId(db, session);
    if (!me) return NextResponse.json({ children: [] });

    const kids = await childrenOf(db, me);
    const ids = kids.map((k) => String(k.memberId));
    const [reqs, appts] = ids.length
      ? await Promise.all([
          db.collection("role_requests").find({ memberId: { $in: ids }, "guardianApproval.status": "pending", status: { $in: ["pending_payment", "awaiting_approval"] } }, { projection: { memberId: 1 } }).toArray(),
          db.collection("role_appointments").find({ memberId: { $in: ids }, status: "pending", "guardianApproval.status": "pending" }, { projection: { memberId: 1 } }).toArray(),
        ])
      : [[], []];
    const waiting = new Map<string, number>();
    for (const r of [...reqs, ...appts] as any[]) waiting.set(r.memberId, (waiting.get(r.memberId) ?? 0) + 1);

    const clubIds = [...new Set(kids.map((k) => String(k.clubId || k.membership?.clubId || "")).filter(Boolean))];
    const clubs = clubIds.length ? await db.collection("clubs").find({ $or: [{ id: { $in: clubIds } }, { clubId: { $in: clubIds } }] }, { projection: { id: 1, clubId: 1, name: 1 } }).toArray() : [];
    const clubName = new Map<string, string>();
    for (const c of clubs as any[]) { if (c.id) clubName.set(c.id, c.name); if (c.clubId) clubName.set(c.clubId, c.name); }

    const children = kids.map((k) => {
      const p = k.personalInfo ?? {};
      const clubId = String(k.clubId || k.membership?.clubId || "");
      return {
        memberId: String(k.memberId),
        name: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || String(k.memberId),
        age: ageOf(p.dateOfBirth),
        isMinor: isMinor(p.dateOfBirth),
        clubName: clubName.get(clubId) ?? null,
        status: k.membership?.status ?? null,
        roles: ((k.roleHoldings ?? []) as any[])
          .filter((h) => holdingState(h) === "active")
          .map((h) => getMatrixRole(h.roleKey)?.name ?? h.roleKey),
        waitingForMe: waiting.get(String(k.memberId)) ?? 0,
      };
    });
    return NextResponse.json({ children });
  } catch (e) {
    console.error("my-children GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
