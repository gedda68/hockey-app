// lib/access/profileSections.ts
// Which parts of another member's profile a person may see and change, from the Roles & Access Matrix codes.
//
//   Section      Sees it with                         Changes it with
//   personal     Members V (names) / R (everything)    Members E
//   contact      Members R                             Members E
//   address      Members R                             Members E
//   membership   Members R                             Members E
//   roles        Users & Roles R, or Members E         Users & Roles E
//   emergency    Members R, or Medical V               Members E
//   medical      Medical & Injury R                    Medical & Injury E
//   healthcare   Medical & Injury A, or Members A      same
//   safeguarding Child Safety R, or Members E          Child Safety E, or Members A
//   notes        Members E                             Members E
//
// Medical, healthcare, blue card and emergency contacts are ALSO still withheld by the existing release rules
// (lib/members/sharing.ts); this layer only ever removes more, never adds.

import { codeAtLeast, type AccessCode } from "@/lib/access/matrix";

export const PROFILE_SECTIONS = [
  "personal", "contact", "address", "membership", "roles", "emergency", "medical", "healthcare", "safeguarding", "notes",
] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];
export type SectionAccess = { view: boolean; edit: boolean };
export type SectionMap = Record<ProfileSection, SectionAccess>;

export interface ProfileCodes {
  members: AccessCode;
  medical: AccessCode;
  childSafety: AccessCode;
  usersRoles: AccessCode;
}

const at = (c: AccessCode, min: AccessCode) => codeAtLeast(c, min);

export function sectionsFromCodes(c: ProfileCodes): SectionMap {
  const m = c.members, med = c.medical, cs = c.childSafety, ur = c.usersRoles;
  return {
    personal:     { view: at(m, "V"), edit: at(m, "E") },
    contact:      { view: at(m, "R"), edit: at(m, "E") },
    address:      { view: at(m, "R"), edit: at(m, "E") },
    membership:   { view: at(m, "R"), edit: at(m, "E") },
    roles:        { view: at(ur, "R") || at(m, "E"), edit: at(ur, "E") },
    emergency:    { view: at(m, "R") || at(med, "V"), edit: at(m, "E") },
    medical:      { view: at(med, "R"), edit: at(med, "E") },
    healthcare:   { view: at(med, "A") || at(m, "A"), edit: at(med, "A") || at(m, "A") },
    safeguarding: { view: at(cs, "R") || at(m, "E"), edit: at(cs, "E") || at(m, "A") },
    notes:        { view: at(m, "E"), edit: at(m, "E") },
  };
}

/** Full access (people the matrix doesn't apply to). */
export function fullSections(): SectionMap {
  return Object.fromEntries(PROFILE_SECTIONS.map((s) => [s, { view: true, edit: true }])) as SectionMap;
}

type Doc = Record<string, any>;

/** Top-level member fields (or `parent.child` paths) that belong to each section. */
const FIELDS: Record<Exclude<ProfileSection, "personal">, string[]> = {
  contact: ["contact"],
  address: ["address"],
  membership: ["membership", "memberships", "family"],
  roles: ["roles", "roleHoldings"],
  emergency: ["emergencyContacts", "contact.emergencyContact"],
  medical: ["medical"],
  healthcare: ["healthcare"],
  safeguarding: ["blueCard"],
  notes: ["notes"],
};

const NAME_KEYS = ["firstName", "lastName", "middleName", "preferredName", "displayName", "salutation"];

function unset(doc: Doc, path: string) {
  const [head, tail] = path.split(".");
  if (!tail) { delete doc[head]; return; }
  if (doc[head] && typeof doc[head] === "object") { doc[head] = { ...doc[head] }; delete doc[head][tail]; }
}

/** The member as the viewer may see it. Sections they can't view are removed; personal shrinks to names. */
export function redactBySections<T extends Doc>(member: T, sections: SectionMap): T {
  const out: Doc = { ...member };
  // "contact" must go first so removing it doesn't leave emergencyContact orphaned in the other direction.
  for (const [section, paths] of Object.entries(FIELDS) as [keyof typeof FIELDS, string[]][]) {
    if (sections[section].view) continue;
    for (const p of paths) unset(out, p);
  }
  if (!sections.personal.view) {
    delete out.personalInfo;
  } else if (member.personalInfo && !sections.contact.view && !sections.membership.view) {
    // Names only (Members V): keep names, drop dates of birth and the rest.
    out.personalInfo = Object.fromEntries(Object.entries(member.personalInfo).filter(([k]) => NAME_KEYS.includes(k)));
  }
  return out as T;
}

/**
 * Admin saves post back the form (which was built from a redacted record). Put back every section the person
 * may not change so a save can neither wipe nor alter it.
 */
export function preserveBySections<T extends Doc>(existing: Doc, update: T, sections: SectionMap): T {
  const out: Doc = { ...update };
  for (const [section, paths] of Object.entries(FIELDS) as [keyof typeof FIELDS, string[]][]) {
    if (sections[section].edit) continue;
    for (const p of paths) {
      const [head, tail] = p.split(".");
      if (!tail) { if (head in existing) out[head] = existing[head]; else delete out[head]; continue; }
      if (out[head] && typeof out[head] === "object") out[head] = { ...out[head], [tail]: existing[head]?.[tail] };
    }
  }
  if (!sections.personal.edit && "personalInfo" in out) out.personalInfo = existing.personalInfo;
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out as T;
}
