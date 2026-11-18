import { describe, it, expect, beforeEach } from "vitest";
import { buildPlan, checkCompetition, cleanDrawInput, savePlan } from "@/lib/draw/service";
import { writableDb, type Doc } from "../helpers/writableDb";

let t: Record<string, Doc[]>, db: any;
const input = { teamIds: ["T1", "T2", "T3", "T4"], startDate: "2026-03-07", slotTimes: ["08:00", "09:30"], slotMinutes: 90, bufferMinutes: 0 };
beforeEach(() => {
  t = {
    season_competitions: [{ seasonCompetitionId: "SC1", competitionId: "C1", owningAssociationId: "bha" }],
    teams: ["T1", "T2", "T3", "T4"].map((id, i) => ({ teamId: id, name: `Team ${i + 1}`, clubId: `club${i + 1}`, roster: i === 1 ? [{ memberId: "kid", status: "active" }] : [] })),
    association_venues: [{ associationId: "bha", venueId: "V1", name: "North", status: "active", pitches: [{ pitchId: "P1", label: "1" }, { pitchId: "P2", label: "2" }] }],
    association_official_register: [
      { associationId: "bha", memberId: "u1", displayName: "Ump One", primaryClubId: "club1", levelLabel: "Level 1" },
      { associationId: "bha", memberId: "u2", displayName: "Ump Two", levelLabel: "Level 2" },
      { associationId: "bha", memberId: "u3", displayName: "Ump Three", levelLabel: "Level 1" },
      { associationId: "bha", memberId: "u4", displayName: "Ump Four", levelLabel: "Level 1" },
      { associationId: "bha", memberId: "u5", displayName: "Ump Five", allocationAvailability: "unavailable" },
    ],
    members: [{ memberId: "u3", familyRelationships: [{ relationshipType: "parent", relatedMemberId: "kid" }] }],
    member_availability: [{ memberId: "u4", kind: "unavailable", from: "2026-03-07", to: "2026-03-07" }],
    league_fixtures: [], umpire_assignments: [],
  };
  db = writableDb(t);
});

describe("draw service", () => {
  it("checks the input", () => {
    expect(cleanDrawInput({ teamIds: ["a"] })).toMatchObject({ ok: false });
    expect(cleanDrawInput({ teamIds: ["a", "b"], startDate: "nope", slotTimes: ["08:00"] })).toMatchObject({ ok: false });
    expect(cleanDrawInput({ teamIds: ["a", "b"], startDate: "2026-03-07", slotTimes: ["25:00"] })).toMatchObject({ ok: false });
    expect(cleanDrawInput({ teamIds: ["a", "b", "a"], startDate: "2026-03-07", slotTimes: ["08:00"], slotMinutes: 5000 })).toMatchObject({ ok: true, value: { teamIds: ["a", "b"], slotMinutes: 240 } });
  });
  it("builds a plan with no blocking clashes and sensible umpires", async () => {
    const r = await buildPlan(db, "SC1", input);
    if (!r.ok) throw new Error(r.error);
    expect(r.plan.fixtures).toHaveLength(6);
    expect(r.plan.clashes.filter((c) => c.severity === "block")).toEqual([]);
    const used = new Set(r.plan.fixtures.flatMap((f) => f.umpires.map((u) => u.umpireId)));
    expect(used.has("u5")).toBe(false); // register says not taking matches
    for (const f of r.plan.fixtures) {
      const ids = f.umpires.map((u) => u.umpireId);
      if (f.homeTeamId === "T2" || f.awayTeamId === "T2") expect(ids).not.toContain("u3"); // parent of a T2 player
      if (f.homeTeamId === "T1" || f.awayTeamId === "T1") expect(ids).not.toContain("u1"); // own club
      if (f.date === "2026-03-07") expect(ids).not.toContain("u4"); // marked unavailable that day
    }
  });
  it("avoids what is already booked in other competitions", async () => {
    t.league_fixtures.push({ fixtureId: "x", seasonCompetitionId: "OTHER", owningAssociationId: "bha", homeTeamId: "T1", awayTeamId: "Z", pitchId: "P1", scheduledStart: new Date("2026-03-06T22:00:00Z").toISOString(), scheduledEnd: new Date("2026-03-06T23:30:00Z").toISOString(), status: "scheduled", umpires: [{ umpireId: "u2" }] });
    const r = await buildPlan(db, "SC1", input);
    if (!r.ok) throw new Error(r.error);
    const t1 = r.plan.fixtures.find((f) => f.round === 1 && (f.homeTeamId === "T1" || f.awayTeamId === "T1"))!;
    expect(t1.start).not.toBe("2026-03-06T22:00:00.000Z");
  });
  it("says why it cannot plan", async () => {
    expect(await buildPlan(db, "NOPE", input)).toMatchObject({ ok: false, status: 404 });
    expect(await buildPlan(db, "SC1", { ...input, teamIds: ["T1", "ZZ"] })).toMatchObject({ ok: false, status: 400 });
    t.association_venues = [];
    expect(await buildPlan(writableDb(t), "SC1", input)).toMatchObject({ ok: false, status: 400 });
  });
  it("saves unpublished fixtures with umpire allocations, then a check finds nothing wrong", async () => {
    const r = await buildPlan(db, "SC1", input);
    if (!r.ok) throw new Error(r.error);
    const saved = await savePlan(db, "SC1", r.scope, r.plan, { userId: "admin", withUmpires: true });
    expect(saved.fixtures).toBe(6);
    expect(saved.umpireAssignments).toBeGreaterThan(0);
    expect(t.league_fixtures.every((f) => f.published === false)).toBe(true);
    expect(t.umpire_assignments[0].responseToken).toHaveLength(64);
    const chk = await checkCompetition(db, "SC1");
    expect(chk!.fixtures).toBe(6);
    expect(chk!.clashes.filter((c) => c.severity === "block")).toEqual([]);
    // double-book a pitch by hand and the check catches it
    t.league_fixtures[1].pitchId = t.league_fixtures[0].pitchId; t.league_fixtures[1].scheduledStart = t.league_fixtures[0].scheduledStart; t.league_fixtures[1].scheduledEnd = t.league_fixtures[0].scheduledEnd;
    expect((await checkCompetition(db, "SC1"))!.clashes.map((c) => c.kind)).toContain("pitch_overlap");
  });
  it("can replace the competition's fixtures", async () => {
    const r = await buildPlan(db, "SC1", input);
    if (!r.ok) throw new Error(r.error);
    await savePlan(db, "SC1", r.scope, r.plan, { userId: "a" });
    await savePlan(db, "SC1", r.scope, r.plan, { userId: "a", replace: true });
    expect(t.league_fixtures).toHaveLength(6);
  });
});
