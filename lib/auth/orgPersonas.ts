// lib/auth/orgPersonas.ts — one switcher entry per organisation (not per role).
// After login a person picks the organisation to work in; the roles they hold there combine, so there is no
// separate role picker. "Personal" is the no-organisation view.

import type { PersonaOption } from "@/lib/auth/sessionPersona";

/** Most powerful first. Decides which role's session the organisation entry uses. */
const ROLE_RANK = [
  "super-admin", "association-admin", "club-admin", "assoc-committee", "club-committee",
  "assoc-registrar", "registrar", "assoc-selector", "team-selector", "assoc-coach", "coach", "manager",
  "umpire", "technical-official", "media-marketing", "volunteer", "player", "parent", "member",
];
const rank = (role: string) => { const i = ROLE_RANK.indexOf(role); return i === -1 ? ROLE_RANK.length : i; };

export interface OrgEntry {
  /** "club:ID", "association:ID", "personal" or "platform". */
  orgKey: string;
  label: string;
  /** The persona key to switch to (the person's strongest role there). */
  personaKey: string;
  roleLabels: string[];
  active: boolean;
}

const humanRole = (role: string) => role.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export function groupPersonasByOrg(personas: PersonaOption[] | undefined, activeKey: string | undefined): OrgEntry[] {
  const groups = new Map<string, PersonaOption[]>();
  for (const p of personas ?? []) {
    const k = p.orgKey ?? "personal";
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const entries: OrgEntry[] = [];
  for (const [orgKey, list] of groups) {
    const sorted = [...list].sort((a, b) => rank(a.role) - rank(b.role));
    // If the person is already acting in this organisation, stay on the persona they have.
    const current = sorted.find((p) => p.key === activeKey);
    const best = current ?? sorted[0];
    entries.push({
      orgKey,
      label: best.orgLabel ?? best.label,
      personaKey: best.key,
      roleLabels: [...new Set(sorted.map((p) => humanRole(p.role)))],
      active: !!current,
    });
  }
  // Organisations first (alphabetical), then Personal, then Platform.
  const order = (e: OrgEntry) => (e.orgKey === "platform" ? 2 : e.orgKey === "personal" ? 1 : 0);
  return entries.sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label));
}

export interface RoleChoice { key: string; label: string; active: boolean }

/** The roles the person holds in one organisation, most powerful first, so they can act as any one of them. */
export function rolesInOrg(personas: PersonaOption[] | undefined, orgKey: string, activeKey: string | undefined): RoleChoice[] {
  const seen = new Set<string>();
  return (personas ?? [])
    .filter((p) => (p.orgKey ?? "personal") === orgKey)
    .sort((a, b) => rank(a.role) - rank(b.role))
    .filter((p) => (seen.has(p.role) ? false : (seen.add(p.role), true)))
    .map((p) => ({ key: p.key, label: humanRole(p.role), active: p.key === activeKey }));
}

export interface ProfileGroup { orgKey: string; orgLabel: string; roles: RoleChoice[] }

/** Every profile the person can swap into, grouped by organisation (organisations first, then Personal, then Platform). */
export function profileGroups(personas: PersonaOption[] | undefined, activeKey: string | undefined): ProfileGroup[] {
  return groupPersonasByOrg(personas, activeKey).map((e) => ({
    orgKey: e.orgKey,
    orgLabel: e.orgKey === "personal" ? "Personal" : e.label,
    roles: rolesInOrg(personas, e.orgKey, activeKey),
  }));
}
