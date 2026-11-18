// lib/fees/registrationDiscount.ts
// Family discount at registration: when a junior registers at a club whose rules give family discounts, and a brother or
// sister (anyone sharing a parent or guardian) already has a club fee for the same season, the junior's club fee gets
// the 2nd (or 3rd-and-later) family member percentage taken off. The first to register pays in full.

import type { Db } from "mongodb";
import { childrenOf, guardianIdsFor, isMinor } from "@/lib/access/guardians";
import type { FamilyRules } from "@/lib/fees/familyDiscount";
import { loadSettings } from "@/lib/fees/service";

export interface RegItem { itemId: string; type: string; amount: number; gstIncluded?: boolean; [k: string]: unknown }

/** Percent and cents off for someone who is the `siblingsAlready + 1`th family member to register. Pure. */
export function registrationDiscount(siblingsAlready: number, clubFeeCents: number, rules: FamilyRules): { rank: number; percent: number; discountCents: number } | null {
  if (!rules.enabled || siblingsAlready < 1 || clubFeeCents <= 0) return null;
  const rank = siblingsAlready + 1;
  const percent = rank === 2 ? rules.secondPercent : rules.thirdPlusPercent;
  const discountCents = Math.min(clubFeeCents, Math.round((clubFeeCents * percent) / 100));
  return discountCents > 0 ? { rank, percent, discountCents } : null;
}

const ordinal = (n: number) => (n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
const clubFeeCentsOf = (items: RegItem[]) => items.filter((l) => l.type === "club" && Number(l.amount) > 0).reduce((s, l) => s + Math.round(Number(l.amount) * 100), 0);

/** How many of this person's brothers and sisters already have a club fee at this club for this season (paid or waiting). */
async function siblingsWithFee(db: Db, memberId: string, guardianIds: string[], clubId: string, seasonYear: string): Promise<number> {
  const sib = new Set<string>();
  for (const g of guardianIds) for (const k of await childrenOf(db, g).catch(() => [])) sib.add(String(k.memberId));
  sib.delete(memberId);
  if (!sib.size) return 0;
  const pays = await db.collection("payments").find({ memberId: { $in: [...sib] }, clubId, seasonYear, status: { $in: ["pending", "paid"] } }, { projection: { memberId: 1, lineItems: 1 } }).limit(200).toArray();
  const has = new Set<string>();
  for (const p of pays) if (clubFeeCentsOf((p.lineItems ?? []) as RegItem[]) > 0) has.add(String(p.memberId));
  return has.size;
}

/**
 * The registration's fee lines with a family discount line added, when one applies. Returns the lines unchanged when it
 * doesn't (discounts off, not a junior, no recorded guardian, no sibling registered yet, or already discounted).
 */
export async function withFamilyDiscount<T extends RegItem>(db: Db, o: { memberId?: string; clubId: string; seasonYear: string; items: T[] }): Promise<{ items: (T | RegItem)[]; discount: { rank: number; percent: number; discountCents: number } | null }> {
  const none = { items: o.items, discount: null };
  if (!o.memberId || o.items.some((l) => l.itemId === "family-discount")) return none;
  const { family } = await loadSettings(db, o.clubId);
  if (!family.enabled) return none;
  const member = await db.collection("members").findOne({ memberId: o.memberId }, { projection: { memberId: 1, personalInfo: 1, family: 1 } });
  if (!member || !isMinor(member.personalInfo?.dateOfBirth)) return none;
  const guardians = await guardianIdsFor(db, member).catch(() => [] as string[]);
  if (!guardians.length) return none;
  const d = registrationDiscount(await siblingsWithFee(db, o.memberId, guardians, o.clubId, o.seasonYear), clubFeeCentsOf(o.items), family);
  if (!d) return none;
  const clubItems = o.items.filter((l) => l.type === "club");
  const line: RegItem = { itemId: "family-discount", feeId: "family-discount", type: "club", clubId: o.clubId, name: `Family discount (${ordinal(d.rank)} family member, ${d.percent}%)`, description: "Taken off your club fee because a brother or sister is also registered", amount: -d.discountCents / 100, gstIncluded: clubItems.length > 0 && clubItems.every((l) => l.gstIncluded), discount: true };
  return { items: [...o.items, line], discount: d };
}
