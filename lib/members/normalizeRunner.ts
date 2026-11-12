/**
 * Renames member ids (`MBR-ALT-<n>` -> `MBR_<n>`) everywhere they are used and moves
 * members off the vendor-named `altius` field. Takes a minimal DB interface so it can be
 * tested against an in-memory fake; the CLI passes the real MongoDB `Db`.
 */
import type { Doc } from "./dedupe";
import { LEFT_AS_IS, type DbLike } from "./dedupeRunner";
import {
  LEGACY_ID_TOKEN,
  findSourceMentions,
  modernizeMember,
  newMemberId,
  rewriteLegacyIdStrings,
  syncClubFields,
} from "./modernize";

export interface NormalizeOptions {
  apply: boolean;
  writeBackup?: (backup: Record<string, Doc[]>) => void | Promise<void>;
}

export interface NormalizeResult {
  /** memberId renames that will happen (or happened). */
  renames: { from: string; to: string }[];
  /** Renames that were skipped because the new id already belongs to another member. */
  collisions: { from: string; to: string }[];
  /** Documents changed per collection. */
  changedDocs: Record<string, number>;
  /** History/audit collections that mention old ids and were left as recorded. */
  historyOnly: Record<string, number>;
  /** Places that still mention the old system after the change (needs a human). */
  remainingMentions: Record<string, number>;
  changed: number;
}

const needsWork = (doc: Doc, isMember: boolean): boolean =>
  JSON.stringify(doc).match(LEGACY_ID_TOKEN) !== null || (isMember && "altius" in doc);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export async function runNormalize(db: DbLike, opts: NormalizeOptions): Promise<NormalizeResult> {
  const result: NormalizeResult = {
    renames: [], collisions: [], changedDocs: {}, historyOnly: {}, remainingMentions: {}, changed: 0,
  };

  const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const existingIds = new Set<string>();
  for await (const m of db.collection("members").find({})) {
    if (typeof m.memberId === "string") existingIds.add(m.memberId);
  }

  const clubNameById = new Map<string, string>();
  for await (const c of db.collection("clubs").find({})) {
    const id = String(c.id ?? c.clubId ?? "");
    if (id && typeof c.name === "string") clubNameById.set(id, c.name);
  }

  const pending: { collection: string; original: Doc; next: Doc }[] = [];
  const blocked = new Set<string>();

  for (const name of names) {
    if (name.startsWith("system.")) continue;
    const isMember = name === "members";
    for await (const doc of db.collection(name).find({})) {
      const clubSynced = isMember ? syncClubFields(doc, clubNameById) : doc;
      if (!needsWork(doc, isMember) && same(clubSynced, doc)) continue;
      if (LEFT_AS_IS.test(name)) {
        result.historyOnly[name] = (result.historyOnly[name] ?? 0) + 1;
        continue;
      }
      const next = isMember
        ? syncClubFields(modernizeMember(doc), clubNameById)
        : (rewriteLegacyIdStrings(doc).value as Doc);
      if (isMember && typeof doc.memberId === "string" && next.memberId !== doc.memberId) {
        const to = next.memberId as string;
        if (existingIds.has(to)) {
          result.collisions.push({ from: doc.memberId, to });
          blocked.add(doc.memberId);
          continue; // leave this member (and its id) untouched
        }
        result.renames.push({ from: doc.memberId, to });
      }
      pending.push({ collection: name, original: doc, next });
    }
  }

  // A blocked member keeps its old id, so references to it must keep it too.
  const blockedIds = [...blocked];
  const safe = pending.filter((p) => {
    if (blockedIds.length === 0 || p.collection === "members") return true;
    const text = JSON.stringify(p.original);
    return !blockedIds.some((id) => text.includes(id));
  });

  for (const p of safe) {
    result.changedDocs[p.collection] = (result.changedDocs[p.collection] ?? 0) + 1;
    for (const path of findSourceMentions(p.next)) {
      const k = `${p.collection}:${path.replace(/\[\d+\]/g, "[]")}`;
      result.remainingMentions[k] = (result.remainingMentions[k] ?? 0) + 1;
    }
  }
  result.changed = safe.length;
  if (!opts.apply || safe.length === 0) return result;

  // Backup first. If this throws, nothing has been written.
  const backup: Record<string, Doc[]> = {};
  for (const p of safe) (backup[p.collection] ??= []).push(p.original);
  await opts.writeBackup?.(backup);

  for (const p of safe) {
    await db.collection(p.collection).replaceOne({ _id: p.original._id }, p.next);
  }
  return result;
}

export { newMemberId };
