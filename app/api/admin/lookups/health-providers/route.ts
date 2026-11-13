// Read-only private health insurance providers for the Medical step.
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { normalisePicks } from "@/lib/members/membershipOptions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = (await clientPromise).db("hockey-app");
    const docs = await db.collection("private_health_providers").find({}).limit(500).toArray();
    return NextResponse.json({ items: normalisePicks(docs, ["providerId"]) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e), items: [] }, { status: 500 });
  }
}
