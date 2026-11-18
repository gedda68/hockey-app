// POST — privacy-safe sponsor impression: "these sponsors were on screen" (aggregated daily counts only).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import clientPromise from "@/lib/mongodb";
import { recordImpressions } from "@/lib/sponsors/service";
import { cleanSource, isAutomated } from "@/lib/sponsors/track";

const BodySchema = z.object({
  scopeType: z.enum(["association", "club"]),
  scopeId: z.string().min(1).max(200).trim(),
  slots: z.array(z.number().int().min(0).max(23)).min(1).max(24),
  source: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });
    // Link previews, crawlers and monitors aren't people looking at the sponsor.
    if (isAutomated(request.headers.get("user-agent"))) return NextResponse.json({ ok: true, counted: 0 });
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");
    const counted = await recordImpressions(db, { ...parsed.data, source: cleanSource(parsed.data.source) });
    return NextResponse.json({ ok: true, counted });
  } catch (e) {
    console.error("POST partner-strip-impression error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
