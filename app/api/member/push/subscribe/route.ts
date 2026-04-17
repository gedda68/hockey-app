import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDatabase } from "@/lib/mongodb";
import {
  MAX_PUSH_SUBSCRIPTIONS,
  normalizeFanPreferences,
  type FanPushSubscription,
} from "@/lib/member/fanPreferences";

type PushBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.memberId) {
    return NextResponse.json({ error: "Member session required" }, { status: 401 });
  }

  const raw = (await request.json().catch(() => null)) as PushBody | null;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const endpoint = String(raw.endpoint ?? "").trim();
  const p256dh = String(raw.keys?.p256dh ?? "").trim();
  const auth = String(raw.keys?.auth ?? "").trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "endpoint and keys.p256dh / keys.auth are required" }, { status: 400 });
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
  const ua = request.headers.get("user-agent") ?? undefined;
  const nextSub: FanPushSubscription = {
    endpoint,
    keys: { p256dh, auth },
    userAgent: ua,
    createdAt: new Date().toISOString(),
  };

  const without = cur.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
  const merged = [...without, nextSub];
  if (merged.length > MAX_PUSH_SUBSCRIPTIONS) {
    merged.splice(0, merged.length - MAX_PUSH_SUBSCRIPTIONS);
  }

  const fanPreferences = { ...cur, pushSubscriptions: merged, updatedAt: nextSub.createdAt };

  await db.collection("members").updateOne(
    { memberId: session.memberId },
    { $set: { fanPreferences, updatedAt: nextSub.createdAt } },
  );

  return NextResponse.json({ ok: true, subscriptionCount: merged.length });
}
