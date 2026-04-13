// Build / validate persona switches for multi-role users (JWT session refresh).

import type { Db } from "mongodb";
import type { SessionData, ScopedRole } from "@/lib/auth/session";
import { numericLevelToString } from "@/lib/types/roles";
import type { AssociationLevel } from "@/lib/types/roles";
import { generateSlug } from "@/lib/utils/slug";
import { applyPortalSubdomainToSession } from "@/lib/tenant/applySessionPortalSubdomain";

export type PersonaOption = {
  /** Stable key sent to POST /api/auth/switch-persona */
  key: string;
  label: string;
  role: string;
  scopeType: ScopedRole["scopeType"];
  scopeId?: string;
};

export function encodePersonaKey(
  role: string,
  scopeType: ScopedRole["scopeType"],
  scopeId?: string | null,
): string {
  return `${role}::${scopeType}::${scopeId ?? ""}`;
}

export function parsePersonaKey(
  key: string,
): { role: string; scopeType: ScopedRole["scopeType"]; scopeId?: string } | null {
  const parts = key.split("::");
  if (parts.length !== 3) return null;
  const [role, scopeType, scopeId] = parts;
  const st = scopeType as ScopedRole["scopeType"];
  if (!["global", "association", "club", "team"].includes(st)) return null;
  return {
    role,
    scopeType: st,
    scopeId: scopeId || undefined,
  };
}

/** Current session’s active persona key (matches JWT primary scope). */
export function activePersonaKeyFromSession(session: SessionData): string {
  if (session.role === "super-admin") {
    return encodePersonaKey("super-admin", "global", "");
  }
  if (session.clubId) {
    return encodePersonaKey(session.role, "club", session.clubId);
  }
  if (session.associationId) {
    return encodePersonaKey(session.role, "association", session.associationId);
  }
  return encodePersonaKey(session.role, "global", "");
}

export function personaIsAllowed(
  session: SessionData,
  parsed: { role: string; scopeType: ScopedRole["scopeType"]; scopeId?: string },
): boolean {
  if (session.role === "super-admin") return true;
  const target = encodePersonaKey(parsed.role, parsed.scopeType, parsed.scopeId);
  if (target === activePersonaKeyFromSession(session)) return true;
  const scoped = session.scopedRoles ?? [];
  return scoped.some(
    (r) => encodePersonaKey(r.role, r.scopeType, r.scopeId) === target,
  );
}

function humanRole(role: string): string {
  return role
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Labels for sidebar switcher — optional club/assoc names from DB.
 */
export async function enrichPersonaLabels(
  db: Db,
  options: PersonaOption[],
): Promise<PersonaOption[]> {
  const clubIds = new Set<string>();
  const assocIds = new Set<string>();
  for (const o of options) {
    if (o.scopeType === "club" && o.scopeId) clubIds.add(o.scopeId);
    if (o.scopeType === "association" && o.scopeId) assocIds.add(o.scopeId);
    if (o.scopeType === "team" && o.scopeId) {
      const t = await db
        .collection("teams")
        .findOne({ teamId: o.scopeId }, { projection: { clubId: 1 } });
      if (t?.clubId) clubIds.add(String(t.clubId));
    }
  }

  const clubMap = new Map<string, string>();
  if (clubIds.size > 0) {
    const clubs = await db
      .collection("clubs")
      .find({ id: { $in: [...clubIds] } })
      .project({ id: 1, name: 1 })
      .toArray();
    for (const c of clubs) {
      if (c.id) clubMap.set(String(c.id), String(c.name ?? c.id));
    }
  }

  const assocMap = new Map<string, string>();
  if (assocIds.size > 0) {
    const assocs = await db
      .collection("associations")
      .find({ associationId: { $in: [...assocIds] } })
      .project({ associationId: 1, name: 1 })
      .toArray();
    for (const a of assocs) {
      if (a.associationId)
        assocMap.set(String(a.associationId), String(a.name ?? a.associationId));
    }
  }

  return options.map((o) => {
    let extra = "";
    if (o.scopeType === "club" && o.scopeId) {
      extra = clubMap.get(o.scopeId) ? ` — ${clubMap.get(o.scopeId)}` : "";
    } else if (o.scopeType === "association" && o.scopeId) {
      extra = assocMap.get(o.scopeId) ? ` — ${assocMap.get(o.scopeId)}` : "";
    } else if (o.scopeType === "team" && o.scopeId) {
      extra = ` — Team ${o.scopeId}`;
    }
    return {
      ...o,
      label: `${humanRole(o.role)}${extra}`,
    };
  });
}

export async function buildPersonaOptions(
  db: Db,
  session: SessionData,
): Promise<PersonaOption[]> {
  const seen = new Set<string>();
  const raw: PersonaOption[] = [];

  const add = (
    role: string,
    scopeType: ScopedRole["scopeType"],
    scopeId?: string,
  ) => {
    const key = encodePersonaKey(role, scopeType, scopeId);
    if (seen.has(key)) return;
    seen.add(key);
    raw.push({
      key,
      label: humanRole(role),
      role,
      scopeType,
      scopeId,
    });
  };

  if (session.role === "super-admin") {
    add("super-admin", "global", "");
  } else if (session.clubId) {
    add(session.role, "club", session.clubId);
  } else if (session.associationId) {
    add(session.role, "association", session.associationId);
  } else {
    add(session.role, "global", "");
  }

  for (const sr of session.scopedRoles ?? []) {
    add(sr.role, sr.scopeType, sr.scopeId);
  }

  return enrichPersonaLabels(db, raw);
}

export async function sessionWithPersona(
  db: Db,
  session: SessionData,
  personaKey: string,
): Promise<SessionData | null> {
  const parsed = parsePersonaKey(personaKey);
  if (!parsed || !personaIsAllowed(session, parsed)) return null;

  const base: SessionData = {
    ...session,
    scopedRoles: session.scopedRoles,
  };

  if (parsed.role === "super-admin" && parsed.scopeType === "global") {
    return applyPortalSubdomainToSession(db, {
      ...base,
      role: "super-admin",
      associationId: null,
      associationLevel: undefined,
      clubId: null,
      clubSlug: null,
      clubName: undefined,
    });
  }

  if (parsed.scopeType === "association" && parsed.scopeId) {
    const assoc = await db.collection("associations").findOne(
      { associationId: parsed.scopeId },
      { projection: { level: 1 } },
    );
    let associationLevel: AssociationLevel | undefined;
    if (assoc && typeof assoc.level === "number") {
      associationLevel = numericLevelToString(assoc.level);
    }
    return applyPortalSubdomainToSession(db, {
      ...base,
      role: parsed.role,
      associationId: parsed.scopeId,
      associationLevel,
      clubId: null,
      clubSlug: null,
      clubName: undefined,
    });
  }

  if (parsed.scopeType === "club" && parsed.scopeId) {
    const club = await db.collection("clubs").findOne({
      $or: [{ id: parsed.scopeId }, { clubId: parsed.scopeId }],
    });
    if (!club) return null;
    const id = String(club.id ?? club.clubId ?? parsed.scopeId);
    let clubSlug = club.slug ? String(club.slug) : undefined;
    if (!clubSlug && club.name) {
      clubSlug = generateSlug(String(club.name));
      await db
        .collection("clubs")
        .updateOne({ _id: club._id }, { $set: { slug: clubSlug } });
    }
    const parentAssociationId = club.parentAssociationId
      ? String(club.parentAssociationId)
      : null;
    let associationLevel: AssociationLevel | undefined;
    if (parentAssociationId) {
      const assoc = await db.collection("associations").findOne(
        { associationId: parentAssociationId },
        { projection: { level: 1 } },
      );
      if (assoc && typeof assoc.level === "number") {
        associationLevel = numericLevelToString(assoc.level);
      }
    }
    return applyPortalSubdomainToSession(db, {
      ...base,
      role: parsed.role,
      associationId: parentAssociationId,
      associationLevel,
      clubId: id,
      clubSlug: clubSlug ?? null,
      clubName: club.name ? String(club.name) : undefined,
    });
  }

  if (parsed.scopeType === "team" && parsed.scopeId) {
    const team = await db
      .collection("teams")
      .findOne({ teamId: parsed.scopeId }, { projection: { clubId: 1 } });
    if (!team?.clubId) return null;
    const clubId = String(team.clubId);
    const club = await db.collection("clubs").findOne({
      $or: [{ id: clubId }, { clubId: clubId }],
    });
    if (!club) return null;
    const id = String(club.id ?? club.clubId ?? clubId);
    let clubSlug = club.slug ? String(club.slug) : undefined;
    if (!clubSlug && club.name) {
      clubSlug = generateSlug(String(club.name));
      await db
        .collection("clubs")
        .updateOne({ _id: club._id }, { $set: { slug: clubSlug } });
    }
    const parentAssociationId = club.parentAssociationId
      ? String(club.parentAssociationId)
      : null;
    let associationLevel: AssociationLevel | undefined;
    if (parentAssociationId) {
      const assoc = await db.collection("associations").findOne(
        { associationId: parentAssociationId },
        { projection: { level: 1 } },
      );
      if (assoc && typeof assoc.level === "number") {
        associationLevel = numericLevelToString(assoc.level);
      }
    }
    return applyPortalSubdomainToSession(db, {
      ...base,
      role: parsed.role,
      associationId: parentAssociationId,
      associationLevel,
      clubId: id,
      clubSlug: clubSlug ?? null,
      clubName: club.name ? String(club.name) : undefined,
    });
  }

  if (parsed.scopeType === "global") {
    return applyPortalSubdomainToSession(db, {
      ...base,
      role: parsed.role,
      associationId: null,
      associationLevel: undefined,
      clubId: null,
      clubSlug: null,
      clubName: undefined,
    });
  }

  return null;
}
