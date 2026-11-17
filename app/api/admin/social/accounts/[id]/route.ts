/** DELETE /api/admin/social/accounts/{id} — disconnect a page (its token is discarded; queued posts to it are cancelled). */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveOwner } from "@/lib/social/access";
import { ACCOUNTS, POSTS } from "@/lib/social/posts";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const { id } = await params;
    const db = await getDatabase();
    const account = await db.collection(ACCOUNTS).findOne({ accountId: id });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const o = await resolveOwner(session, { level: account.ownerLevel, id: account.ownerId });
    if ("error" in o) return NextResponse.json({ error: o.error }, { status: o.status });
    await db.collection(ACCOUNTS).updateOne({ accountId: id }, { $set: { status: "disconnected", tokenEnc: "", updatedAt: new Date().toISOString() } });
    await db.collection(POSTS).updateMany({ accountId: id, status: "queued" }, { $set: { status: "cancelled", updatedAt: new Date().toISOString() } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("social accounts DELETE error:", e);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
