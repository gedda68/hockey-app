// Pure helpers for the National → State → City/Region → Club cascade.
// The tree is built only from `parentAssociationId` links (never from a stored `level`),
// so it matches whatever is in the `associations` and `clubs` collections.

export interface HAssociation { associationId: string; name: string; code?: string; parentAssociationId?: string | null }
export interface HClub { id: string; name: string; shortName?: string; parentAssociationId?: string | null }

const none = (v?: string | null) => !v || !String(v).trim();
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);

/** Top level: associations with no parent. */
export const nationalAssociations = (all: HAssociation[]) =>
  all.filter((a) => none(a.parentAssociationId)).sort(byName);

export const childAssociations = (all: HAssociation[], parentId: string) =>
  parentId ? all.filter((a) => a.parentAssociationId === parentId).sort(byName) : [];

export const clubsUnder = (clubs: HClub[], parentId: string) =>
  parentId ? clubs.filter((c) => c.parentAssociationId === parentId).sort(byName) : [];

export interface Selection { national: string; state: string; city: string; club: string }

/** Works out every level above a club (used to prefill an existing member's club). */
export function selectionForClub(all: HAssociation[], clubs: HClub[], clubId: string): Selection {
  const empty: Selection = { national: "", state: "", city: "", club: "" };
  const club = clubs.find((c) => c.id === clubId);
  if (!club) return empty;
  // Walk up from the club's association to the root (guarding against loops).
  const chain: HAssociation[] = [];
  let cur = all.find((a) => a.associationId === club.parentAssociationId);
  while (cur && chain.length < 10 && !chain.includes(cur)) {
    chain.unshift(cur);
    cur = none(cur.parentAssociationId) ? undefined : all.find((a) => a.associationId === cur!.parentAssociationId);
  }
  // chain = [national, state, city] (shorter when the club hangs off a higher level)
  if (chain.length >= 3) return { national: chain[0].associationId, state: chain[1].associationId, city: chain[2].associationId, club: clubId };
  if (chain.length === 2) return { national: chain[0].associationId, state: chain[1].associationId, city: "", club: clubId };
  if (chain.length === 1) return { national: chain[0].associationId, state: "", city: "", club: clubId };
  return { ...empty, club: clubId };
}
