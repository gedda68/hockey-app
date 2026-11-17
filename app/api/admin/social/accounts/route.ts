/**
 * Facebook Pages connected for a club or association.
 *   GET  → the pages for the organisations you can act for (never the tokens)
 *   POST { ownerLevel?, ownerId?, pageId, accessToken }  → connect a page (the token is checked with Facebook, then stored encrypted)
 * Needs SOCIAL_TOKEN_KEY on the server. Same people as announcements.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { ownersFor, resolveOwner } from "@/lib/social/access";
import { encryptToken, socialKeyConfigured } from "@/lib/social/crypto";
import { verifyPage } from "@/lib/social/facebook";
import { ACCOUNTS } from "@/lib/social/posts";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const owners = await ownersFor(session);
    if (!owners) return NextResponse.json({ error: "You can't manage social posts" }, { status: 403 });
    if (!owners.length) return NextResponse.json({ accounts: [], owners: [], keyConfigured: socialKeyConfigured() });
    const db = await getDatabase();
    const accounts = await db.collection(ACCOUNTS).find({ status: "active", $or: owners.map((o) => ({ ownerLevel: o.level, ownerId: o.id })) }, { projection: { _id: 0, tokenEnc: 0 } }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ accounts, owners, keyConfigured: socialKeyConfigured() });
  } catch (e) {
    console.error("social accounts GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const o = await resolveOwner(session, { level: b.ownerLevel, id: b.ownerId });
    if ("error" in o) return NextResponse.json({ error: o.error }, { status: o.status });
    if (!socialKeyConfigured()) return NextResponse.json({ error: "Social posting isn't set up on the server yet (SOCIAL_TOKEN_KEY is missing)" }, { status: 503 });

    const pageId = String(b.pageId ?? "").trim();
    const token = String(b.accessToken ?? "").trim();
    if (!/^\d{5,30}$/.test(pageId)) return NextResponse.json({ error: "The Page ID should be a number" }, { status: 400 });
    if (token.length < 20) return NextResponse.json({ error: "Paste the Page access token" }, { status: 400 });

    let page: { id: string; name: string };
    try { page = await verifyPage(pageId, token); }
    catch (e) { return NextResponse.json({ error: `Facebook didn't accept that: ${e instanceof Error ? e.message : "unknown error"}` }, { status: 400 }); }

    const db = await getDatabase();
    const now = new Date().toISOString();
    const accountId = `SOCACC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await db.collection(ACCOUNTS).updateOne(
      { ownerLevel: o.owner.level, ownerId: o.owner.id, platform: "facebook", pageId: page.id },
      { $set: { tokenEnc: encryptToken(token), pageName: page.name, status: "active", updatedAt: now, connectedBy: session.name }, $setOnInsert: { accountId, ownerLevel: o.owner.level, ownerId: o.owner.id, platform: "facebook", pageId: page.id, createdAt: now } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, pageName: page.name }, { status: 201 });
  } catch (e) {
    console.error("social accounts POST error:", e);
    return NextResponse.json({ error: "Failed to connect" }, { status: 500 });
  }
}
