import { describe, it, expect } from "vitest";
import { groupPersonasByOrg } from "@/lib/auth/orgPersonas";
import type { PersonaOption } from "@/lib/auth/sessionPersona";

const p = (role: string, scopeType: PersonaOption["scopeType"], scopeId: string, orgKey: string, orgLabel: string): PersonaOption =>
  ({ key: `${role}::${scopeType}::${scopeId}`, label: role, role, scopeType, scopeId, orgKey, orgLabel });

const personas = [
  p("coach", "club", "c1", "club:c1", "Commercial HC"),
  p("registrar", "club", "c1", "club:c1", "Commercial HC"),
  p("player", "club", "c2", "club:c2", "Easts"),
  p("member", "global", "", "personal", "Personal"),
];

describe("groupPersonasByOrg", () => {
  it("collapses roles into one entry per organisation, strongest role first", () => {
    const e = groupPersonasByOrg(personas, "coach::club::c1");
    expect(e.map((x) => x.label)).toEqual(["Commercial HC", "Easts", "Personal"]);
    expect(e[0].roleLabels).toEqual(["Registrar", "Coach"]);
    expect(e[1].personaKey).toBe("player::club::c2");
  });
  it("stays on the current role inside the active organisation", () => {
    const e = groupPersonasByOrg(personas, "coach::club::c1");
    expect(e[0].active).toBe(true);
    expect(e[0].personaKey).toBe("coach::club::c1");
  });
  it("switches to the strongest role when entering another organisation", () => {
    const e = groupPersonasByOrg(personas, "player::club::c2");
    expect(e.find((x) => x.orgKey === "club:c1")!.personaKey).toBe("registrar::club::c1");
  });
  it("a single organisation gives one entry", () => {
    expect(groupPersonasByOrg([personas[0], personas[1]], undefined)).toHaveLength(1);
    expect(groupPersonasByOrg(undefined, undefined)).toEqual([]);
  });
  it("puts Personal and Platform after organisations", () => {
    const e = groupPersonasByOrg([p("super-admin", "global", "", "platform", "Platform"), ...personas], undefined);
    expect(e.map((x) => x.orgKey)).toEqual(["club:c1", "club:c2", "personal", "platform"]);
  });
});
