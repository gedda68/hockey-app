// lib/reports/service.ts — loads registrations and people for a club or association (including everything beneath it) and builds the report.

import type { Db } from "mongodb";
import { buildCommitteeReport, type CommitteeReport, type Person, type Reg } from "@/lib/reports/committee";
import { NOT_REGISTERED } from "@/lib/reports/groups";
import { clubRefsUnder, descendantAssociationIds } from "@/lib/surveys/audience";

export type ReportScope = { scope: "club" | "association" | "global"; scopeId?: string | null };

const nameOf = (m: any) => {
  const p = m.personalInfo ?? {};
  return String(p.displayName || `${p.firstName ?? m.firstName ?? ""} ${p.lastName ?? m.lastName ?? ""}`).trim() || "Member";
};

export async function loadCommitteeReport(db: Db, s: ReportScope, season: string, years = 8): Promise<CommitteeReport> {
  const minYear = String(Number(season) - years);
  const base: Record<string, unknown> = { seasonYear: { $gte: minYear, $lte: season }, status: { $nin: NOT_REGISTERED.flatMap((x) => [x, x[0].toUpperCase() + x.slice(1)]) } };

  const clubDocs = await db.collection("clubs").find({}, { projection: { id: 1, clubId: 1, slug: 1, name: 1, parentAssociationId: 1 } }).toArray();
  const clubNames = new Map<string, string>();
  for (const c of clubDocs) for (const k of [c.id, c.clubId, c.slug]) if (k) clubNames.set(String(k), String(c.name ?? ""));

  let clubRefs: string[] | null = null, assocIds: string[] | null = null;
  if (s.scope === "club" && s.scopeId) {
    const own = clubDocs.find((c) => [c.id, c.clubId, c.slug].map(String).includes(s.scopeId!));
    clubRefs = own ? [...new Set([own.id, own.clubId, own.slug, s.scopeId].filter(Boolean).map(String))] : [s.scopeId];
  } else if (s.scope === "association" && s.scopeId) {
    const all = await db.collection("associations").find({}, { projection: { associationId: 1, parentAssociationId: 1 } }).toArray();
    assocIds = descendantAssociationIds(all as never, s.scopeId);
    clubRefs = await clubRefsUnder(db, assocIds);
  }

  const scopeFilter = clubRefs ? { $or: [{ clubId: { $in: clubRefs } }, ...(assocIds ? [{ associationId: { $in: assocIds } }] : [])] } : {};
  const regs: Reg[] = [];
  for (const coll of ["club-registrations", "association-registrations"]) {
    const rows = await db.collection(coll).find({ ...base, ...scopeFilter }, { projection: { memberId: 1, seasonYear: 1, clubId: 1, associationId: 1, roleIds: 1, roles: 1, registeredDate: 1, createdAt: 1 } }).toArray();
    for (const r of rows) {
      const roles = ((r.roleIds ?? r.roles ?? []) as unknown[]).map((x) => (typeof x === "string" ? x : String((x as { role?: string; roleId?: string })?.roleId ?? (x as { role?: string })?.role ?? "")));
      const at = r.registeredDate ?? r.createdAt;
      regs.push({ memberId: String(r.memberId ?? ""), season: String(r.seasonYear ?? ""), clubId: r.clubId ? String(r.clubId) : undefined, roles, at: at ? new Date(at).toISOString() : null });
    }
  }

  const ids = [...new Set(regs.map((r) => r.memberId).filter(Boolean))];
  const people = new Map<string, Person>();
  for (let i = 0; i < ids.length; i += 1000) {
    const rows = await db.collection("members").find({ memberId: { $in: ids.slice(i, i + 1000) } }, { projection: { memberId: 1, personalInfo: 1, firstName: 1, lastName: 1 } }).toArray();
    for (const m of rows) people.set(String(m.memberId), { name: nameOf(m), gender: m.personalInfo?.gender, dob: m.personalInfo?.dateOfBirth, school: m.personalInfo?.school ?? null });
  }
  return buildCommitteeReport({ regs, people, season, clubNames, years });
}
