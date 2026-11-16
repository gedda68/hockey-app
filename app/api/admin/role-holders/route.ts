/**
 * Role holders for the organisation the person is working in.
 *   GET   ?q=name &roleKey= &state=      → everyone holding a matrix role here (needs Users & Roles read)
 *   PATCH { memberId, roleKey, action: "end" | "update", patch? }
 *           "end"    — stop the role (kept on record as ended)
 *           "update" — change teams / age groups / squads / matches, season or end date
 * Who may change which role follows the appointment rules (same authority, never above your own level, not your own roles).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { effectiveAccess } from "@/lib/access/memberAccess";
import { getMatrixRole, codeAtLeast, type RoleHolding } from "@/lib/access/matrix";
import { blueCardStatus } from "@/lib/members/blueCard";
import { escapeRegex } from "@/lib/utils/regex";
import { holderState, canManageHolding, cleanHoldingPatch, STATE_LABEL } from "@/lib/access/roleHolders";

const nameOf = (m: any) => `${m?.personalInfo?.firstName ?? ""} ${m?.personalInfo?.lastName ?? ""}`.trim() || m?.memberId;

async function context() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Authentication required" }, { status: 401 }) } as const;
  const db = await getDatabase();
  const access = await effectiveAccess(db, session);
  if (access.context.kind !== "org") return { error: NextResponse.json({ error: "Choose a club or association first" }, { status: 400 }) } as const;
  return { session, db, access, org: access.context } as const;
}

export async function GET(request: NextRequest) {
  try {
    const c = await context();
    if ("error" in c) return c.error;
    const { session, db, access, org } = c;
    const isSuper = session.role === "super-admin";
    if (!isSuper && !access.synthetic && !codeAtLeast(access.areas.usersRoles, "R")) {
      return NextResponse.json({ error: "Not permitted" }, { status: 403 });
    }

    const sp = new URL(request.url).searchParams;
    const q = (sp.get("q") ?? "").trim();
    const roleKey = sp.get("roleKey") ?? "";
    const wantState = sp.get("state") ?? "";

    const filter: Record<string, unknown> = { roleHoldings: { $elemMatch: { orgType: org.orgType, orgId: org.orgId } } };
    if (q.length >= 2) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ "personalInfo.firstName": rx }, { "personalInfo.lastName": rx }, { memberId: rx }];
    }
    const members = await db.collection("members")
      .find(filter, { projection: { memberId: 1, personalInfo: 1, roleHoldings: 1, blueCard: 1 } })
      .limit(400).toArray();

    const me = await resolveSessionMemberId(db, session);
    const by = { access, isSuperAdmin: isSuper };
    const rows: Record<string, unknown>[] = [];
    for (const m of members as any[]) {
      const blueCardOk = blueCardStatus(m.blueCard).ok;
      for (const h of (m.roleHoldings ?? []) as (RoleHolding & { acceptedAt?: string; endedAt?: string })[]) {
        if (h.orgType !== org.orgType || h.orgId !== org.orgId) continue;
        const role = getMatrixRole(h.roleKey);
        if (!role) continue;
        if (roleKey && h.roleKey !== roleKey) continue;
        const state = holderState(h, role, { blueCardOk });
        if (wantState && state !== wantState) continue;
        rows.push({
          memberId: m.memberId, name: nameOf(m), roleKey: h.roleKey, roleName: role.name, category: role.category,
          level: role.level, scope: role.scope, state, stateLabel: STATE_LABEL[state],
          teamIds: h.teamIds ?? [], ageGroups: h.ageGroups ?? [], repSquadIds: h.repSquadIds ?? [], fixtureIds: h.fixtureIds ?? [],
          season: h.season ?? null, expiresAt: h.expiresAt ?? null, acceptedAt: h.acceptedAt ?? null, endedAt: h.endedAt ?? null,
          canManage: state !== "ended" && canManageHolding(by, role, { self: !!me && me === m.memberId }).ok,
        });
      }
    }
    rows.sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.roleName).localeCompare(String(b.roleName)));
    return NextResponse.json({ holders: rows });
  } catch (e) {
    console.error("role-holders GET error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const c = await context();
    if ("error" in c) return c.error;
    const { session, db, access, org } = c;
    const body = await request.json().catch(() => null);
    const memberId = String(body?.memberId ?? ""), roleKey = String(body?.roleKey ?? ""), action = String(body?.action ?? "");
    if (!memberId || !roleKey || !["end", "update"].includes(action)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const role = getMatrixRole(roleKey);
    if (!role) return NextResponse.json({ error: "Unknown role" }, { status: 400 });
    const me = await resolveSessionMemberId(db, session);
    const verdict = canManageHolding({ access, isSuperAdmin: session.role === "super-admin" }, role, { self: !!me && me === memberId });
    if (!verdict.ok) return NextResponse.json({ error: verdict.reason }, { status: 403 });

    const member = await db.collection("members").findOne({ memberId }, { projection: { roleHoldings: 1 } });
    const current = ((member?.roleHoldings ?? []) as (RoleHolding & { status?: string })[])
      .find((h) => h.roleKey === roleKey && h.orgId === org.orgId && h.orgType === org.orgType && h.status !== "ended");
    if (!current) return NextResponse.json({ error: "They don't currently hold this role here" }, { status: 404 });

    const now = new Date().toISOString();
    const match = { memberId, roleHoldings: { $elemMatch: { roleKey, orgType: org.orgType, orgId: org.orgId, status: { $ne: "ended" } } } };
    const before: unknown = current;
    let after: unknown;

    if (action === "end") {
      after = { status: "ended", endedAt: now, endedBy: me ?? session.name };
      await db.collection("members").updateOne(match, { $set: { "roleHoldings.$.status": "ended", "roleHoldings.$.endedAt": now, "roleHoldings.$.endedBy": me ?? session.name, updatedAt: now } });
    } else {
      const cleaned = cleanHoldingPatch(role, current, body?.patch ?? {});
      if (!cleaned.ok) return NextResponse.json({ error: cleaned.error }, { status: 400 });
      const $set: Record<string, unknown> = { updatedAt: now };
      for (const [k, v] of Object.entries(cleaned.set)) $set[`roleHoldings.$.${k}`] = v;
      after = cleaned.set;
      await db.collection("members").updateOne(match, { $set });
    }

    await db.collection("role_holding_log").insertOne({
      memberId, roleKey, orgType: org.orgType, orgId: org.orgId, action, before, after, by: me ?? null, byName: session.name, at: now,
    }).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("role-holders PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
