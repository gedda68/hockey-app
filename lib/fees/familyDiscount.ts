// lib/fees/familyDiscount.ts
// Family discounts: the first child pays in full, the second and later get a percentage off their club fee. Pure.

export interface FamilyRules { enabled: boolean; secondPercent: number; thirdPlusPercent: number }
export const DEFAULT_RULES: FamilyRules = { enabled: false, secondPercent: 10, thirdPlusPercent: 20 };

export interface Eligible { memberId: string; paymentId: string; clubFeeCents: number }
export interface Discount { memberId: string; paymentId: string; rank: number; percent: number; discountCents: number }

export function cleanRules(raw: unknown): FamilyRules {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pct = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n * 10) / 10)) : d; };
  return { enabled: r.enabled === true, secondPercent: pct(r.secondPercent, DEFAULT_RULES.secondPercent), thirdPlusPercent: pct(r.thirdPlusPercent, DEFAULT_RULES.thirdPlusPercent) };
}

/**
 * Groups people into families (anyone sharing a parent or guardian is one family) from child → guardians links.
 * Returns each family's members; people with no guardians are not part of any family.
 */
export function groupFamilies(links: { memberId: string; guardianIds: string[] }[]): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(x, r); return r; };
  const add = (x: string) => { if (!parent.has(x)) parent.set(x, x); };
  const union = (a: string, b: string) => { add(a); add(b); parent.set(find(a), find(b)); };
  const kids = new Set<string>();
  for (const l of links) { if (!l.guardianIds.length) continue; kids.add(l.memberId); for (const g of l.guardianIds) union(`c:${l.memberId}`, `g:${g}`); }
  const fam = new Map<string, string[]>();
  for (const k of kids) { const root = find(`c:${k}`); fam.set(root, [...(fam.get(root) ?? []), k]); }
  return [...fam.values()].map((m) => m.sort());
}

/**
 * The discounts for each family. Within a family the member with the biggest club fee pays in full, the next gets
 * `secondPercent` off, everyone after `thirdPlusPercent`. Each person's discount lands on their largest eligible payment.
 */
export function planFamilyDiscounts(families: string[][], eligible: Eligible[], rules: FamilyRules): Discount[] {
  if (!rules.enabled) return [];
  const byMember = new Map<string, Eligible[]>();
  for (const e of eligible) if (e.clubFeeCents > 0) byMember.set(e.memberId, [...(byMember.get(e.memberId) ?? []), e]);
  const out: Discount[] = [];
  for (const fam of families) {
    const members = fam.filter((m) => byMember.has(m)).map((m) => ({ m, total: byMember.get(m)!.reduce((s, e) => s + e.clubFeeCents, 0) }))
      .sort((a, b) => b.total - a.total || a.m.localeCompare(b.m));
    members.forEach(({ m }, i) => {
      if (i === 0) return;
      const percent = i === 1 ? rules.secondPercent : rules.thirdPlusPercent;
      const biggest = [...byMember.get(m)!].sort((a, b) => b.clubFeeCents - a.clubFeeCents || a.paymentId.localeCompare(b.paymentId))[0];
      const discountCents = Math.round((byMember.get(m)!.reduce((s, e) => s + e.clubFeeCents, 0) * percent) / 100);
      if (discountCents > 0) out.push({ memberId: m, paymentId: biggest.paymentId, rank: i + 1, percent, discountCents });
    });
  }
  return out;
}
