import { describe, it, expect } from "vitest";
import { resolveAccess, codeForTarget, narrowHoldings, scopeCovers, getMatrixRole, type RoleHolding } from "@/lib/access/matrix";
import { decideAreaForTarget } from "@/lib/access/areaAccess";
import { rosterTeamTarget, holdingCoversTeam, teamScopeValue } from "@/lib/access/scopeTargets";
import { memberIdsOnCoveredTeams } from "@/lib/access/memberScope";

const ctx = { kind: "org", orgType: "club", orgId: "c1" } as const;
const roster = { id: "R1", clubId: "c1", grade: "U12", division: "Girls", teams: [{ name: "A", players: [{ memberId: "P1" }, { playerId: "P2" }], coach: { memberId: "C1" } }, { name: "B", players: [{ memberId: "P3" }] }] };
const holdings: RoleHolding[] = [{ roleKey: "club:head-coach", orgType: "club" as const, orgId: "c1", teamIds: [teamScopeValue("R1", "A")] }];
const resFor = (h: RoleHolding[] = holdings) => resolveAccess(h, ctx, { blueCardValid: true });
const payload = (h: RoleHolding[] = holdings) => { const r = resFor(h); return { context: r.context as any, areas: r.areas, roles: r.roles.map((x) => ({ key: x.role.key })) }; };

describe("scope: team", () => {
  it("gives the role's code only on its own team", () => {
    const r = resFor();
    expect(codeForTarget(r, "teamsSquads", rosterTeamTarget(roster, 0))).toBe("E");
    expect(codeForTarget(r, "teamsSquads", rosterTeamTarget(roster, 1))).toBe("-");
  });
  it("is case-insensitive and matches by name inside the roster", () => {
    const h = [{ ...holdings[0], teamIds: ["r1:a"] }];
    expect(codeForTarget(resFor(h), "teamsSquads", rosterTeamTarget(roster, 0))).toBe("E");
  });
  it("allows writes on own team and refuses another, via decideAreaForTarget", () => {
    const d = (idx: number) => decideAreaForTarget(payload(), holdings, true, "coach", "teams", "E", rosterTeamTarget(roster, idx));
    expect(d(0).allowed).toBe(true);
    expect(d(1).allowed).toBe(false);
  });
  it("does not enforce for people the matrix doesn't apply to", () => {
    const d = decideAreaForTarget(payload(), holdings, true, "club-admin", "teams", "E", rosterTeamTarget(roster, 1));
    expect(d.enforced).toBe(false);
    expect(d.allowed).toBe(true);
  });
});

describe("scope: age group, club-wide", () => {
  it("covers every team in a matching age group", () => {
    const h = [{ roleKey: "club:age-group-coordinator", orgType: "club" as const, orgId: "c1", ageGroups: ["u12"] }];
    const r = resFor(h);
    expect(codeForTarget(r, "teamsSquads", rosterTeamTarget(roster, 1))).not.toBe("-");
    expect(codeForTarget(r, "teamsSquads", rosterTeamTarget({ ...roster, grade: "U16", division: "Boys" }, 0))).toBe("-");
  });
  it("a club-wide role covers everything and needs no narrowing", () => {
    const h = [{ roleKey: "club:registrar-membership-secretary", orgType: "club" as const, orgId: "c1" }];
    const r = resFor(h);
    expect(narrowHoldings(r, "membersRegistrations", "R")).toBeNull();
    expect(scopeCovers(getMatrixRole("club:registrar-membership-secretary")!, h[0], {})).toBe(true);
  });
});

describe("member visibility", () => {
  it("narrows to people on covered teams only", () => {
    const ids = memberIdsOnCoveredTeams([roster], [{ teamIds: [teamScopeValue("R1", "A")] }]);
    expect(ids.sort()).toEqual(["C1", "P1", "P2"]);
    expect(memberIdsOnCoveredTeams([roster], [{ ageGroups: ["U12"] }]).sort()).toEqual(["C1", "P1", "P2", "P3"]);
    expect(holdingCoversTeam({ teamIds: [] }, roster, roster.teams[0])).toBe(false);
  });
  it("narrowHoldings lists the scoped roles when none is club-wide", () => {
    expect(narrowHoldings(resFor(), "membersRegistrations", "R")?.length).toBe(1);
  });
});
