import { describe, it, expect, vi, beforeEach } from "vitest";

const teams = [
  { teamId: "T-A", clubId: "chc" },
  { teamId: "T-B", clubId: "other" },
];
const db = {
  collection: () => ({
    findOne: async (q: { teamId?: string }) => teams.find((t) => t.teamId === q.teamId) ?? null,
    find: (q: { clubId?: string }) => ({ project: () => ({}), limit: () => ({ toArray: async () => teams.filter((t) => t.clubId === q.clubId) }) }),
  }),
};

vi.mock("@/lib/mongodb", () => ({ getDatabase: async () => db, getDatabaseName: () => "x", default: Promise.resolve({ db: () => db }) }));
vi.mock("@/lib/access/memberAccess", () => ({ accessForSession: async () => null }));

import { surveyLevels, canRunSurveyAt, manageFilter } from "@/lib/surveys/access";
import type { SessionData } from "@/lib/auth/session";

const s = (o: Partial<SessionData>) => ({ userId: "u", role: "member", ...o }) as unknown as SessionData;

describe("who can run surveys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("super-admin: everyone, association, club and team", async () => {
    expect(await surveyLevels(s({ role: "super-admin" }))).toEqual(["global", "association", "club", "team"]);
  });
  it("association admin: association, club and team, never global", async () => {
    const l = await surveyLevels(s({ role: "association-admin", associationId: "A1" }));
    expect(l).toEqual(["association", "club", "team"]);
  });
  it("club admin and committee: club and team only", async () => {
    for (const role of ["club-admin", "club-committee"]) {
      expect(await surveyLevels(s({ role, clubId: "chc" }))).toEqual(["club", "team"]);
    }
  });
  it("team manager, coach, member: no surveys", async () => {
    for (const role of ["team-manager", "coach", "member", "umpire"]) {
      expect(await surveyLevels(s({ role }))).toBeNull();
    }
  });
  it("club admin can survey their own club's team but not another club's", async () => {
    const me = s({ role: "club-admin", clubId: "chc" });
    expect(await canRunSurveyAt(me, "team", "T-A", db as never)).toBe(true);
    expect(await canRunSurveyAt(me, "team", "T-B", db as never)).toBe(false);
  });
  it("club admin cannot survey another club, an association or everyone", async () => {
    const me = s({ role: "club-admin", clubId: "chc", associationId: "A1" });
    expect(await canRunSurveyAt(me, "club", "chc")).toBe(true);
    expect(await canRunSurveyAt(me, "club", "other")).toBe(false);
    expect(await canRunSurveyAt(me, "global", "")).toBe(false);
  });
  it("only a super-admin may run a global survey", async () => {
    expect(await canRunSurveyAt(s({ role: "super-admin" }), "global", "")).toBe(true);
    expect(await canRunSurveyAt(s({ role: "association-admin", associationId: "A1" }), "global", "")).toBe(false);
  });
  it("list filter: super-admin sees all, club admin only their club and teams, nobody else sees any", async () => {
    expect(await manageFilter(s({ role: "super-admin" }), db as never)).toEqual({});
    const f = (await manageFilter(s({ role: "club-admin", clubId: "chc" }), db as never)) as { $or: unknown[] };
    expect(f.$or).toContainEqual({ level: "club", scopeId: "chc" });
    expect(JSON.stringify(f)).not.toContain("other");
    expect(await manageFilter(s({ role: "member" }), db as never)).toBeNull();
  });
});

describe("team staff (coach / manager)", () => {
  const roster = [
    { teamId: "T-A", clubId: "chc", roster: [{ memberId: "MBR-1", roleId: "role-coach" }, { memberId: "MBR-2", roleId: "role-player" }] },
    { teamId: "T-C", clubId: "chc", roster: [{ memberId: "MBR-1", roleId: "role-player" }] },
    { teamId: "T-D", clubId: "chc", roster: [{ memberId: "MBR-3", roleId: "role-team-manager" }] },
  ];
  const sdb = {
    collection: () => ({
      findOne: async (q: { teamId?: string }) => roster.find((t) => t.teamId === q.teamId) ?? null,
      find: () => ({ limit: () => ({ toArray: async () => roster }), toArray: async () => roster }),
    }),
  };
  const coach = s({ role: "coach", clubId: "chc", memberId: "MBR-1" });

  it("isTeamStaffRole recognises coaches and managers, not players", async () => {
    const { isTeamStaffRole } = await import("@/lib/surveys/teamStaff");
    for (const r of ["role-coach", "role-assistant-coach", "role-team-manager", "role-manager"]) expect(isTeamStaffRole(r)).toBe(true);
    for (const r of ["role-player", "role-umpire", "", undefined]) expect(isTeamStaffRole(r)).toBe(false);
  });
  it("a coach gets the team level only, and only for teams they coach", async () => {
    const { teamsStaffedBy } = await import("@/lib/surveys/teamStaff");
    expect(await teamsStaffedBy(coach, sdb as never)).toEqual(["T-A"]);
    expect(await teamsStaffedBy(s({ role: "coach", memberId: "MBR-9" }), sdb as never)).toEqual([]);
  });
});
