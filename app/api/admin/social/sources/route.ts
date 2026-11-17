/**
 * GET /api/admin/social/sources[?ownerLevel=&ownerId=]
 * Things that can be turned into a public post: open nomination windows (a call for nominations — never the people
 * nominated) and announcements that aren't aimed at particular teams or ages. Each comes with suggested post text.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { APP_URL } from "@/lib/email/client";
import { resolveOwner } from "@/lib/social/access";
import { composeAnnouncementPost, composeNominationPost } from "@/lib/social/compose";
import { isTargeted } from "@/lib/announcements/targeting";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const sp = new URL(request.url).searchParams;
    const o = await resolveOwner(session, { level: sp.get("ownerLevel"), id: sp.get("ownerId") });
    if ("error" in o) return NextResponse.json({ error: o.error }, { status: o.status });
    const db = await getDatabase();
    const now = new Date().toISOString();

    const windows = await db.collection("nomination_windows").find({ scopeType: o.owner.level, scopeId: o.owner.id, status: "open", closeDate: { $gte: now } }, { projection: { _id: 0 } }).sort({ closeDate: 1 }).limit(20).toArray();
    const announcements = await db.collection("announcements").find({ level: o.owner.level, scopeId: o.owner.id, status: "published" }, { projection: { _id: 0 } }).sort({ publishAt: -1 }).limit(20).toArray();
    const nominateLink = `${APP_URL.replace(/\/$/, "")}/admin/nominate`;

    return NextResponse.json({
      nominationWindows: windows.map((w: any) => ({ id: w.windowId, label: w.title, ...composeNominationPost(w, nominateLink) })),
      announcements: announcements.flatMap((a: any) => {
        if (isTargeted(a.targeting)) return [];
        const c = composeAnnouncementPost(a);
        return c.ok ? [{ id: a.announcementId, label: a.title, text: c.value.text, link: /^https:\/\//i.test(a.link ?? "") ? a.link : "" }] : [];
      }),
    });
  } catch (e) {
    console.error("social sources GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
