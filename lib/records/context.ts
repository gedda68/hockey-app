// lib/records/context.ts
// Common start for the training, injury and incident routes: who is asking, for which club, and at what level.

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSession, type SessionData } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { accessForSession } from "@/lib/access/memberAccess";
import { userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import { atLeast, recordLevel, type RecordArea, type RecordLevel } from "@/lib/records/access";

export interface RecordsContext {
  db: Db;
  session: SessionData;
  /** The member's own memberId ("MBR-…"), or "" for accounts with no member profile. */
  me: string;
  clubId: string;
  level: RecordLevel;
}

const deny = (status: number, error: string) => ({ response: NextResponse.json({ error }, { status }) }) as const;

/**
 * `need` is the lowest level the call requires. `own` means anyone signed in who has a club may use it, and the
 * route then limits what they see to their own records.
 */
export async function recordsContext(request: NextRequest, area: RecordArea, need: RecordLevel): Promise<RecordsContext | { response: NextResponse }> {
  const session = await getSession();
  if (!session) return deny(401, "Authentication required");
  const db = await getDatabase();
  const me = session.memberId ? await resolveSessionMemberId(db, session) : "";

  const asked = new URL(request.url).searchParams.get("clubId")?.trim();
  const clubId = asked || session.clubId || "";
  if (!clubId) return deny(400, "Choose a club first");
  if (asked && asked !== session.clubId && !(await userCanAccessClubResource(session, asked))) return deny(403, "You can't use that club");

  const access = session.memberId ? await accessForSession(db, session).catch(() => null) : null;
  const { level } = recordLevel(access, session.role, area);
  if (!atLeast(level, need)) return deny(403, level === "none" ? "You don't have access to this area" : "Your role doesn't allow this here");
  return { db, session, me, clubId, level };
}

export const isDenied = (c: RecordsContext | { response: NextResponse }): c is { response: NextResponse } => "response" in c;
