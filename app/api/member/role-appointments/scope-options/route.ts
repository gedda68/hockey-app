/** GET /api/member/role-appointments/scope-options — the teams and age groups of the current club, for scoped roles. */
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { effectiveAccess } from "@/lib/access/memberAccess";
import { rosterAgeGroups, teamScopeValue } from "@/lib/access/scopeTargets";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const db = await getDatabase();
    const access = await effectiveAccess(db, session);
    if (access.context.kind !== "org" || access.context.orgType !== "club") return NextResponse.json({ teams: [], ageGroups: [] });

    const rosters = await db.collection("teamRosters")
      .find({ clubId: access.context.orgId }, { projection: { id: 1, grade: 1, division: 1, season: 1, "teams.name": 1 } })
      .sort({ season: -1 }).limit(200).toArray();

    const teams: { value: string; label: string }[] = [];
    const ages = new Map<string, string>();
    for (const r of rosters as any[]) {
      for (const t of r.teams ?? []) {
        if (!t?.name) continue;
        teams.push({ value: teamScopeValue(String(r.id), String(t.name)), label: `${t.name} · ${[r.division, r.grade].filter(Boolean).join(" ")}${r.season ? ` · ${r.season}` : ""}` });
      }
      for (const a of rosterAgeGroups(r)) ages.set(a.toLowerCase(), a);
    }
    return NextResponse.json({ teams, ageGroups: [...ages.values()].sort().map((a) => ({ value: a, label: a })) });
  } catch (e) {
    console.error("scope-options error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
