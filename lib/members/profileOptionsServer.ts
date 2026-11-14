// Loads the My Details pick-lists from wherever this install keeps them.

import type { Db } from "mongodb";
import {
  DEFAULT_GENDER_ROWS, DEFAULT_RELATIONSHIPS, DEFAULT_SALUTATION_ROWS, mergeOptions, namesToOptions, type PickOption,
} from "@/lib/members/profileOptions";
import { RELATIONSHIP_COLLECTIONS, normaliseRelationship } from "@/lib/members/relationshipLookup";

type Row = { id?: unknown; name?: unknown; aliases?: unknown[] };

const active = (d: Record<string, any>) => d.isActive !== false && d.active !== false;

/** Rows from the shared `config` collection plus an optional legacy collection. Ids double as aliases. */
async function configRows(db: Db, configType: string, legacy?: { collection: string; idField: string }): Promise<Row[]> {
  const out: Row[] = [];
  const add = (d: Record<string, any>, idField?: string) => {
    if (!active(d) || !String(d.name ?? "").trim()) return;
    const id = String(d.id ?? (idField ? d[idField] : "") ?? "").trim();
    out.push({ id: id || String(d._id), name: d.name, aliases: [String(d._id), d.id, idField ? d[idField] : undefined] });
  };
  const cfg = await db.collection("config").find({ configType }).sort({ displayOrder: 1, name: 1 }).limit(200).toArray();
  cfg.forEach((d) => add(d));
  if (legacy) {
    const old = await db.collection(legacy.collection).find({}).sort({ displayOrder: 1, name: 1 }).limit(200).toArray();
    old.forEach((d) => add(d, legacy.idField));
  }
  return out;
}

async function relationshipRows(db: Db): Promise<Row[]> {
  for (const name of RELATIONSHIP_COLLECTIONS) {
    const docs = await db.collection(name).find({}).limit(500).toArray();
    const items: { d: Record<string, any>; n: NonNullable<ReturnType<typeof normaliseRelationship>> }[] = [];
    for (const d of docs) {
      const n = normaliseRelationship(d);
      if (n && n.isActive) items.push({ d, n });
    }
    if (items.length) {
      items.sort((a, b) => (a.n.displayOrder ?? 999) - (b.n.displayOrder ?? 999) || a.n.name.localeCompare(b.n.name));
      return items.map(({ d, n }) => ({ id: n.id, name: n.name, aliases: [String(d._id), d.id, d.typeId, d.relationshipTypeId] }));
    }
  }
  return configRows(db, "relationship-type");
}

export async function loadPickLists(db: Db): Promise<{ salutations: PickOption[]; genders: PickOption[]; relationships: PickOption[] }> {
  const safe = async (f: () => Promise<Row[]>): Promise<Row[]> => { try { return await f(); } catch { return []; } };
  const [sal, gen, rel] = await Promise.all([
    safe(() => configRows(db, "salutation", { collection: "config_salutations", idField: "salutationId" })),
    safe(() => configRows(db, "gender")),
    safe(() => relationshipRows(db)),
  ]);
  const rels = mergeOptions(rel, DEFAULT_RELATIONSHIPS);
  return {
    // Defaults carry the historic ids, so stored "sal-mr" resolves even when the DB list is empty or uses other ids.
    salutations: mergeOptions([...sal, ...DEFAULT_SALUTATION_ROWS], []),
    genders: mergeOptions([...gen, ...DEFAULT_GENDER_ROWS], []),
    relationships: rels.length ? rels : namesToOptions(DEFAULT_RELATIONSHIPS),
  };
}
