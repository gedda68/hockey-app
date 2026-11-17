import { describe, expect, it } from "vitest";
import { rolesInOrg } from "@/lib/auth/orgPersonas";

const p = (role: string, orgKey = "club:c1") => ({ key: `${role}::club::c1`, label: role, role, scopeType: "club" as const, scopeId: "c1", orgKey });

describe("rolesInOrg", () => {
  it("lists each role in the organisation, strongest first, marking the active one", () => {
    const personas = [p("player"), p("umpire"), p("coach"), p("manager", "club:other"), { ...p("member", "personal"), scopeType: "global" as const }];
    const r = rolesInOrg(personas, "club:c1", "umpire::club::c1");
    expect(r.map((x) => x.label)).toEqual(["Coach", "Umpire", "Player"]);
    expect(r.find((x) => x.active)?.label).toBe("Umpire");
  });

  it("returns nothing for an unknown organisation and no personas", () => {
    expect(rolesInOrg([p("player")], "club:zzz", undefined)).toEqual([]);
    expect(rolesInOrg(undefined, "club:c1", undefined)).toEqual([]);
  });

  it("lists a role once even if held at several scopes in the same organisation", () => {
    const r = rolesInOrg([p("coach"), { ...p("coach"), key: "coach::team::t1", scopeType: "team" as const, scopeId: "t1" }], "club:c1", undefined);
    expect(r).toHaveLength(1);
  });
});

import { profileGroups } from "@/lib/auth/orgPersonas";

describe("profileGroups", () => {
  it("groups every held role by organisation with Personal last and the active one marked", () => {
    const personas = [
      { key: "umpire::club::c1", label: "Umpire", role: "umpire", scopeType: "club" as const, scopeId: "c1", orgKey: "club:c1", orgLabel: "Commercial" },
      { key: "player::club::c1", label: "Player", role: "player", scopeType: "club" as const, scopeId: "c1", orgKey: "club:c1", orgLabel: "Commercial" },
      { key: "member::global::", label: "Member", role: "member", scopeType: "global" as const, scopeId: "", orgKey: "personal", orgLabel: "Personal" },
    ];
    const g = profileGroups(personas, "player::club::c1");
    expect(g.map((x) => x.orgLabel)).toEqual(["Commercial", "Personal"]);
    expect(g[0].roles.map((r) => r.label)).toEqual(["Umpire", "Player"]);
    expect(g[0].roles.find((r) => r.active)?.label).toBe("Player");
  });
});
