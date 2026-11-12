import { describe, expect, it } from "vitest";
import {
  buildFootprints,
  type FootprintFixture,
  type FootprintSeasonCompetition,
} from "@/lib/competitions/publicPlayerFootprint";

const sc = (
  id: string,
  season: string,
  over: Partial<FootprintSeasonCompetition> = {},
): FootprintSeasonCompetition => ({
  seasonCompetitionId: id,
  season,
  competitionId: "comp-1",
  owningAssociationId: "assoc-1",
  resultApprovalRequired: false,
  ...over,
});

const goal = (eventId: string, teamId: string, memberId: string, assistMemberId?: string) => ({
  eventId,
  kind: "goal",
  teamId,
  memberId,
  ...(assistMemberId ? { assistMemberId } : {}),
});

const fixture = (
  fixtureId: string,
  seasonCompetitionId: string,
  over: Partial<FootprintFixture> = {},
): FootprintFixture => ({
  fixtureId,
  round: 1,
  seasonCompetitionId,
  homeTeamId: "home",
  awayTeamId: "away",
  status: "completed",
  result: { homeScore: 1, awayScore: 0 },
  resultStatus: "submitted",
  matchEvents: [goal("e1", "home", "m1")],
  ...over,
});

describe("buildFootprints", () => {
  it("lists the teams and season competitions a member has counted stats in", () => {
    const out = buildFootprints(
      [sc("sc-2025", "2025"), sc("sc-2026", "2026")],
      [
        fixture("f1", "sc-2025"),
        fixture("f2", "sc-2026", { matchEvents: [goal("e2", "away", "m1")] }),
      ],
      new Set(["m1"]),
    );
    const fp = out.get("m1")!;
    expect(fp.teamIds).toEqual(["away", "home"]);
    // newest season first
    expect(fp.seasonCompetitions.map((s) => s.season)).toEqual(["2026", "2025"]);
  });

  it("only reports the members that were asked about", () => {
    const out = buildFootprints(
      [sc("sc-1", "2026")],
      [fixture("f1", "sc-1", { matchEvents: [goal("e1", "home", "m1"), goal("e2", "home", "other")] })],
      new Set(["m1"]),
    );
    expect([...out.keys()]).toEqual(["m1"]);
  });

  it("counts an assist-only player as visible, matching the public stats", () => {
    const out = buildFootprints(
      [sc("sc-1", "2026")],
      [fixture("f1", "sc-1", { matchEvents: [goal("e1", "home", "scorer", "assister")] })],
      new Set(["assister"]),
    );
    expect(out.get("assister")?.teamIds).toEqual(["home"]);
  });

  it("hides players whose only appearances are in unfinished fixtures", () => {
    const out = buildFootprints(
      [sc("sc-1", "2026")],
      [fixture("f1", "sc-1", { status: "scheduled", result: null })],
      new Set(["m1"]),
    );
    expect(out.has("m1")).toBe(false);
  });

  it("when approval is required, hides players until the result is approved", () => {
    const needsApproval = sc("sc-1", "2026", { resultApprovalRequired: true });

    const submitted = buildFootprints(
      [needsApproval],
      [fixture("f1", "sc-1", { resultStatus: "submitted" })],
      new Set(["m1"]),
    );
    expect(submitted.has("m1")).toBe(false);

    const approved = buildFootprints(
      [needsApproval],
      [fixture("f1", "sc-1", { resultStatus: "approved" })],
      new Set(["m1"]),
    );
    expect(approved.has("m1")).toBe(true);
  });

  it("ignores fixtures that belong to season competitions not in the public list", () => {
    const out = buildFootprints(
      [sc("sc-public", "2026")],
      [fixture("f1", "sc-private")],
      new Set(["m1"]),
    );
    expect(out.size).toBe(0);
  });

  it("ignores events attributed to a team that is not in the fixture", () => {
    const out = buildFootprints(
      [sc("sc-1", "2026")],
      [fixture("f1", "sc-1", { matchEvents: [goal("e1", "someone-else", "m1")] })],
      new Set(["m1"]),
    );
    expect(out.has("m1")).toBe(false);
  });
});
