// POST — O4 privacy-safe partner strip outbound click (aggregated daily counts only).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  loadPartnersForPublicScope,
  partnerRefFromRow,
  PARTNER_STRIP_CLICK_COLLECTION,
  utcDayString,
} from "@/lib/analytics/partnerStripClick";

const BodySchema = z.object({
  scopeType: z.enum(["association", "club"]),
  scopeId: z.string().min(1).max(200).trim(),
  slot: z.number().int().min(0).max(23),
});

export async function POST(request: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { scopeType, scopeId, slot } = parsed.data;

    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "hockey-app");

    const partners = await loadPartnersForPublicScope(db, scopeType, scopeId);
    if (!partners?.length) {
      return NextResponse.json({ error: "Unknown scope or no partners" }, { status: 404 });
    }

    const row = partners[slot];
    if (!row?.url?.trim()) {
      return NextResponse.json({ error: "Invalid slot or no outbound URL" }, { status: 400 });
    }

    const partnerRef = partnerRefFromRow(row.name, row.url);
    const day = utcDayString();
    const label = row.name.trim().slice(0, 120);
    const now = new Date().toISOString();

    await db.collection(PARTNER_STRIP_CLICK_COLLECTION).updateOne(
      { scopeType, scopeId, partnerRef, day },
      {
        $inc: { clicks: 1 },
        $set: { label, updatedAt: now },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST partner-strip-click error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
