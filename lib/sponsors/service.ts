// lib/sponsors/service.ts — recording impressions and clicks, and loading the figures for a report.

import type { Db } from "mongodb";
import { PARTNER_STRIP_CLICK_COLLECTION, loadPartnersForPublicScope, partnerRefFromRow, utcDayString } from "@/lib/analytics/partnerStripClick";
import { buildReport, previousRange, type DailyRow, type Report } from "@/lib/sponsors/report";

type Scope = "association" | "club";

/** Adds one impression to each of the listed sponsors (by position in the scope's list) for today. Anything unknown is ignored. */
export async function recordImpressions(db: Db, o: { scopeType: Scope; scopeId: string; slots: number[]; source: "site" | "portal"; now?: Date }): Promise<number> {
  const partners = await loadPartnersForPublicScope(db, o.scopeType, o.scopeId);
  if (!partners?.length) return 0;
  const day = utcDayString(o.now ?? new Date()), at = (o.now ?? new Date()).toISOString();
  let n = 0;
  for (const slot of [...new Set(o.slots)].filter((s) => Number.isInteger(s) && s >= 0 && s < partners.length).slice(0, 24)) {
    const p = partners[slot];
    await db.collection(PARTNER_STRIP_CLICK_COLLECTION).updateOne(
      { scopeType: o.scopeType, scopeId: o.scopeId, partnerRef: partnerRefFromRow(p.name, p.url), day, source: o.source },
      { $inc: { impressions: 1 }, $set: { label: p.name.trim().slice(0, 120), updatedAt: at }, $setOnInsert: { createdAt: at } },
      { upsert: true },
    );
    n++;
  }
  return n;
}

async function rowsFor(db: Db, scopeType: Scope, scopeIds: string[], from: string, to: string): Promise<DailyRow[]> {
  const rows = await db.collection(PARTNER_STRIP_CLICK_COLLECTION).find({ scopeType, scopeId: { $in: scopeIds }, day: { $gte: from, $lte: to } }, { projection: { partnerRef: 1, label: 1, day: 1, source: 1, clicks: 1, impressions: 1 } }).limit(40000).toArray();
  return rows as unknown as DailyRow[];
}

/** The whole report for a club or association (under any of the ids it has been tracked by): this period, the one before it, and who is listed as a sponsor now. */
export async function sponsorReport(db: Db, scopeType: Scope, scopeIds: string[], range: { from: string; to: string }): Promise<Report> {
  const prev = previousRange(range.from, range.to);
  const ids = [...new Set(scopeIds.map((x) => String(x ?? "").trim()).filter(Boolean))];
  const [rows, prevRows, partners] = await Promise.all([rowsFor(db, scopeType, ids, range.from, range.to), rowsFor(db, scopeType, ids, prev.from, prev.to), loadPartnersForPublicScope(db, scopeType, ids[0] ?? "")]);
  return buildReport(rows, prevRows, range, (partners ?? []).map((p) => ({ partnerRef: partnerRefFromRow(p.name, p.url), label: p.name })));
}
