/**
 * Applies the member de-duplication to a database. Takes a minimal DB interface so it
 * can be tested against an in-memory fake; the CLI passes the real MongoDB `Db`.
 */
import { modernizeMemberFields } from "./modernize";
import {
  collectIds,
  findDuplicateGroups,
  mergeMemberDocs,
  pickSurvivor,
  rewriteIds,
  type Doc,
  type DuplicateGroup,
  type MemberLite,
  type SurvivorSignals,
} from "./dedupe";

export interface CollectionLike {
  find(filter: Doc): { toArray(): Promise<Doc[]> } & AsyncIterable<Doc>;
  findOne(filter: Doc): Promise<Doc | null>;
  replaceOne(filter: Doc, doc: Doc): Promise<unknown>;
  insertOne(doc: Doc): Promise<unknown>;
  deleteOne(filter: Doc): Promise<unknown>;
}
export interface DbLike {
  listCollections(): { toArray(): Promise<{ name: string }[]> };
  collection(name: string): CollectionLike;
}

/** History/audit data records what happened at the time, so it keeps the old ids. */
export const LEFT_AS_IS =
  /(^|_)(audit|logs?|change_logs?)(_|$)|^stripe_events$|^reminder_log$|^members_merged_backup$|^member_merge_log$/i;

const USERS = "users";

export interface Plan {
  group: DuplicateGroup;
  survivorId: string;
  survivorWhy: string[];
  loserIds: string[];
  referenceCounts: Record<string, number>;
  /** Club and roles of each record, so the plan can be checked at a glance. */
  details: Record<string, { clubId: string; roles: string[] }>;
  blocked?: string;
}

export interface RunOptions {
  apply: boolean;
  allowMissingDob?: boolean;
  mergeGeneratedShadows?: boolean;
  attachUndatedToDated?: boolean;
  mergeSameName?: boolean;
  /** nameKeys (e.g. "hugh|abrahams") an administrator has confirmed are the same person: promoted from review to merge. */
  confirmedNameKeys?: Iterable<string>;
  now?: string;
  /** Called with a full backup of everything that will change, BEFORE the first write. */
  writeBackup?: (backup: Record<string, Doc[]>) => void | Promise<void>;
}

export interface RunResult {
  plans: Plan[];
  review: DuplicateGroup[];
  historyOnly: Record<string, number>;
  merged: number;
  referencesRewritten: number;
}

interface Hit {
  collection: string;
  _id: unknown;
}

export async function runDedupe(db: DbLike, opts: RunOptions): Promise<RunResult> {
  const now = opts.now ?? new Date().toISOString();

  const memberDocs = await db.collection("members").find({}).toArray();
  const members: MemberLite[] = memberDocs
    .filter((d) => typeof d.memberId === "string" && d.memberId)
    .map((d) => ({ memberId: d.memberId as string, doc: d }));
  const byId = new Map(members.map((m) => [m.memberId, m.doc]));

  const groups = findDuplicateGroups(members, {
    allowMissingDob: opts.allowMissingDob,
    mergeGeneratedShadows: opts.mergeGeneratedShadows,
    attachUndatedToDated: opts.attachUndatedToDated,
    mergeSameName: opts.mergeSameName,
  });
  const confirmed = new Set([...(opts.confirmedNameKeys ?? [])].map((k) => k.trim().toLowerCase()));
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.tier === "review" && confirmed.has(g.nameKey.toLowerCase())) {
      groups[i] = { ...g, tier: "auto", reason: `confirmed by an administrator as the same person (was: ${g.reason})` };
    }
  }
  const auto = groups.filter((g) => g.tier === "auto");
  const review = groups.filter((g) => g.tier === "review");
  const candidateIds = new Set(groups.flatMap((g) => g.memberIds));

  const refCounts = new Map<string, number>();
  const hits = new Map<string, Hit[]>();
  const userAccounts = new Set<string>();
  const historyOnly: Record<string, number> = {};

  if (candidateIds.size > 0) {
    const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
    for (const name of names) {
      if (name === "members" || name.startsWith("system.")) continue;
      for await (const doc of db.collection(name).find({})) {
        const found = new Map<string, number>();
        collectIds(doc, candidateIds, found);
        if (found.size === 0) continue;
        if (LEFT_AS_IS.test(name)) {
          historyOnly[name] = (historyOnly[name] ?? 0) + 1;
          continue;
        }
        for (const [id, n] of found) {
          refCounts.set(id, (refCounts.get(id) ?? 0) + n);
          const list = hits.get(id) ?? [];
          list.push({ collection: name, _id: doc._id });
          hits.set(id, list);
          if (name === USERS && doc.memberId === id) userAccounts.add(id);
        }
      }
    }
  }

  const plans: Plan[] = auto.map((group) => {
    const lite = group.memberIds.map((id) => ({ memberId: id, doc: byId.get(id)! }));
    const signals = new Map<string, SurvivorSignals>(
      group.memberIds.map((id) => [
        id,
        { inboundRefs: refCounts.get(id) ?? 0, hasUserAccount: userAccounts.has(id) },
      ]),
    );
    const { survivor, losers } = pickSurvivor(lite, signals, group.keepFrom);
    const logins = group.memberIds.filter((id) => userAccounts.has(id));
    return {
      group,
      survivorId: survivor.memberId,
      survivorWhy: survivor.why,
      loserIds: losers.map((l) => l.memberId),
      referenceCounts: Object.fromEntries(group.memberIds.map((id) => [id, refCounts.get(id) ?? 0])),
      details: Object.fromEntries(
        group.memberIds.map((id) => {
          const d = byId.get(id)!;
          return [id, { clubId: typeof d.clubId === "string" ? d.clubId : "", roles: Array.isArray(d.roles) ? (d.roles as string[]) : [] }];
        }),
      ),
      blocked:
        logins.length > 1
          ? `${logins.length} of these records have their own login (${logins.join(", ")}); merge by hand so no account is lost`
          : undefined,
    };
  });

  const result: RunResult = { plans, review, historyOnly, merged: 0, referencesRewritten: 0 };
  if (!opts.apply) return result;

  const runnable = plans.filter((p) => !p.blocked);

  // Backup first. If this throws, nothing has been written.
  const backup: Record<string, Doc[]> = { members: [] };
  for (const p of runnable) {
    for (const id of [p.survivorId, ...p.loserIds]) backup.members.push(byId.get(id)!);
    for (const id of p.loserIds) {
      for (const h of hits.get(id) ?? []) {
        const doc = await db.collection(h.collection).findOne({ _id: h._id });
        if (doc) (backup[h.collection] ??= []).push(doc);
      }
    }
  }
  await opts.writeBackup?.(backup);

  for (const p of runnable) {
    const idMap = new Map(p.loserIds.map((id) => [id, p.survivorId] as const));

    // Re-point references everywhere first, so nothing is left dangling.
    const done = new Set<string>();
    for (const id of p.loserIds) {
      for (const h of hits.get(id) ?? []) {
        const key = `${h.collection}:${String(h._id)}`;
        if (done.has(key)) continue;
        done.add(key);
        const col = db.collection(h.collection);
        const doc = await col.findOne({ _id: h._id });
        if (!doc) continue;
        const { value, replaced } = rewriteIds(doc, idMap);
        if (replaced > 0) {
          await col.replaceOne({ _id: h._id }, value as Doc);
          result.referencesRewritten += replaced;
        }
      }
    }

    const survivorDoc = byId.get(p.survivorId)!;
    // Move any vendor-named import fields into proper fields first, so nothing in them is lost.
    const merged = mergeMemberDocs(
      modernizeMemberFields(survivorDoc),
      p.loserIds.map((id) => modernizeMemberFields(byId.get(id)!)),
      now,
    );
    await db.collection("members").replaceOne({ _id: survivorDoc._id }, merged);

    // Archive, then remove, the extras (last, so a crash never loses a record).
    for (const id of p.loserIds) {
      const loser = byId.get(id)!;
      await db.collection("members_merged_backup").insertOne({ ...loser, mergedInto: p.survivorId, mergedAt: now });
      await db.collection("members").deleteOne({ _id: loser._id });
    }
    await db.collection("member_merge_log").insertOne({
      survivorId: p.survivorId,
      removedIds: p.loserIds,
      reason: p.group.reason,
      at: now,
    });
    result.merged++;
  }
  return result;
}
