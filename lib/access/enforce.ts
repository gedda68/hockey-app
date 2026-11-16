// lib/access/enforce.ts — server guard for API routes. Returns a response to send when the matrix says no,
// or null to carry on.

import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { accessForSession, loadMemberHoldings } from "@/lib/access/memberAccess";
import { decideArea, decideAreaForTarget, needForMethod, type LogicalArea } from "@/lib/access/areaAccess";
import type { AccessCode, ScopeTarget } from "@/lib/access/matrix";
import { allowedMemberIds } from "@/lib/access/memberScope";
import { rosterTeamTarget } from "@/lib/access/scopeTargets";

export async function areaGuard(area: LogicalArea, method: string, opts: { need?: AccessCode; readNeed?: AccessCode } = {}): Promise<NextResponse | null> {
  try {
    const session = await getSession();
    if (!session) return null; // the route's own auth check answers (401)
    const need = opts.need ?? needForMethod(method, opts.readNeed ?? "R");
    // Cheap exit: no member record means no matrix roles.
    if (!session.memberId) return null;
    const db = await getDatabase();
    const access = await accessForSession(db, session);
    const d = decideArea(access, session.role, area, need);
    if (d.allowed) return null;
    return NextResponse.json(
      { error: d.code === "-" ? "You don't have access to this area" : "Your role doesn't allow this action here" },
      { status: 403 },
    );
  } catch (e) {
    // Never take an API down because the access lookup failed; the route's own checks still apply.
    console.error("areaGuard error:", e);
    return null;
  }
}

/**
 * Guard for a single record that has a scope (a team, age group, match…). Call after loading the record, with
 * the identifiers a role's scope may name. Returns a 403 response or null.
 */
export async function scopeGuard(area: LogicalArea, method: string, target: ScopeTarget, opts: { need?: AccessCode } = {}): Promise<NextResponse | null> {
  try {
    const session = await getSession();
    if (!session || !session.memberId) return null;
    const need = opts.need ?? needForMethod(method, "R");
    const db = await getDatabase();
    const access = await accessForSession(db, session);
    const { holdings, blueCardValid } = await loadMemberHoldings(db, session);
    const d = decideAreaForTarget(access, holdings, blueCardValid, session.role, area, need, target);
    if (d.allowed) return null;
    return NextResponse.json(
      { error: d.code === "-" ? "This is outside the teams and groups your role covers" : "Your role doesn't allow this change for this team or group" },
      { status: 403 },
    );
  } catch (e) {
    console.error("scopeGuard error:", e);
    return null;
  }
}

/** Guard a roster (and optionally one of its teams) for a write. Loads the roster itself. */
export async function rosterScopeGuard(method: string, rosterId: string, teamIndex?: number, opts: { need?: AccessCode; newTeam?: boolean } = {}): Promise<NextResponse | null> {
  try {
    const session = await getSession();
    if (!session || !session.memberId) return null;
    const db = await getDatabase();
    const roster = await db.collection("teamRosters").findOne({ id: rosterId }, { projection: { id: 1, clubId: 1, grade: 1, division: 1, category: 1, "teams.name": 1 } });
    if (!roster) return null; // the route answers 404
    const target = rosterTeamTarget(roster as never, teamIndex);
    // Adding a team to a roster is a change to the group, not to one existing team.
    return scopeGuard("teams", method, opts.newTeam ? { ...target, teamIds: [] } : target, { need: opts.need });
  } catch (e) {
    console.error("rosterScopeGuard error:", e);
    return null;
  }
}

/** For one member record: 403 when the person only sees their own teams / age groups and this member is not on them. */
export async function memberRecordGuard(memberId: string, need: AccessCode = "R"): Promise<NextResponse | null> {
  try {
    const session = await getSession();
    if (!session) return null;
    const db = await getDatabase();
    const ids = await allowedMemberIds(db, session, need);
    if (ids === null || ids.includes(memberId)) return null;
    return NextResponse.json({ error: "This member isn't on a team or group your role covers" }, { status: 403 });
  } catch (e) {
    console.error("memberRecordGuard error:", e);
    return null;
  }
}
