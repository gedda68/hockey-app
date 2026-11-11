// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  clubShortNameForTeam,
  divisionLevelFromGrade,
  isFinalsPhase,
  localToIso,
  resolveVenue,
  splitAltiusName,
  transformHarvest,
  type ClubRef,
} from "@/lib/altius/transform";
import { validateTransform } from "@/lib/altius/validate";
import { accumulateStandingsRowsFromFixtures, isFinalsMatchLevel } from "@/lib/competitions/standings";
import type { AltiusHarvest } from "@/lib/altius/harvestTypes";

const clubs = new Map<string, ClubRef>(
  [["BUL", "Bulimba Hockey Club"], ["LAB", "Labrador Hockey Club"]].map(([s, n]) => [s!, { id: `club-${s}`, shortName: s!, name: n! }]),
);

const lineup = (team: string, players: [string, string, string, boolean?][]) => ({
  team,
  players: players.map(([shirt, id, name, gk]) => ({ shirt, altiusPlayerId: id, name, gk: !!gk, captain: shirt === "5", played: "X" })),
  staff: [{ role: "COACH", name: "TALLIS Ned" }],
});

const harvest: AltiusHarvest = {
  status: "done",
  started: "2026-11-11T00:00:00Z",
  finished: "2026-11-11T00:10:00Z",
  errors: [],
  comps: {
    "66": {
      league: "BHL", altiusCompetitionId: "66", sourceUrl: "x", title: "BHA 2026 BHL 1", location: "Brisbane",
      dateRange: "14 Mar - 19 Sep 2026", category: "Senior Coed Outdoor",
      teams: [
        { altiusTeamId: "502", name: "Bulimba BHL 1", code: "BUL BHL 1", finalStanding: "1", logoUrl: null, altiusOrgId: "4" },
        { altiusTeamId: "507", name: "Labrador BHL 1", code: "LAB BHL 1", finalStanding: "2", logoUrl: null, altiusOrgId: "8" },
        { altiusTeamId: "999", name: "Mudgeeraba BHL 1", code: "MHC BHL 1", finalStanding: "3", logoUrl: "logo.png", altiusOrgId: "32" },
      ],
      pools: [],
      matches: [
        { altiusMatchId: "1", matchNo: "001", round: 1, localDateTime: "2026-03-14 11:00:00", timezone: "Australia/Brisbane", homeCode: "BUL BHL 1", awayCode: "LAB BHL 1", phaseLabel: "BHL 1", homeTeamId: "502", awayTeamId: "507", score: { h: 0, a: 1, soH: null, soA: null }, scoreText: "0 - 1", status: "Official", pitch: "SHC - SHC1" },
        { altiusMatchId: "2", matchNo: "002", round: null, localDateTime: "2026-03-14 13:00:00", timezone: "Australia/Brisbane", homeCode: "LAB BHL 1", awayCode: "MHC BHL 1", phaseLabel: "BHL 1", homeTeamId: null, awayTeamId: null, score: { h: 3, a: 0, soH: null, soA: null }, scoreText: "3 - 0", status: "Official Forfeit", pitch: "SHC - SHC Grass 1" },
        { altiusMatchId: "3", matchNo: "003", round: 2, localDateTime: "2026-03-21 11:00:00", timezone: "Australia/Brisbane", homeCode: "BUL BHL 1", awayCode: "BYE", phaseLabel: "BHL 1", homeTeamId: "502", awayTeamId: null, score: null, scoreText: "BYE", status: "Official", pitch: null },
        { altiusMatchId: "4", matchNo: "004", round: null, localDateTime: "2026-09-12 17:00:00", timezone: "Australia/Brisbane", homeCode: "LAB BHL 1", awayCode: "BUL BHL 1", phaseLabel: "Grand Final", homeTeamId: "507", awayTeamId: "502", score: { h: 1, a: 1, soH: 2, soA: 4 }, scoreText: "1 - 1 (2 - 4 SO)", status: "Official", pitch: "SHC - SHC1" },
        { altiusMatchId: "5", matchNo: "005", round: 3, localDateTime: "2026-09-20 11:00:00", timezone: "Australia/Brisbane", homeCode: "BUL BHL 1", awayCode: "LAB BHL 1", phaseLabel: "BHL 1", homeTeamId: "502", awayTeamId: "507", score: null, scoreText: "-", status: "Upcoming", pitch: "UQ4" },
      ],
      scorers: [], cards: [],
      awards: [["Leading Goalscorer", "QUILL Jasper", "Labrador BHL 1"]],
    },
  },
  matchDetails: {
    "1": {
      lineups: [
        lineup("Bulimba BHL 1", [["1", "100", "KESTREL Dana", true], ["5", "101", "MARLOW Felix"]]),
        lineup("Labrador BHL 1", [["9", "200", "QUILL Jasper"]]),
      ],
      goals: [{ team: "Labrador BHL 1", minute: 47, shirt: "9", altiusPlayerId: "200", name: "QUILL Jasper", action: "Penalty Corner", scoreAfter: "0 - 1" }],
      cards: [{ team: "Bulimba BHL 1", minute: 29, shirt: "5", altiusPlayerId: "101", name: "MARLOW Felix", type: "Y (5')", umpire: "ORCHARD Simone (AUS)" }],
      officials: [{ role: "Umpire", name: "ORCHARD Simone (AUS)", altiusOfficialId: "892" }],
      details: { Venue: "Queensland State Hockey Centre - SHC1" },
      awards: [],
    },
    "4": {
      // Altius gives MARLOW a new player id (301) in this registration
      lineups: [
        lineup("Labrador BHL 1", [["9", "200", "QUILL Jasper"]]),
        lineup("Bulimba BHL 1", [["5", "301", "MARLOW Felix"]]),
      ],
      goals: [
        { team: "Labrador BHL 1", minute: 10, shirt: "9", altiusPlayerId: "200", name: "QUILL Jasper", action: "Penalty Stroke", scoreAfter: "1 - 0" },
        { team: "Bulimba BHL 1", minute: 50, shirt: "5", altiusPlayerId: "301", name: "MARLOW Felix", action: "Field Goal", scoreAfter: "1 - 1" },
      ],
      cards: [], officials: [], details: { Venue: "Queensland State Hockey Centre - SHC1" }, awards: [],
    },
  },
};

const run = () => transformHarvest(harvest, { associationId: "bha", season: "2026", clubsByShortName: new Map(clubs), now: new Date("2026-11-11T00:00:00Z") });

describe("altius helpers", () => {
  it("splits SURNAME First names", () => {
    expect(splitAltiusName("PEMBERTON Nicola")).toMatchObject({ firstName: "Nicola", lastName: "Pemberton" });
    expect(splitAltiusName("VAN DER ZEE Ana (GK)")).toMatchObject({ firstName: "Ana", lastName: "Van Der Zee" });
    expect(splitAltiusName("MCALLISTER Rory").lastName).toBe("McAllister");
    expect(splitAltiusName("ODELL OWEN")).toMatchObject({ firstName: "Owen", lastName: "Odell" });
  });
  it("maps team codes and names to clubs", () => {
    expect(clubShortNameForTeam("STA BHL 1", "St Andrews BHL 1")).toBe("STS");
    expect(clubShortNameForTeam("RHC BHL 2", "Redcliffe BHL 2")).toBe("RDC");
    expect(clubShortNameForTeam("PHS JHL U14A", "Pine Hills JHL U14A")).toBe("PNH");
    expect(clubShortNameForTeam("ZZZ 1", "Nowhere")).toBeNull();
  });
  it("recognises finals by phase label", () => {
    expect(isFinalsPhase("Grand Final")).toBe(true);
    expect(isFinalsPhase("Semi FInal 1")).toBe(true);
    expect(isFinalsPhase("Bronze Medal")).toBe(true);
    expect(isFinalsPhase("JHL U14A")).toBe(false);
    expect(isFinalsPhase("BHL 1")).toBe(false);
  });
  it("converts Brisbane local time and division levels", () => {
    expect(localToIso("2026-03-14 11:00:00")).toBe("2026-03-14T01:00:00.000Z");
    expect(divisionLevelFromGrade("BHL 3")).toBe(3);
    expect(divisionLevelFromGrade("JHL U12C")).toBe(3);
    expect(divisionLevelFromGrade("JHL J2")).toBe(2);
  });
  it("resolves venues and pitch surfaces", () => {
    const v = resolveVenue("Southpine Sporting Complex - SPSC 2", "SPSC 2");
    expect(v.venueName).toBe("South Pine Sports Complex");
    expect(v.known?.address.postcode).toBe("4500");
  });
});

describe("transformHarvest", () => {
  const t = run();

  it("produces documents that pass the app's own schemas", () => {
    expect(validateTransform(t)).toEqual([]);
  });

  it("skips BYEs, keeps forfeits, upcoming and finals", () => {
    const ids = t.fixtures.map((f) => f.legacyMatchId).sort();
    expect(ids).toEqual(["1", "2", "4", "5"]);
    const forfeit = t.fixtures.find((f) => f.legacyMatchId === "2")!;
    expect(forfeit.result).toMatchObject({ resultType: "forfeit", homeScore: 3, awayScore: 0, forfeitingTeamId: "team-altius-999" });
    expect(forfeit.round).toBe(1); // unnumbered league game takes the round played that day
    const gf = t.fixtures.find((f) => f.legacyMatchId === "4")!;
    expect(gf).toMatchObject({ matchLevel: "finals", round: 4 });
    expect(gf.result).toMatchObject({ shootoutHomeScore: 2, shootoutAwayScore: 4, notes: "Grand Final" });
    expect(t.fixtures.find((f) => f.legacyMatchId === "5")).toMatchObject({ status: "scheduled", result: null });
  });

  it("creates a minimal club for a visiting team not in the clubs collection", () => {
    expect(t.newClubs).toHaveLength(1);
    expect(t.newClubs[0]).toMatchObject({ id: "club-altius-mhc", name: "Mudgeeraba Hockey Club", parentAssociationId: null });
  });

  it("records goals and cards as match events against people", () => {
    const f1 = t.fixtures.find((f) => f.legacyMatchId === "1")!;
    expect(f1.matchEvents).toEqual([
      expect.objectContaining({ kind: "goal", minute: 47, teamId: "team-altius-507", memberId: "MBR-ALT-200", notes: "Penalty Corner" }),
      expect.objectContaining({ kind: "yellow_card", minute: 29, teamId: "team-altius-502", memberId: "MBR-ALT-101" }),
    ]);
    expect(f1.umpires).toEqual([expect.objectContaining({ umpireType: "umpire", umpireId: "MBR-ALT-OFF-ORCHARD-SIMONE" })]);
    const gf = t.fixtures.find((f) => f.legacyMatchId === "4")!;
    // the per-registration Altius id 301 is folded into the same person as 101
    expect(gf.matchEvents.map((e: { kind: string; memberId: string }) => [e.kind, e.memberId])).toEqual([
      ["penalty_stroke_goal", "MBR-ALT-200"],
      ["goal", "MBR-ALT-101"],
    ]);
  });

  it("merges Altius player ids for the same person at the same club", () => {
    const marlow = t.members.filter((m) => m.personalInfo.lastName === "Marlow");
    expect(marlow).toHaveLength(1);
    expect(marlow[0]!.altius.playerIds).toEqual(["101", "301"]);
    expect(marlow[0]!.clubId).toBe("club-BUL");
    expect(t.clubRegistrations.filter((r) => r.memberId === "MBR-ALT-101")).toHaveLength(1);
  });

  it("builds rosters with captain and goalkeeper", () => {
    const bul = t.teams.find((x) => x.teamId === "team-altius-502")!;
    expect(bul.leadership.captain).toBe("MBR-ALT-101");
    expect(bul.statistics.totalGoalkeepers).toBe(1);
    expect(bul.roster.some((r: { roleCategory: string }) => r.roleCategory === "Official")).toBe(true); // coach
  });

  it("writes fixture lineups with match-day shirt numbers, one person per club", () => {
    const lu = t.lineups.find((l) => l.fixtureId === "fx-altius-4" && l.teamId === "team-altius-502")!;
    expect(lu.players).toEqual([{ memberId: "MBR-ALT-101", shirtNumber: 5, isGoalkeeper: false, isCaptain: true }]);
    expect(lu.staff).toEqual([{ memberId: expect.stringMatching(/^MBR-ALT-STAFF-BUL-/), role: "Coach" }]);
    expect(t.lineups).toHaveLength(4);
  });

  it("links competition awards to the player", () => {
    expect(t.awards).toEqual([expect.objectContaining({ awardType: "top_goal_scorer", memberId: "MBR-ALT-200", teamId: "team-altius-507" })]);
  });
});

describe("standings exclude finals", () => {
  it("does not count matchLevel finals in the ladder", () => {
    const t = run();
    const sc = t.seasonCompetitions[0]!;
    const rows = accumulateStandingsRowsFromFixtures(t.fixtures.filter((f) => f.seasonCompetitionId === sc.seasonCompetitionId), sc.ladderRules, false);
    expect(rows.get("team-altius-502")).toMatchObject({ p: 1, l: 1 }); // the grand final isn't counted
    expect(isFinalsMatchLevel("finals")).toBe(true);
    expect(isFinalsMatchLevel("league")).toBe(false);
  });
});
