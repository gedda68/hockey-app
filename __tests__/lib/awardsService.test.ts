import { describe, it, expect, beforeEach, vi } from "vitest";

const sent = vi.hoisted(() => [] as { to: string; subject: string }[]);
vi.mock("@/lib/email/client", () => ({ sendEmail: async (m: { to: string; subject: string }) => { sent.push(m); return { success: true }; }, APP_URL: "https://app.test" }));
vi.mock("@/lib/access/guardians", () => ({ isMinor: (dob: unknown) => dob === "minor", guardianIdsFor: async () => [], childrenOf: async () => [] }));

import { announce, castVote, competitionBoard, loadOfficialSettings, officialMemberIds, openOfficialRounds, recordSeasonPlayer, saveOfficialSettings, closeDueRounds, closeDuePrograms, closeRound, loadAwardSettings, myVotes, nominate, nominationsView, openDueRounds, resolveTie, saveAwardSettings, seasonBoard, setWinners, withdrawNomination } from "@/lib/awards/service";
import { voteCandidates, awardProgramCandidates } from "@/lib/awards/candidates";
import { writableDb, type Doc } from "../helpers/writableDb";

const NOW = new Date("2026-05-10T02:00:00Z"); // midday in Brisbane
const mem = (id: string, extra: Doc = {}) => ({ memberId: id, clubId: "chc", personalInfo: { firstName: id.toUpperCase(), lastName: "Smith" }, contact: { primaryEmail: `${id}@x.test` }, ...extra });
const ids = ["p1", "p2", "p3", "p4", "p5"];

let t: Record<string, Doc[]>;
let db: any;
beforeEach(() => {
  sent.length = 0;
  t = {
    members: [...ids.map((i) => mem(i)), mem("coach"), mem("kid", { personalInfo: { firstName: "Kid", dateOfBirth: "minor" } }), mem("other", { clubId: "elsewhere" })],
    teams: [{ teamId: "T1", clubId: "chc", name: "Under 14s" }, { teamId: "T2", clubId: "other", name: "Rivals" }],
    league_fixtures: [{ fixtureId: "F1", seasonCompetitionId: "SC1", homeTeamId: "T1", awayTeamId: "T2", status: "completed", scheduledStart: "2026-05-09T05:00:00.000Z" }],
    fixture_lineups: [{ fixtureId: "F1", teamId: "T1", players: ids.map((m) => ({ memberId: m })), staff: [{ memberId: "coach", role: "Coach" }] }],
    clubs: [{ clubId: "chc", name: "Chermside" }],
  };
  db = writableDb(t);
});

describe("player of the match votes", () => {
  it("opens one vote per team with a lineup, for the squad and coach, and emails them once", async () => {
    const r = await openDueRounds(db, NOW);
    expect(r.opened).toBe(1);
    expect(t.match_vote_rounds[0]).toMatchObject({ fixtureId: "F1", teamId: "T1", clubId: "chc", status: "open", teamName: "Under 14s", opponentName: "Rivals" });
    expect(t.match_vote_rounds[0].voterIds.sort()).toEqual(["coach", ...ids].sort());
    expect(t.match_vote_rounds[0].candidates).toHaveLength(5);
    expect(r.emailed).toBe(6);
    expect((await openDueRounds(db, NOW)).opened).toBe(0); // idempotent
  });
  it("doesn't open for tiny squads, switched-off clubs, old games or unfinished games", async () => {
    t.fixture_lineups[0].players = t.fixture_lineups[0].players.slice(0, 2);
    expect((await openDueRounds(db, NOW)).opened).toBe(0);
    t.fixture_lineups[0].players = ids.map((m) => ({ memberId: m }));
    await saveAwardSettings(db, "chc", { matchVotes: { enabled: false } });
    expect((await openDueRounds(db, NOW)).opened).toBe(0);
    await saveAwardSettings(db, "chc", { matchVotes: { enabled: true } });
    t.league_fixtures[0].scheduledStart = "2026-04-01T05:00:00.000Z";
    expect((await openDueRounds(db, NOW)).opened).toBe(0);
    t.league_fixtures[0].scheduledStart = "2026-05-09T05:00:00.000Z"; t.league_fixtures[0].status = "scheduled";
    expect((await openDueRounds(db, NOW)).opened).toBe(0);
  });
  it("leaves out staff when the club says so, and keeps emails quiet overnight", async () => {
    await saveAwardSettings(db, "chc", { matchVotes: { staffVote: false } });
    const r = await openDueRounds(db, new Date("2026-05-09T13:00:00Z")); // 11pm Brisbane
    expect(t.match_vote_rounds[0].voterIds).not.toContain("coach");
    expect(r.emailed).toBe(0);
  });
  it("settings are clamped and remembered", async () => {
    expect((await loadAwardSettings(db, "chc")).matchVotes).toEqual({ enabled: true, closeDays: 3, staffVote: true });
    expect((await saveAwardSettings(db, "chc", { matchVotes: { closeDays: 99 } })).matchVotes.closeDays).toBe(14);
    expect((await loadAwardSettings(db, "chc")).matchVotes.closeDays).toBe(14);
  });

  const roundId = async () => { await openDueRounds(db, NOW); return t.match_vote_rounds[0].roundId as string; };
  it("takes votes, lets people change them, and refuses bad ones", async () => {
    const id = await roundId();
    expect(await castVote(db, id, "p1", { first: "p2", second: "p3" }, NOW)).toEqual({ ok: true });
    expect(await castVote(db, id, "p1", { first: "p4" }, NOW)).toEqual({ ok: true });
    expect(t.match_votes).toHaveLength(1);
    expect(t.match_votes[0].ballot).toEqual({ first: "p4" });
    expect(t.match_vote_rounds[0].votedCount).toBe(1);
    expect(await castVote(db, id, "p1", { first: "p1" }, NOW)).toMatchObject({ ok: false, status: 400 });
    expect(await castVote(db, id, "stranger", { first: "p2" }, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(await castVote(db, "nope", "p1", { first: "p2" }, NOW)).toMatchObject({ ok: false, status: 404 });
    expect(await castVote(db, id, "p1", { first: "p2" }, new Date("2026-05-20T00:00:00Z"))).toMatchObject({ ok: false, status: 409 });
  });
  it("closes once everyone has voted and names the winner", async () => {
    const id = await roundId();
    for (const v of ["p1", "p2", "p3", "p4", "p5"]) await castVote(db, id, v, { first: v === "p2" ? "p3" : "p2", second: v === "p1" ? "p3" : "p1" }, NOW);
    expect(t.match_vote_rounds[0].status).toBe("open");
    await castVote(db, id, "coach", { first: "p2", second: "p3" }, NOW);
    expect(t.match_vote_rounds[0]).toMatchObject({ status: "closed", winnerId: "p2" });
    expect(await castVote(db, id, "p1", { first: "p3" }, NOW)).toMatchObject({ ok: false, status: 409 });
  });
  it("closes when time is up, and a dead heat is left for staff to settle", async () => {
    const id = await roundId();
    await castVote(db, id, "p1", { first: "p2" }, NOW);
    await castVote(db, id, "p3", { first: "p4" }, NOW);
    expect((await closeDueRounds(db, NOW)).closed).toBe(0);
    expect((await closeDueRounds(db, new Date("2026-05-20T00:00:00Z"))).closed).toBe(1);
    expect(t.match_vote_rounds[0]).toMatchObject({ status: "closed", winnerId: null, result: { kind: "tied" } });
    expect(await resolveTie(db, id, "p5")).toMatchObject({ ok: false, status: 400 });
    expect(await resolveTie(db, id, "p4")).toEqual({ ok: true });
    expect(t.match_vote_rounds[0].winnerId).toBe("p4");
    expect(await resolveTie(db, id, "p2")).toMatchObject({ ok: false, status: 409 });
  });
  it("a round nobody voted in closes without a winner", async () => {
    const id = await roundId();
    expect(await closeRound(db, id, NOW)).toMatchObject({ status: "closed", winnerId: null, tied: [] });
  });
  it("shows people their open votes (and what they chose) and who won", async () => {
    const id = await roundId();
    await castVote(db, id, "p1", { first: "p2" }, NOW);
    const mine = await myVotes(db, "p1", NOW);
    expect(mine.open).toHaveLength(1);
    expect(mine.open[0].myBallot).toEqual({ first: "p2" });
    expect((await myVotes(db, "stranger", NOW)).open).toHaveLength(0);
    await closeRound(db, id, NOW);
    const after = await myVotes(db, "p1", NOW);
    expect(after.open).toHaveLength(0);
    expect(after.done[0]).toMatchObject({ winnerId: "p2", winnerName: "P2 Smith" });
  });
  it("adds up a season leaderboard for a team", async () => {
    const id = await roundId();
    await castVote(db, id, "p1", { first: "p2", second: "p3" }, NOW);
    await castVote(db, id, "p4", { first: "p2" }, NOW);
    await closeRound(db, id, NOW);
    const board = await seasonBoard(db, { teamId: "T1", year: "2026" });
    expect(board[0]).toMatchObject({ memberId: "p2", points: 6, wins: 1, name: "P2 Smith" });
    expect(await seasonBoard(db, { teamId: "T1", year: "2025" })).toEqual([]);
  });
});

describe("umpires' and officials' votes", () => {
  const away = ["a1", "a2", "a3"];
  beforeEach(() => {
    t.members.push(mem("ump1"), mem("tech1"), ...away.map((i) => mem(i, { clubId: "other" })));
    t.association_official_register = [{ umpireNumber: "U-77", memberId: "ump1" }];
    t.league_fixtures[0].owningAssociationId = "ASSOC";
    t.league_fixtures[0].umpires = [{ umpireType: "umpire", umpireId: "U-77" }, { umpireType: "technical_official", umpireId: "tech1" }, { umpireType: "umpire", umpireId: "u-gone", allocationStatus: "declined" }, { umpireType: "umpire", umpireId: "ump1", isStandby: true }];
    t.fixture_lineups.push({ fixtureId: "F1", teamId: "T2", players: away.map((m) => ({ memberId: m, shirtNumber: 4 })), staff: [] });
    t.season_competitions = [{ seasonCompetitionId: "SC1", owningAssociationId: "ASSOC" }];
  });
  it("maps umpire numbers and member ids to members, skipping standbys and declines", async () => {
    expect((await officialMemberIds(db, t.league_fixtures[0].umpires)).sort()).toEqual(["tech1", "ump1"]);
  });
  it("opens one vote per game for the officials, with players from both teams", async () => {
    const r = await openOfficialRounds(db, NOW);
    expect(r.opened).toBe(1);
    const round = t.match_vote_rounds[0];
    expect(round).toMatchObject({ kind: "officials", fixtureId: "F1", teamName: "Under 14s v Rivals", clubId: null, status: "open" });
    expect(round.voterIds.sort()).toEqual(["tech1", "ump1"]);
    expect(round.candidates).toHaveLength(8);
    expect(round.candidates.find((c: Doc) => c.memberId === "a1").teamName).toBe("Rivals");
    expect(sent.map((s) => s.to).sort()).toEqual(["tech1@x.test", "ump1@x.test"]);
    expect(sent[0].subject).toContain("Best players on ground");
    expect((await openOfficialRounds(db, NOW)).opened).toBe(0);
  });
  it("lets officials vote for players from either team and counts team and official votes together", async () => {
    await openDueRounds(db, NOW);
    await openOfficialRounds(db, NOW);
    const team = t.match_vote_rounds.find((r) => r.kind === "team")!, off = t.match_vote_rounds.find((r) => r.kind === "officials")!;
    expect(await castVote(db, off.roundId, "ump1", { first: "a2", second: "p1" }, NOW)).toEqual({ ok: true });
    expect(await castVote(db, off.roundId, "p1", { first: "a2" }, NOW)).toMatchObject({ ok: false, status: 403 }); // players don't vote on officials' rounds
    expect(await castVote(db, team.roundId, "ump1", { first: "p1" }, NOW)).toMatchObject({ ok: false, status: 403 });
    await castVote(db, off.roundId, "tech1", { first: "p1", second: "a2" }, NOW);
    await castVote(db, team.roundId, "p2", { first: "p1" }, NOW);
    await closeRound(db, off.roundId, NOW); await closeRound(db, team.roundId, NOW);
    const board = await competitionBoard(db, "SC1");
    expect(board.games).toBe(1);
    expect(board.rows[0]).toMatchObject({ memberId: "p1", name: "P1 Smith", teamPoints: 3, officialPoints: 5, total: 8, teamName: "Under 14s" });
    expect(board.rows[1]).toMatchObject({ memberId: "a2", officialPoints: 5, total: 5 });
    // the club's own team table is unaffected by officials' votes
    expect((await seasonBoard(db, { teamId: "T1", year: "2026" }))[0]).toMatchObject({ memberId: "p1", points: 3 });
  });
  it("respects the association's switch and clamps days", async () => {
    expect(await loadOfficialSettings(db, "ASSOC")).toMatchObject({ enabled: true, closeDays: 3 });
    await saveOfficialSettings(db, "ASSOC", { officials: { enabled: false, closeDays: 40 } });
    expect(await loadOfficialSettings(db, "ASSOC")).toMatchObject({ enabled: false, closeDays: 14 });
    expect((await openOfficialRounds(db, NOW)).opened).toBe(0);
  });
  it("records the top player as the competition's player of the season, once", async () => {
    await openDueRounds(db, NOW);
    const team = t.match_vote_rounds[0];
    await castVote(db, team.roundId, "p2", { first: "p1" }, NOW);
    await closeRound(db, team.roundId, NOW);
    expect(await recordSeasonPlayer(db, "SC1", "p4", "admin")).toMatchObject({ ok: false, status: 400 });
    expect(await recordSeasonPlayer(db, "NOPE", "p1", "admin")).toMatchObject({ ok: false, status: 404 });
    expect(await recordSeasonPlayer(db, "SC1", "p1", "admin")).toEqual({ ok: true });
    expect(t.competition_awards[0]).toMatchObject({ context: "league", awardType: "player_of_competition", memberId: "p1", memberDisplayName: "P1 Smith", awardLabelSnapshot: "Player of the season" });
    expect(await recordSeasonPlayer(db, "SC1", "p1", "admin")).toMatchObject({ ok: false, status: 409 });
  });
});

describe("season award nominations", () => {
  const program = (extra: Doc = {}) => ({ programId: "AWD1", clubId: "chc", clubName: "Chermside", seasonYear: "2026", title: "2026 awards", status: "open", opensAt: "2026-05-01T00:00:00Z", closesAt: "2026-09-01T00:00:00Z", winners: {}, categories: [{ categoryId: "C1", name: "Club Champion" }, { categoryId: "C2", name: "Most Improved" }], ...extra });
  const reason = "Never missed a session and looked after the new players";
  beforeEach(() => { t.award_programs = [program()]; });

  it("accepts a nomination from a club member for a club member", async () => {
    expect(await nominate(db, "AWD1", "p1", { categoryId: "C1", nomineeId: "p2", reason }, NOW)).toMatchObject({ ok: true });
    expect(t.award_nominations[0]).toMatchObject({ nominatorId: "p1", nomineeId: "p2", categoryId: "C1", clubId: "chc" });
  });
  it("refuses outsiders, juniors, yourself, repeats, other clubs' members and closed windows", async () => {
    const n = (who: string, body: Doc, at = NOW) => nominate(db, "AWD1", who, { categoryId: "C1", nomineeId: "p2", reason, ...body }, at);
    expect(await n("other", {})).toMatchObject({ ok: false, status: 403 });
    expect(await n("kid", {})).toMatchObject({ ok: false, status: 403 });
    expect(await n("p1", { nomineeId: "p1" })).toMatchObject({ ok: false, status: 400 });
    expect(await n("p1", { nomineeId: "other" })).toMatchObject({ ok: false, status: 400 });
    expect(await n("p1", { categoryId: "nope" })).toMatchObject({ ok: false, status: 400 });
    expect(await n("p1", { reason: "nice" })).toMatchObject({ ok: false, status: 400 });
    expect(await n("p1", {})).toMatchObject({ ok: true });
    expect(await n("p1", {})).toMatchObject({ ok: false, status: 400 });
    expect(await n("p3", {}, new Date("2026-10-01T00:00:00Z"))).toMatchObject({ ok: false, status: 409 });
    t.award_programs[0].status = "draft";
    expect(await n("p3", {})).toMatchObject({ ok: false, status: 409 });
  });
  it("lets someone withdraw while open, and counts only live nominations", async () => {
    await nominate(db, "AWD1", "p1", { categoryId: "C1", nomineeId: "p2", reason }, NOW);
    await nominate(db, "AWD1", "p3", { categoryId: "C1", nomineeId: "p2", reason }, NOW);
    await nominate(db, "AWD1", "p3", { categoryId: "C1", nomineeId: "p4", reason }, NOW);
    let view = await nominationsView(db, "AWD1");
    expect(view[0]).toMatchObject({ nomineeId: "p2", count: 2, nomineeName: "P2 Smith" });
    const id = t.award_nominations[0].nominationId;
    expect(await withdrawNomination(db, id, "p3", NOW)).toMatchObject({ ok: false, status: 404 }); // not theirs
    expect(await withdrawNomination(db, id, "p1", NOW)).toEqual({ ok: true });
    view = await nominationsView(db, "AWD1");
    expect(view.find((v) => v.nomineeId === "p2")?.count).toBe(1);
    expect(view[0].reasons[0]).toMatchObject({ by: "P3 Smith" });
  });
  it("moves a program to judging once its window has ended", async () => {
    expect((await closeDuePrograms(db, NOW)).closed).toBe(0);
    expect((await closeDuePrograms(db, new Date("2026-10-01T00:00:00Z"))).closed).toBe(1);
    expect(t.award_programs[0].status).toBe("judging");
  });
  it("picks winners from the club, announces them once, and tells the winners", async () => {
    t.award_programs[0].status = "judging";
    expect(await setWinners(db, "AWD1", "C1", ["other"])).toMatchObject({ ok: false, status: 400 });
    expect(await setWinners(db, "AWD1", "nope", ["p1"])).toMatchObject({ ok: false, status: 400 });
    expect(await announce(db, "AWD1", NOW)).toMatchObject({ ok: false, status: 400 }); // nobody chosen yet
    expect(await setWinners(db, "AWD1", "C1", ["p1", "p2"])).toEqual({ ok: true });
    expect(await setWinners(db, "AWD1", "C2", ["p2"])).toEqual({ ok: true });
    const r = await announce(db, "AWD1", NOW);
    expect(r).toMatchObject({ ok: true, emailed: 2 });
    expect(sent.map((s) => s.to).sort()).toEqual(["p1@x.test", "p2@x.test"]);
    expect(sent.find((s) => s.to === "p2@x.test")!.subject).toContain("Club Champion, Most Improved");
    expect(t.award_programs[0].status).toBe("announced");
    expect(await announce(db, "AWD1", NOW)).toMatchObject({ ok: false, status: 409 });
    expect(await setWinners(db, "AWD1", "C1", ["p3"])).toMatchObject({ ok: false, status: 409 });
  });
});

describe("notifications", () => {
  const now = new Date("2026-05-10T02:00:00Z");
  it("asks for votes until they close", () => {
    const rows = [{ roundId: "R1", teamName: "U14", opponentName: "Rivals", startsAt: "2026-05-09T05:00:00Z", closesAt: "2026-05-12T00:00:00Z" }, { roundId: "R2", teamName: "U12", startsAt: "2026-05-01T05:00:00Z", closesAt: "2026-05-04T00:00:00Z" }];
    const c = voteCandidates(rows, now);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ dedupeKey: "vote:R1", category: "awards", link: "/admin/my-votes" });
  });
  it("announces open nominations until I've nominated, then winners for two weeks", () => {
    const open = { programId: "A", title: "2026 awards", seasonYear: "2026", clubId: "chc", closesAt: "2026-09-01T00:00:00Z", status: "open" };
    expect(awardProgramCandidates([open], new Set(), now)).toHaveLength(1);
    expect(awardProgramCandidates([open], new Set(["A"]), now)).toHaveLength(0);
    const done = { ...open, status: "announced", announcedAt: "2026-05-05T00:00:00Z" };
    expect(awardProgramCandidates([done], new Set(), now)[0]).toMatchObject({ type: "award-announced" });
    expect(awardProgramCandidates([{ ...done, winnerOf: ["Club Champion"] }], new Set(), now)[0]).toMatchObject({ type: "award-won", title: expect.stringContaining("Club Champion") });
    expect(awardProgramCandidates([{ ...done, announcedAt: "2026-04-01T00:00:00Z" }], new Set(), now)).toHaveLength(0);
  });
});
