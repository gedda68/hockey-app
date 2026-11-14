// Finds duplicate registrations: the same member, same club (or association) and same season more than
// once, whatever their registrationId or source. One is kept, the rest can be removed.

type Doc = Record<string, any>;

export const seasonOf = (d: Doc) => String(Number(d.seasonYear) || d.seasonYear || "");

export const naturalKey = (d: Doc, kind: "club" | "association") =>
  `${d.memberId}|${kind === "club" ? d.clubId : d.associationId}|${seasonOf(d)}`;

const ts = (v: unknown) => { const t = new Date(String(v ?? "")).getTime(); return Number.isFinite(t) ? t : 0; };

/** Higher is better: real (non-backfill) records, active, with fees, most recently updated. */
export function keeperScore(d: Doc): number {
  return (
    (d.source && d.source !== "backfill" ? 1000 : 0) +
    (String(d.status).toLowerCase() === "active" ? 100 : 0) +
    (Array.isArray(d.fees) && d.fees.length ? 10 : 0) +
    (Array.isArray(d.feeChanges) && d.feeChanges.length ? 500 : 0) + // never discard a record admins have edited
    ts(d.updatedAt ?? d.createdAt) / 1e13
  );
}

/**
 * The record we keep may lack what a duplicate has (e.g. an imported registration with no fees next to a
 * priced backfilled one). Fold that in so removing the duplicate loses nothing.
 */
export function mergeFields(keeper: Doc, dupes: Doc[]): Doc {
  const set: Doc = {};
  const hasFees = Array.isArray(keeper.fees) && keeper.fees.length > 0;
  if (!hasFees) {
    const donor = dupes.find((d) => Array.isArray(d.fees) && d.fees.length > 0);
    if (donor) {
      for (const k of ["fees", "totalFee", "registrationCategory", "currency"]) if (donor[k] !== undefined) set[k] = donor[k];
      if (donor.feeChanges) set.feeChanges = donor.feeChanges;
    }
  }
  const roles = [...new Set([...(keeper.roleIds ?? []), ...dupes.flatMap((d) => d.roleIds ?? [])])];
  if (roles.length !== (keeper.roleIds ?? []).length) set.roleIds = roles;
  return set;
}

export function planDedupe(docs: Doc[], kind: "club" | "association") {
  const groups = new Map<string, Doc[]>();
  for (const d of docs) groups.set(naturalKey(d, kind), [...(groups.get(naturalKey(d, kind)) ?? []), d]);
  const remove: Doc[] = [];
  const updates: { _id: unknown; set: Doc }[] = [];
  let groupsWithDupes = 0;
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    groupsWithDupes++;
    const sorted = [...g].sort((a, b) => keeperScore(b) - keeperScore(a));
    const [keeper, ...rest] = sorted;
    remove.push(...rest);
    const set = mergeFields(keeper, rest);
    if (Object.keys(set).length) updates.push({ _id: keeper._id, set });
  }
  return { groupsWithDupes, remove, updates };
}
