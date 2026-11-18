// A small writable in-memory stand-in for the MongoDB Db API, for service tests.
export type Doc = Record<string, any>;
const eq = (a: any, b: any) => (b === null ? a === null || a === undefined : a === b);
const pathGet = (d: Doc, k: string) => k.split(".").reduce((o: any, p) => (Array.isArray(o) ? o.flatMap((x) => x?.[p]) : o?.[p]), d);
export function matches(d: Doc, q: Doc): boolean {
  return Object.entries(q).every(([k, v]) => {
    if (k === "$or") return (v as Doc[]).some((x) => matches(d, x));
    if (k === "$and") return (v as Doc[]).every((x) => matches(d, x));
    const val = pathGet(d, k);
    if (v && typeof v === "object" && !(v instanceof Date) && !(v instanceof RegExp)) {
      return Object.entries(v).every(([op, arg]: [string, any]) => {
        switch (op) {
          case "$in": return arg.some((x: any) => (Array.isArray(val) ? val.includes(x) : eq(val, x)));
          case "$nin": return !arg.some((x: any) => (Array.isArray(val) ? val.includes(x) : eq(val, x)));
          case "$ne": return Array.isArray(val) ? !val.includes(arg) : val !== arg;
          case "$exists": return (val !== undefined) === arg;
          case "$gt": return val != null && val > arg;
          case "$gte": return val != null && val >= arg;
          case "$lt": return val != null && val < arg;
          case "$lte": return val != null && val <= arg;
          case "$elemMatch": return Array.isArray(val) && val.some((x: any) => matches(x, arg));
          default: return false;
        }
      });
    }
    if (v instanceof RegExp) return typeof val === "string" && v.test(val);
    return Array.isArray(val) ? val.includes(v) : eq(val, v);
  });
}
function setPath(d: Doc, k: string, v: any) {
  const parts = k.split(".");
  let o = d;
  for (const p of parts.slice(0, -1)) o = o[p] ??= {};
  o[parts[parts.length - 1]] = v;
}
export function apply(d: Doc, u: Doc) {
  for (const [k, v] of Object.entries(u.$set ?? {})) setPath(d, k, v);
  for (const k of Object.keys(u.$unset ?? {})) delete d[k];
  for (const [k, n] of Object.entries(u.$inc ?? {})) d[k] = (d[k] ?? 0) + (n as number);
  for (const [k, x] of Object.entries(u.$push ?? {})) (d[k] ??= []).push(x);
  for (const [k, x] of Object.entries(u.$addToSet ?? {})) { d[k] ??= []; if (!d[k].includes(x)) d[k].push(x); }
}
export function writableDb(t: Record<string, Doc[]>) {
  const col = (name: string) => {
    const rows = (t[name] ??= []);
    const cur = (l: Doc[]) => ({ sort: () => cur(l), project: () => cur(l), limit: (n: number) => cur(l.slice(0, n)), next: async () => l[0] ?? null, toArray: async () => l.map((x) => x) });
    return {
      find: (q: Doc = {}) => cur(rows.filter((d) => matches(d, q))),
      findOne: async (q: Doc) => rows.find((d) => matches(d, q)) ?? null,
      insertOne: async (d: Doc) => { rows.push(structuredClone(d)); },
      createIndex: async () => "ok",
      insertMany: async (ds: Doc[]) => { ds.forEach((d) => rows.push(structuredClone(d))); },
      updateOne: async (q: Doc, u: Doc, o?: Doc) => { const d = rows.find((x) => matches(x, q)); if (d) apply(d, u); else if (o?.upsert) { const n = { ...q }; apply(n, u); rows.push(n); } return { matchedCount: d ? 1 : 0 }; },
      replaceOne: async (q: Doc, doc: Doc, o?: Doc) => { const i = rows.findIndex((x) => matches(x, q)); if (i >= 0) rows[i] = structuredClone(doc); else if (o?.upsert) rows.push(structuredClone(doc)); return { matchedCount: i >= 0 ? 1 : 0 }; },
      updateMany: async (q: Doc, u: Doc) => { const hit = rows.filter((d) => matches(d, q)); hit.forEach((d) => apply(d, u)); return { matchedCount: hit.length }; },
    };
  };
  return { collection: col } as never;
}
