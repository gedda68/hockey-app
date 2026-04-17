import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getVapidKeys } from "@/lib/push/vapidConfig";

export async function GET() {
  const session = await getSession();
  if (!session?.memberId) {
    return NextResponse.json({ error: "Member session required" }, { status: 401 });
  }
  const keys = getVapidKeys();
  if (!keys) {
    return NextResponse.json({ error: "Web Push is not configured on this server" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: keys.publicKey });
}
