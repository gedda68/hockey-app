import { describe, expect, it } from "vitest";
import { getMatrixRole } from "@/lib/access/matrix";
import { ASSOC_MAP, CLUB_MAP, holdingKey, mapLegacyAssignment, planMemberHoldings, type LegacyAssignment } from "@/lib/access/legacyMapping";

const NOW = new Date("2026-06-01T00:00:00Z");
const map = (a: Partial<LegacyAssignment> & { role: string }, ctx = {}) =>
  mapLegacyAssignment({ scopeType: "club", scopeId: "club-1", ...a }, { now: NOW, ...ctx });

describe("legacy role -> matrix holding", () => {
  it("every mapped matrix role exists", () => {
    for (const s of Object.values(CLUB_MAP)) expect(getMatrixRole(`club:${s}`), `club:${s}`).toBeTruthy();
    for (const s of Object.values(ASSOC_MAP)) expect(getMatrixRole(`association:${s}`), `association:${s}`).toBeTruthy();
  });

  it("maps a club registrar to the registrar matrix role", () => {
    const o = map({ role: "registrar", seasonYear: "2026" });
    expect(o.kind).toBe("holding");
    if (o.kind === "holding") {
      expect(o.holding).toMatchObject({ roleKey: "club:registrar-membership-secretary", orgType: "club", orgId: "club-1", season: "2026", status: "active", source: "legacy-migration", legacyRole: "registrar" });
    }
  });

  it("maps association roles to association matrix roles", () => {
    const o = map({ role: "assoc-registrar", scopeType: "association", scopeId: "bha" });
    expect(o.kind === "holding" && o.holding).toMatchObject({ roleKey: "association:registrar-membership-officer", orgType: "association", orgId: "bha" });
  });

  it("a team coach becomes a team-scoped holding in the team's club", () => {
    const o = map({ role: "coach", scopeType: "team", scopeId: "t1" }, { teamClubId: "club-9" });
    expect(o.kind === "holding" && o.holding).toMatchObject({ roleKey: "club:assistant-coach", orgId: "club-9", teamIds: ["t1"] });
  });

  it("a team coach whose team is unknown is left for review", () => {
    expect(map({ role: "coach", scopeType: "team", scopeId: "gone" }).kind).toBe("review");
  });

  it("club-wide coach, manager and association selector are never guessed", () => {
    expect(map({ role: "coach" }).kind).toBe("review");
    expect(map({ role: "manager" }).kind).toBe("review");
    expect(map({ role: "assoc-selector", scopeType: "association", scopeId: "bha" }).kind).toBe("review");
  });

  it("skips super-admin, member, global, inactive and expired", () => {
    expect(map({ role: "super-admin" }).kind).toBe("skip");
    expect(map({ role: "member" }).kind).toBe("skip");
    expect(map({ role: "registrar", scopeType: "global", scopeId: undefined }).kind).toBe("skip");
    expect(map({ role: "registrar", active: false }).kind).toBe("skip");
    expect(map({ role: "registrar", expiresAt: "2026-01-01T00:00:00Z" }).kind).toBe("skip");
  });

  it("no team-scoped matrix role is ever created without team ids", () => {
    const roles = ["club-admin", "club-committee", "registrar", "team-selector", "player", "parent", "volunteer", "umpire", "technical-official", "media-marketing"];
    for (const r of roles) {
      const o = map({ role: r });
      if (o.kind !== "holding") continue;
      const scope = getMatrixRole(o.holding.roleKey)!.scope;
      expect(["team", "ageGroup", "repSquad"]).not.toContain(scope);
    }
  });

  it("plan skips holdings the member already has and de-duplicates repeats", () => {
    const a: LegacyAssignment = { role: "registrar", scopeType: "club", scopeId: "club-1" };
    const existing = [{ roleKey: "club:registrar-membership-secretary", orgType: "club" as const, orgId: "club-1" }];
    const p1 = planMemberHoldings([a], existing, () => ({ now: NOW }));
    expect(p1.add).toHaveLength(0);
    expect(p1.alreadyHeld).toBe(1);
    const p2 = planMemberHoldings([a, a], [], () => ({ now: NOW }));
    expect(p2.add).toHaveLength(1);
  });

  it("holdingKey ignores team id order", () => {
    expect(holdingKey({ roleKey: "x", orgId: "c", teamIds: ["b", "a"] })).toBe(holdingKey({ roleKey: "x", orgId: "c", teamIds: ["a", "b"] }));
  });
});
