import { describe, it, expect } from "vitest";
import { resolveAccess } from "@/lib/access/matrix";
import { decideArea, needForMethod, areaKey } from "@/lib/access/areaAccess";

const ctx = { kind: "org", orgType: "club", orgId: "c1" } as const;
const payload = (...keys: string[]) => {
  const r = resolveAccess(keys.map((roleKey) => ({ roleKey, orgType: "club" as const, orgId: "c1" })), ctx, { blueCardValid: true });
  return { context: r.context as any, areas: r.areas, roles: r.roles.map((x) => ({ key: x.role.key })) };
};

describe("decideArea", () => {
  it("does not enforce for super-admin, no roles, or personal context", () => {
    expect(decideArea(payload("club:registrar"), "super-admin", "members", "A").enforced).toBe(false);
    expect(decideArea(payload(), "club-admin", "members", "A").enforced).toBe(false);
    expect(decideArea({ context: { kind: "personal" }, areas: {}, roles: [] }, "member", "members", "A").allowed).toBe(true);
  });
  it("does not enforce when the current role did not come from a matrix role", () => {
    // Legacy club-admin who also holds a Player role: stays legacy.
    expect(decideArea(payload("club:player"), "club-admin", "members", "A").enforced).toBe(false);
  });
  it("enforces the area code for matrix-derived roles", () => {
    const reg = payload("club:club-registrar");
    expect(decideArea(reg, "registrar", "members", "E").allowed).toBe(true);
    const coach = payload("club:head-coach");
    const d = decideArea(coach, "coach", "fees", "R");
    expect(d.enforced).toBe(true);
    expect(d.allowed).toBe(codeOk(d.code, "R"));
  });
  it("reads the right area key per org type", () => {
    expect(areaKey("members", "club")).toBe("membersRegistrations");
    expect(areaKey("members", "association")).toBe("memberRegistry");
    expect(areaKey("teams", "club")).toBe("teamsSquads");
    expect(areaKey("fees", "association")).toBe("financeFeesLevies");
  });
  it("maps methods to needs", () => {
    expect(needForMethod("GET")).toBe("R");
    expect(needForMethod("GET", "V")).toBe("V");
    expect(needForMethod("POST")).toBe("E");
    expect(needForMethod("DELETE")).toBe("A");
  });
});

function codeOk(code: string, min: string) {
  const rank = ["-", "V", "O", "R", "E", "A"];
  return rank.indexOf(code) >= rank.indexOf(min);
}
