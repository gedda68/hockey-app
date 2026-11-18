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
