// Tiny in-memory stand-in for the MongoDB Db API used by read-only data loaders.
type Doc = Record<string, any>;
const get = (o: any, p: string): any => p.split(".").reduce((a, k) => (a == null ? a : Array.isArray(a) ? a.map((x) => x?.[k]).flat() : a[k]), o);
const cmp = (a: any, b: any) => (a instanceof Date ? a.getTime() : a) >= (b instanceof Date ? b.getTime() : b);
function test(val: any, cond: any): boolean {
  const vals = Array.isArray(val) ? val : [val];
  if (cond instanceof RegExp) return vals.some((v) => typeof v === "string" && cond.test(v));
  if (cond && typeof cond === "object" && !Array.isArray(cond) && !(cond instanceof Date)) {
    return Object.entries(cond).every(([op, arg]: any) => {
      switch (op) {
        case "$in": return vals.some((v) => arg.includes(v));
        case "$ne": return !vals.some((v) => v === arg);
        case "$gte": return vals.some((v) => v != null && typeof v === typeof arg && cmp(v, arg));
        case "$regex": return vals.some((v) => new RegExp(arg).test(v ?? ""));
        default: return false;
      }
    });
  }
  return vals.some((v) => v === cond);
}
export function match(d: Doc, q: Doc): boolean {
  return Object.entries(q).every(([k, v]) =>
    k === "$or" ? v.some((x: Doc) => match(d, x)) : k === "$and" ? v.every((x: Doc) => match(d, x)) : test(get(d, k), v),
  );
}
export function memoryDb(data: Record<string, Doc[]>) {
  return {
    collection: (name: string) => ({
      find: (q: Doc = {}) => {
        let rows = (data[name] ?? []).filter((d) => match(d, q));
        const cur = {
          sort: (s: Doc) => {
            const [[k, dir]] = Object.entries(s) as [string, number][];
            rows = [...rows].sort((a, b) => (String(get(a, k)) < String(get(b, k)) ? -dir : dir));
            return cur;
          },
          limit: (n: number) => ((rows = rows.slice(0, n)), cur),
          collation: () => cur,
          project: () => cur,
          toArray: async () => rows,
        };
        return cur;
      },
      findOne: async (q: Doc) => (data[name] ?? []).find((d) => match(d, q)) ?? null,
    }),
  } as any;
}
