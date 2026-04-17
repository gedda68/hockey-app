import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDatabase } from "@/lib/mongodb";
import { normalizeFanPreferences } from "@/lib/member/fanPreferences";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.memberId) {
    return NextResponse.json({ error: "Member session required" }, { status: 401 });
  }

  const raw = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  const endpoint = String(raw?.endpoint ?? "").trim();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  const db = await getDatabase();
  const member = await db.collection("members").findOne(
    { memberId: session.memberId },
    { projection: { fanPreferences: 1 } },
  );
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const cur = normalizeFanPreferences((member as { fanPreferences?: unknown }).fanPreferences);
  const merged = cur.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
  const updatedAt = new Date().toISOString();
  const fanPreferences = { ...cur, pushSubscriptions: merged, updatedAt };

  await db.collection("members").updateOne(
    { memberId: session.memberId },
    { $set: { fanPreferences, updatedAt } },
  );

  return NextResponse.json({ ok: true, subscriptionCount: merged.length });
}
