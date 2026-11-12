/**
 * Duplicate-member detection and merge logic (pure: no database access).
 *
 * A "player" is a member with the player role (the players list is a view over the
 * `members` collection), so one pass over `members` de-duplicates both.
 */

export type Doc = Record<string, unknown>;

export interface MemberLite {
  memberId: string;
  doc: Doc;
}

export interface DuplicateGroup {
  /** "auto": same name and same date of birth. "review": needs a human (see reason). */
  tier: "auto" | "review";
  reason: string;
  nameKey: string;
  dateOfBirth: string;
  memberIds: string[];
  /** When set, the record to keep must come from this list (the ones with a birthday). */
  keepFrom?: string[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function normalizeName(s: unknown): string {
  return str(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function personal(doc: Doc): Doc {
  const p = doc.personalInfo;
  return p && typeof p === "object" ? (p as Doc) : {};
}

export function nameKeyOf(doc: Doc): string {
  const p = personal(doc);
  const first = normalizeName(p.firstName);
  const last = normalizeName(p.lastName);
  return first && last ? `${first}|${last}` : "";
}

/** Normalises a date of birth to YYYY-MM-DD when it parses, else the trimmed string. */
export function dobOf(doc: Doc): string {
  const raw = str(personal(doc).dateOfBirth).trim();
  if (!raw) return "";
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toISOString().slice(0, 10);
}

export interface FindOptions {
  /** Also merge members with no date of birth into their name group (see docs). */
  allowMissingDob?: boolean;
  /**
   * For data with no birthdays (e.g. the Altius import): when a name has exactly ONE
   * ordinary member record and the rest are generated staff/official records
   * (MBR-ALT-STAFF-… / MBR-ALT-OFF-…), treat those as the same person.
   */
  mergeGeneratedShadows?: boolean;
  /**
   * Same name where some records have a date of birth and some don't: the undated
   * ones are duplicates of the dated one and are merged into it. Only when the dated
   * records all share ONE birthday; otherwise it is unclear whose record the undated
   * one is, and the group stays in review.
   */
  attachUndatedToDated?: boolean;
}

/** Ids the import generates for a person's coaching/officiating role. */
export const GENERATED_SHADOW_ID = /^MBR[-_](ALT-)?(STAFF|OFF)-/;

/**
 * Same first+last name (case/accent/punctuation-insensitive) AND same date of birth
 * are treated as one person. Same name with different birthdays are different people
 * and are never merged. Anything ambiguous is returned as a "review" group.
 */
export function findDuplicateGroups(
  members: MemberLite[],
  opts: FindOptions = {},
): DuplicateGroup[] {
  const byName = new Map<string, MemberLite[]>();
  for (const m of members) {
    const key = nameKeyOf(m.doc);
    if (!key) continue;
    byName.set(key, [...(byName.get(key) ?? []), m]);
  }

  const out: DuplicateGroup[] = [];
  for (const [nameKey, list] of byName) {
    if (list.length < 2) continue;

    if (opts.mergeGeneratedShadows) {
      const shadows = list.filter((m) => GENERATED_SHADOW_ID.test(m.memberId));
      const ordinary = list.filter((m) => !GENERATED_SHADOW_ID.test(m.memberId));
      if (shadows.length > 0 && ordinary.length === 1) {
        out.push({
          tier: "auto",
          reason: "generated staff/official record matched to the only player record with this name",
          nameKey,
          dateOfBirth: dobOf(ordinary[0].doc),
          memberIds: [ordinary[0].memberId, ...shadows.map((m) => m.memberId)],
        });
        continue;
      }
    }

    const byDob = new Map<string, MemberLite[]>();
    const undated: MemberLite[] = [];
    for (const m of list) {
      const dob = dobOf(m.doc);
      if (!dob) undated.push(m);
      else byDob.set(dob, [...(byDob.get(dob) ?? []), m]);
    }

    const dated = [...byDob.entries()];

    if (opts.attachUndatedToDated && undated.length > 0 && dated.length === 1) {
      const [dob, datedMembers] = dated[0];
      out.push({
        tier: "auto",
        reason: "same name; record(s) without a date of birth merged into the one that has it",
        nameKey,
        dateOfBirth: dob,
        memberIds: [...datedMembers, ...undated].map((m) => m.memberId),
        keepFrom: datedMembers.map((m) => m.memberId),
      });
      continue;
    }
    // Which dated subgroup do undated members attach to? Only when it is unambiguous.
    const attachTo =
      opts.allowMissingDob && undated.length > 0 && dated.length <= 1
        ? (dated[0]?.[0] ?? "")
        : null;

    if (attachTo !== null) {
      const members = [...(dated[0]?.[1] ?? []), ...undated];
      if (members.length >= 2) {
        out.push({
          tier: "auto",
          reason: dated.length
            ? "same name; members without a date of birth attached (--allow-missing-dob)"
            : "same name; none have a date of birth (--allow-missing-dob)",
          nameKey,
          dateOfBirth: attachTo,
          memberIds: members.map((m) => m.memberId),
        });
      }
      continue;
    }

    for (const [dob, g] of dated) {
      if (g.length >= 2) {
        out.push({
          tier: "auto",
          reason: "same name and date of birth",
          nameKey,
          dateOfBirth: dob,
          memberIds: g.map((m) => m.memberId),
        });
      }
    }

    if (undated.length > 0) {
      out.push({
        tier: "review",
        reason:
          dated.length > 1
            ? "same name, several birthdays, and some records have no date of birth"
            : "same name but a record has no date of birth",
        nameKey,
        dateOfBirth: "",
        memberIds: list.map((m) => m.memberId),
      });
    } else if (dated.length > 1 && dated.every(([, g]) => g.length === 1)) {
      // Same name, all different birthdays: different people. Not a duplicate.
    }
  }
  return out;
}

// ── Choosing the record to keep ────────────────────────────────────────────────

export interface SurvivorSignals {
  /** Number of references to this member id found in other collections. */
  inboundRefs: number;
  hasUserAccount: boolean;
}

export function isPlayer(doc: Doc): boolean {
  const roles = Array.isArray(doc.roles) ? doc.roles : [];
  return roles.some((r) => typeof r === "string" && /player/i.test(r));
}

export interface ScoredMember {
  memberId: string;
  score: number;
  why: string[];
}

/**
 * Highest score survives. Priority: is a player (so the kept record lines up with the
 * player), then how much else points at it, then a login account, then having a club.
 */
export function scoreMember(m: MemberLite, s: SurvivorSignals): ScoredMember {
  const why: string[] = [];
  let score = 0;
  if (isPlayer(m.doc)) {
    score += 1000;
    why.push("player role");
  }
  if (s.hasUserAccount) {
    score += 200;
    why.push("has a login");
  }
  if (s.inboundRefs > 0) {
    score += Math.min(s.inboundRefs, 99) * 5;
    why.push(`${s.inboundRefs} reference(s) from other records`);
  }
  if (str(m.doc.clubId)) {
    score += 50;
    why.push("has a club");
  }
  const status = str((m.doc.membership as Doc | undefined)?.status);
  if (status === "Active") {
    score += 10;
    why.push("active membership");
  }
  return { memberId: m.memberId, score, why };
}

export function pickSurvivor(
  members: MemberLite[],
  signals: Map<string, SurvivorSignals>,
  keepFrom?: readonly string[],
): { survivor: ScoredMember; losers: ScoredMember[] } {
  const scored = members
    .map((m) => scoreMember(m, signals.get(m.memberId) ?? { inboundRefs: 0, hasUserAccount: false }))
    // Higher score first; ties broken by id so the result is deterministic.
    .sort((a, b) => b.score - a.score || a.memberId.localeCompare(b.memberId));
  // If the survivor must come from a given set, take the best-scoring one from it.
  const survivor = (keepFrom && scored.find((m) => keepFrom.includes(m.memberId))) || scored[0];
  return { survivor, losers: scored.filter((m) => m !== survivor) };
}

// ── Merging the documents ──────────────────────────────────────────────────────

const isEmpty = (v: unknown): boolean =>
  v === null ||
  v === undefined ||
  v === "" ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v as object).length === 0);

const isPlain = (v: unknown): v is Doc => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** Arrays that describe the person and should be combined, not replaced. */
const UNION_ARRAYS = new Set([
  "roles",
  "emergencyContacts",
  "familyRelationships",
  "socialMedia",
  "renewalHistory",
  "additionalEmails",
  "previousMemberIds",
]);

function unionBy(a: unknown[], b: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of [...a, ...b]) {
    const key = typeof item === "string" ? item : JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function fillMissing(keep: Doc, other: Doc, path: string[] = []): Doc {
  const out: Doc = { ...keep };
  for (const [k, ov] of Object.entries(other)) {
    if (k === "_id" || (path.length === 0 && k === "memberId")) continue;
    const kv = out[k];
    if (UNION_ARRAYS.has(k) && (Array.isArray(kv) || Array.isArray(ov))) {
      out[k] = unionBy(Array.isArray(kv) ? kv : [], Array.isArray(ov) ? ov : []);
    } else if (isEmpty(kv)) {
      out[k] = ov;
    } else if (isPlain(kv) && isPlain(ov)) {
      out[k] = fillMissing(kv, ov, [...path, k]);
    }
  }
  return out;
}

/** Lists inside `officiating` / `staffInfo` describe the person, so combine them. */
function unionNested(merged: Doc, docs: Doc[]): Doc {
  const out: Doc = { ...merged };
  const groups: Record<string, string[]> = {
    officiating: ["roles", "matchOfficialIds"],
    staffInfo: ["teams"],
  };
  for (const [group, keys] of Object.entries(groups)) {
    const parts = docs.map((d) => d[group]).filter(isPlain);
    if (!parts.length) continue;
    const base: Doc = isPlain(out[group]) ? { ...(out[group] as Doc) } : {};
    for (const k of keys) {
      const all = parts.flatMap((p) => (Array.isArray(p[k]) ? (p[k] as unknown[]) : []));
      if (all.length) base[k] = unionBy([], all);
    }
    out[group] = base;
  }
  return out;
}

/**
 * Keeps the survivor's values; fills anything the survivor lacks from the others (in
 * the order given); combines roles and other person-describing lists; records which
 * ids were merged in. The survivor keeps its own `_id` and `memberId`.
 */
export function mergeMemberDocs(survivor: Doc, losers: Doc[], now: string): Doc {
  let merged: Doc = { ...survivor };
  for (const l of losers) merged = fillMissing(merged, l);

  merged = unionNested(merged, [survivor, ...losers]);

  const previous = Array.isArray(survivor.mergedFromMemberIds)
    ? (survivor.mergedFromMemberIds as string[])
    : [];
  merged.mergedFromMemberIds = unionBy(
    previous,
    losers.map((l) => str(l.memberId)).filter(Boolean),
  );
  merged.mergedAt = now;
  merged.updatedAt = now;
  return merged;
}

// ── Re-pointing references ─────────────────────────────────────────────────────

export interface RewriteResult {
  value: unknown;
  /** Number of string values that were replaced. */
  replaced: number;
}

/**
 * Walks any value and replaces strings that exactly equal a key of `idMap`. After a
 * replacement, arrays that now hold the same id twice are collapsed (primitives) or,
 * for arrays of objects, entries with the same memberId/playerId are merged into the
 * first one, so a roster that listed both duplicates ends up with one entry.
 * Never touches `_id`.
 */
export function rewriteIds(value: unknown, idMap: ReadonlyMap<string, string>): RewriteResult {
  let replaced = 0;

  const walk = (v: unknown, key?: string): unknown => {
    if (key === "_id") return v;
    if (typeof v === "string") {
      const to = idMap.get(v);
      if (to !== undefined) {
        replaced++;
        return to;
      }
      return v;
    }
    if (Array.isArray(v)) {
      const before = replaced;
      const mapped = v.map((x) => walk(x));
      return replaced === before ? mapped : collapseArray(mapped);
    }
    if (isPlain(v)) {
      const out: Doc = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x, k);
      return out;
    }
    return v;
  };

  return { value: walk(value), replaced };
}

function collapseArray(arr: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of arr) {
    let key: string | null = null;
    if (typeof item === "string") key = `s:${item}`;
    else if (isPlain(item)) {
      const id = str(item.memberId) || str(item.playerId);
      if (id) key = `o:${id}`;
    }
    if (key === null) {
      out.push(item);
    } else if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    } else if (isPlain(item)) {
      const idx = out.findIndex(
        (o) => isPlain(o) && (str(o.memberId) || str(o.playerId)) === (str(item.memberId) || str(item.playerId)),
      );
      if (idx >= 0) out[idx] = fillMissing(out[idx] as Doc, item);
    }
  }
  return out;
}

/** True if `value` contains the string anywhere (exact match on a string value). */
export function containsId(value: unknown, ids: ReadonlySet<string>, key?: string): number {
  if (key === "_id") return 0;
  if (typeof value === "string") return ids.has(value) ? 1 : 0;
  if (Array.isArray(value)) return value.reduce<number>((n, x) => n + containsId(x, ids), 0);
  if (isPlain(value)) {
    return Object.entries(value).reduce((n, [k, x]) => n + containsId(x, ids, k), 0);
  }
  return 0;
}

/** Adds, for every id in `ids` that appears as an exact string value, how many times. */
export function collectIds(
  value: unknown,
  ids: ReadonlySet<string>,
  into: Map<string, number>,
  key?: string,
): void {
  if (key === "_id") return;
  if (typeof value === "string") {
    if (ids.has(value)) into.set(value, (into.get(value) ?? 0) + 1);
  } else if (Array.isArray(value)) {
    for (const x of value) collectIds(x, ids, into);
  } else if (isPlain(value)) {
    for (const [k, x] of Object.entries(value)) collectIds(x, ids, into, k);
  }
}
