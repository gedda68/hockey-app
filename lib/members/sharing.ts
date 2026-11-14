// Sensitive member data is private by default. Medical, healthcare, blue card and emergency contacts are
// only released to the people who need them, when they need them — e.g. when the member is accepted into a
// team. A release is recorded on the member (so they can see who has access) and covers one season.
//
//   member.sharing.releases = [{ releaseId, purpose, audience: "club" | "association", scopeId, label,
//                                seasonYear, grantedAt, source }]
//
// Owners always see their own data. Super-admins keep access so records can be maintained.

import { isContactPrivate, redactPrivateContact } from "@/lib/members/privacy";

type Doc = Record<string, any>;

/** Top-level member fields withheld unless released. */
export const SENSITIVE_KEYS = ["medical", "healthcare", "blueCard", "emergencyContacts"] as const;

export interface Release {
  releaseId: string;
  purpose: string; // "team-acceptance" | "rep-selection" | …
  audience: "club" | "association";
  /** Club id/slug, or association id; "*" = any association (rep selection). */
  scopeId: string;
  label: string;
  seasonYear: number;
  grantedAt: string;
  source?: string;
}

export interface Viewer {
  role?: string | null;
  memberId?: string | null; // may be the Mongo _id hex from a session
  clubId?: string | null;
  clubSlug?: string | null;
  associationId?: string | null;
}

const ASSOC_ROLES = ["association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar", "assoc-competition"];
const CLUB_STAFF_ROLES = ["club-admin", "club-committee", "registrar", "coach", "manager", "team-selector"];

export function isOwner(member: Doc, viewer?: Viewer | null): boolean {
  const id = viewer?.memberId ? String(viewer.memberId) : "";
  return !!id && (id === String(member.memberId) || (member._id != null && id === String(member._id)));
}

export function activeReleases(member: Doc, year = new Date().getFullYear()): Release[] {
  const list: Release[] = Array.isArray(member?.sharing?.releases) ? member.sharing.releases : [];
  return list.filter((r) => Number(r.seasonYear) >= year);
}

/** Does this viewer currently have a release covering the member's sensitive data? */
export function hasRelease(member: Doc, viewer?: Viewer | null, year = new Date().getFullYear()): boolean {
  if (!viewer) return false;
  const role = viewer.role ?? "";
  return activeReleases(member, year).some((r) => {
    if (r.audience === "club") {
      const mine = [viewer.clubId, viewer.clubSlug].filter(Boolean).map(String);
      return CLUB_STAFF_ROLES.includes(role) && mine.includes(String(r.scopeId));
    }
    if (r.audience === "association") {
      return ASSOC_ROLES.includes(role) && (r.scopeId === "*" || String(viewer.associationId ?? "") === String(r.scopeId));
    }
    return false;
  });
}

export function canSeeSensitive(member: Doc, viewer?: Viewer | null): boolean {
  if (!viewer) return false;
  if (viewer.role === "super-admin") return true;
  return isOwner(member, viewer) || hasRelease(member, viewer);
}

/** Copy of the member without sensitive groups (and the legacy single emergency contact) unless the viewer may see them. */
export function redactSensitive<T extends Doc>(member: T, viewer?: Viewer | null): T {
  if (!member || canSeeSensitive(member, viewer)) return member;
  const out: Doc = { ...member };
  for (const k of SENSITIVE_KEYS) if (k in out) delete out[k];
  if (out.contact?.emergencyContact) out.contact = { ...out.contact, emergencyContact: undefined };
  out.sensitiveWithheld = true;
  return out as T;
}

/** Everything another person is allowed to see of this member: privacy + need-to-know. */
export function protectMember<T extends Doc>(member: T, viewer?: Viewer | null): T {
  const ids = [viewer?.memberId];
  return redactSensitive(redactPrivateContact(member, ids), viewer);
}

/**
 * Admin saves post back whatever the (redacted) form held. Restore withheld sensitive groups from the stored
 * record so a save can neither wipe nor change what the viewer wasn't allowed to see.
 */
export function preserveSensitiveFields<T extends Doc>(existing: Doc, update: T, viewer?: Viewer | null): T {
  if (canSeeSensitive(existing, viewer)) return update;
  const out: Doc = { ...update };
  for (const k of SENSITIVE_KEYS) if (k in out) out[k] = existing[k];
  if (out.contact && typeof out.contact === "object") {
    out.contact = { ...out.contact, emergencyContact: existing.contact?.emergencyContact };
  }
  if ("sharing" in out) out.sharing = existing.sharing; // releases are system-managed
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out as T;
}

export function newRelease(r: Omit<Release, "releaseId" | "grantedAt">): Release {
  return { ...r, releaseId: `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, grantedAt: new Date().toISOString() };
}

/** Add a release unless an equivalent one (same audience/scope/season/purpose) already exists. */
export async function grantRelease(
  db: { collection: (n: string) => any },
  memberId: string,
  r: Omit<Release, "releaseId" | "grantedAt">,
): Promise<void> {
  const exists = await db.collection("members").findOne({
    memberId,
    "sharing.releases": { $elemMatch: { audience: r.audience, scopeId: r.scopeId, seasonYear: r.seasonYear, purpose: r.purpose } },
  });
  if (exists) return;
  await db.collection("members").updateOne({ memberId }, { $push: { "sharing.releases": newRelease(r) } });
}

export { isContactPrivate };
