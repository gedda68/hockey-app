import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { resolveAccess } from "@/lib/access/matrix";
import { areaKey, decideArea, type LogicalArea } from "@/lib/access/areaAccess";

const ctx = { kind: "org", orgType: "club", orgId: "c1" } as const;
const payload = (roleKey: string, orgType: "club" | "association" = "club") => {
  const r = resolveAccess([{ roleKey, orgType, orgId: "o1" }], { kind: "org", orgType, orgId: "o1" }, { blueCardValid: true });
  return { context: r.context as never, areas: r.areas, roles: r.roles.map((x) => ({ key: x.role.key })) };
};

describe("area keys", () => {
  it("every logical area maps to a real matrix area for the org types that have it", () => {
    const areas: LogicalArea[] = ["members", "teams", "fees", "fixtures", "competitions", "settings", "comms", "reports", "roles", "venues", "volunteers"];
    const club = new Set(Object.keys(payload("club:president").areas));
    const assoc = new Set(Object.keys(payload("association:president-chair", "association").areas));
    for (const a of areas) {
      const c = areaKey(a, "club");
      const s = areaKey(a, "association");
      if (c) expect(club.has(c), `${a} club -> ${c}`).toBe(true);
      if (s) expect(assoc.has(s), `${a} association -> ${s}`).toBe(true);
    }
  });

  it("an area the association has no equivalent for is not enforced there", () => {
    const d = decideArea(payload("association:president-chair", "association"), "association-admin", "volunteers", "A");
    expect(d.enforced).toBe(false);
    expect(d.allowed).toBe(true);
  });
});

describe("enforcing the new areas", () => {
  it("a club president can edit settings; a plain player cannot", () => {
    expect(decideArea(payload("club:president"), "club-admin", "settings", "E").allowed).toBe(true);
    const p = decideArea(payload("club:player"), "player", "settings", "E");
    expect(p.enforced).toBe(true);
    expect(p.allowed).toBe(false);
  });
  it("people without a matrix role keep the old behaviour in every area", () => {
    for (const a of ["fixtures", "comms", "reports", "roles", "venues", "settings"] as LogicalArea[]) {
      expect(decideArea(undefined, "club-admin", a, "A")).toMatchObject({ enforced: false, allowed: true });
    }
  });
  it("matrix codes decide: a registrar reads reports no further than the matrix says", () => {
    const reg = payload("club:registrar-membership-secretary");
    const d = decideArea(reg, "registrar", "fixtures", "E");
    expect(d.enforced).toBe(true);
    expect(d.allowed).toBe(["E", "A"].includes(d.code));
  });
});

// ── Every route in the enforced groups carries a guard ─────────────────────────
const ROOT = path.resolve(__dirname, "../../app/api/admin");
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name === "route.ts" ? [path.join(dir, e.name)] : []));
const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, "/");

const GUARDED = (f: string) =>
  (/^season-competitions\//.test(f) && !/\/lineups\//.test(f)) ||
  /^umpires\//.test(f) ||
  /^news\//.test(f) ||
  /^role-requests\//.test(f) ||
  /^associations\/\[associationId\]\/(finance|official-register|venues|pitch-calendar-entries)\//.test(f) ||
  /^(analytics|competitions|divisions|club-registrations|association-registrations)\/route\.ts$/.test(f);

describe("route guard coverage", () => {
  const files = walk(ROOT).map((f) => ({ f, r: rel(f) })).filter((x) => GUARDED(x.r));
  it("finds the routes", () => expect(files.length).toBeGreaterThan(40));
  it.each(files.map((x) => [x.r, x.f]))("%s calls the matrix guard in every handler", (_r, f) => {
    const src = fs.readFileSync(f, "utf8");
    const handlers = [...src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].length;
    const guards = [...src.matchAll(/await (areaGuard|scopeGuard)\(/g)].length;
    expect(handlers).toBeGreaterThan(0);
    expect(guards).toBeGreaterThanOrEqual(handlers);
  });
});
