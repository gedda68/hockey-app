// lib/announcements/manage.ts
// Loading an announcement for someone who wants to change or inspect it: they must be able to write to its audience.

import { NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { canWriteTo, COL, writableAudiences } from "@/lib/announcements/access";

export type Manageable = { response: NextResponse } | { response?: undefined; db: Db; row: Record<string, any> };

export async function loadManageable(id: string): Promise<Manageable> {
  const session = await getSession();
  if (!session) return { response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  const audiences = await writableAudiences(session);
  if (!audiences) return { response: NextResponse.json({ error: "You can't manage announcements" }, { status: 403 }) };
  const db = await getDatabase();
  const row = await db.collection(COL).findOne({ announcementId: id });
  if (!row) return { response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!audiences.includes(row.level) || !(await canWriteTo(session, row.level, String(row.scopeId ?? "")))) {
    return { response: NextResponse.json({ error: "You can't change that announcement" }, { status: 403 }) };
  }
  return { db, row };
}
