/**
 * Brings members imported from the previous system into the app's own shape (pure).
 *
 *  - ids: `MBR-ALT-<n>` -> `MBR_<n>`; registration ids lose their `-ALT-` marker
 *  - the vendor-named `altius` field is removed; what it held moves to proper fields:
 *      playerInfo.appearances, previousMemberIds, officiating{roles,matchOfficialIds},
 *      staffInfo{teams}; anything unrecognised is kept under `importedData`
 *  - import-source wording in notes / createdBy / updatedBy is neutralised
 *
 * A member can hold several roles: `roles` stays one array and is combined on merge.
 */
import type { Doc } from "./dedupe";

// Plain objects only: class instances (ObjectId, Date, Decimal128…) must pass through untouched.
const isPlain = (v: unknown): v is Doc => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Tokens that identify the old id scheme, with their replacements. */
const TOKEN_REPLACEMENTS: [RegExp, string][] = [
  [/MBR-ALT-/g, "MBR_"],
  [/AREG-ALT-/g, "AREG-"],
  [/CREG-ALT-/g, "CREG-"],
];

export const LEGACY_ID_TOKEN = /MBR-ALT-|AREG-ALT-|CREG-ALT-/;

export const newMemberId = (id: string): string => id.replace(/^MBR-ALT-/, "MBR_");

export function rewriteLegacyString(s: string): string {
  let out = s;
  for (const [re, to] of TOKEN_REPLACEMENTS) out = out.replace(re, to);
  return out;
}

/** Deep-replaces the legacy id tokens inside every string (never touches `_id`). */
export function rewriteLegacyIdStrings(value: unknown): { value: unknown; replaced: number } {
  let replaced = 0;
  const walk = (v: unknown, key?: string): unknown => {
    if (key === "_id") return v;
    if (typeof v === "string") {
      if (!LEGACY_ID_TOKEN.test(v)) return v;
      replaced++;
      return rewriteLegacyString(v);
    }
    if (Array.isArray(v)) return v.map((x) => walk(x));
    if (isPlain(v)) {
      const out: Doc = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x, k);
      return out;
    }
    return v;
  };
  return { value: walk(value), replaced };
}

const SOURCE_NAME = /altius/i;

function neutraliseText(s: string): string {
  return s
    .replace(/Imported from Altius \([^)]*\)\./g, "Imported from the previous system.")
    .replace(/Imported from Altius/g, "Imported from the previous system");
}

/** Restructure only (no id changes) so merging can combine the pieces properly. */
export function modernizeMemberFields(doc: Doc): Doc {
  const out: Doc = { ...doc };
  const legacy = out.altius;
  delete out.altius;

  if (isPlain(legacy)) {
    const rest: Doc = { ...legacy };
    const take = (k: string) => {
      const v = rest[k];
      delete rest[k];
      return v;
    };

    const appearances = take("appearances");
    if (typeof appearances === "number") {
      const pi = isPlain(out.playerInfo) ? { ...out.playerInfo } : {};
      if (pi.appearances === undefined || pi.appearances === null) pi.appearances = appearances;
      out.playerInfo = pi;
    }

    const playerId = str(take("playerId"));
    const playerIds = strList(take("playerIds"));
    take("name");
    take("sourceUrls");
    const self = str(out.memberId);
    const aliases = [...new Set([playerId, ...playerIds].filter(Boolean).map((p) => `MBR_${p}`))].filter(
      (id) => id !== newMemberId(self),
    );
    if (aliases.length) {
      out.previousMemberIds = [...new Set([...strList(out.previousMemberIds), ...aliases])];
    }

    const officialRoles = strList(take("officialRoles"));
    const matchOfficialIds = strList(take("matchOfficialIds"));
    take("officialName");
    if (officialRoles.length || matchOfficialIds.length) {
      const prev = isPlain(out.officiating) ? out.officiating : {};
      out.officiating = {
        ...prev,
        roles: [...new Set([...strList(prev.roles), ...officialRoles])],
        matchOfficialIds: [...new Set([...strList(prev.matchOfficialIds), ...matchOfficialIds])],
      };
    }

    take("staffName");
    const teams = take("teams");
    if (Array.isArray(teams) && teams.length) {
      const prev = isPlain(out.staffInfo) ? out.staffInfo : {};
      out.staffInfo = { ...prev, teams: [...new Set([...strList(prev.teams), ...strList(teams)])] };
    }

    if (Object.keys(rest).length) {
      out.importedData = { ...(isPlain(out.importedData) ? out.importedData : {}), ...rest };
    }
  }

  for (const k of ["notes", "createdBy", "updatedBy"] as const) {
    const v = out[k];
    if (typeof v === "string" && SOURCE_NAME.test(v)) {
      out[k] = k === "notes" ? neutraliseText(v) : v.replace(/altius-seed/i, "import");
    }
  }
  return out;
}

/** Full normalisation of one member: fields, then id strings. */
export function modernizeMember(doc: Doc): Doc {
  const restructured = modernizeMemberFields(doc);
  return rewriteLegacyIdStrings(restructured).value as Doc;
}

/** Paths (dot notation) whose string still mentions the old system, for reporting. */
export function findSourceMentions(value: unknown, path = ""): string[] {
  const found: string[] = [];
  const walk = (v: unknown, p: string) => {
    if (typeof v === "string") {
      if (SOURCE_NAME.test(v)) found.push(p);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (isPlain(v)) {
      for (const [k, x] of Object.entries(v)) {
        if (SOURCE_NAME.test(k)) found.push(p ? `${p}.${k}` : k);
        walk(x, p ? `${p}.${k}` : k);
      }
    }
  };
  walk(value, path);
  return found;
}

/**
 * A member's club lives in ONE place conceptually (their home club), but the app reads
 * it from two: top-level `clubId` and `membership.clubId`/`membership.clubName` (the
 * members list). Keep them in step: fill whichever is missing from the other, or from
 * the primary club registration.
 */
export function syncClubFields(doc: Doc, clubNameById: ReadonlyMap<string, string>): Doc {
  const membership = isPlain(doc.membership) ? doc.membership : {};
  const regs = Array.isArray(doc.clubRegistrations) ? doc.clubRegistrations.filter(isPlain) : [];
  const primaryReg = regs.find((r) => r.registrationType === "primary") ?? regs[0];

  const clubId =
    str(doc.clubId) || str(membership.clubId) || (primaryReg ? str(primaryReg.clubId) : "");
  if (!clubId) return doc;

  const out: Doc = { ...doc };
  if (!str(out.clubId)) out.clubId = clubId;
  const m: Doc = { ...membership };
  if (!str(m.clubId)) m.clubId = clubId;
  if (!str(m.clubName)) {
    const name = clubNameById.get(clubId) || (primaryReg ? str(primaryReg.clubName) : "");
    if (name) m.clubName = name;
  }
  out.membership = m;
  return out;
}
