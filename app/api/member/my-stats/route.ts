/**
 * GET /api/member/my-stats
 * The signed-in member's own playing numbers (games, goals, per team…). Own record only.
 */

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";
import { computePlayingStats } from "@/lib/members/playingStats";
import { hasPlayerHistory } from "@/lib/members/playerStats";
import { computeMilestones, rankInCompetition, buildRepAppearances, membershipLength, type CompetitionRank } from "@/lib/members/playingExtras";
import { aggregatePlayerStatsForSeason } from "@/lib/competitions/playerSeasonStats";
import { COMPETITION_AWARDS_COLLECTION } from "@/lib/competitions/competitionAwards";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.memberId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const db = (await clientPromise).db("hockey-app");
    const memberKey = await resolveSessionMemberId(db, session);
    const member = await db.collection("members").findOne(
      { memberId: memberKey },
      { projection: { roles: 1, membership: 1, teams: 1, playerInfo: 1, memberId: 1 } },
    );
    if (!member) return NextResponse.json({ error: "Member record not found" }, { status: 404 });

    const lineups = await db.collection("fixture_lineups")
      .find({ "players.memberId": memberKey }, { projection: { fixtureId: 1, teamId: 1, players: 1 } })
      .limit(3000)
      .toArray();
    const fixtures = lineups.length
      ? await db.collection("league_fixtures")
          .find({ fixtureId: { $in: lineups.map((l) => String(l.fixtureId)) } },
            { projection: { fixtureId: 1, scheduledStart: 1, status: 1, matchEvents: 1, homeTeamId: 1, awayTeamId: 1, result: 1, seasonCompetitionId: 1 } })
          .toArray()
      : [];
    const teamIds = [...new Set(lineups.map((l) => String(l.teamId)).filter(Boolean))];
    const teamDocs = teamIds.length
      ? await db.collection("teams").find({ teamId: { $in: teamIds } }, { projection: { teamId: 1, name: 1, displayName: 1 } }).toArray()
      : [];
    const teamNames = new Map(teamDocs.map((t) => [String(t.teamId), String(t.displayName ?? t.name ?? t.teamId)]));

    const stats = computePlayingStats(memberKey, lineups, fixtures, teamNames, new Date(), member.playerInfo?.appearances, member.playerInfo?.goals);
    const now = new Date();

    // Top-scorer rank in each competition played this season.
    const thisYear = now.getFullYear();
    const scIds = [...new Set(fixtures
      .filter((f) => f.scheduledStart && new Date(f.scheduledStart).getFullYear() === thisYear && f.seasonCompetitionId)
      .map((f) => String(f.seasonCompetitionId)))].slice(0, 10);
    const ranks: CompetitionRank[] = [];
    for (const scId of scIds) {
      const sc = await db.collection("season_competitions").findOne({ seasonCompetitionId: scId });
      if (!sc) continue;
      const raw = await db.collection("league_fixtures")
        .find({ seasonCompetitionId: scId, published: true },
          { projection: { fixtureId: 1, round: 1, homeTeamId: 1, awayTeamId: 1, status: 1, result: 1, resultStatus: 1, matchEvents: 1 } })
        .toArray();
      const { totalsByMember } = aggregatePlayerStatsForSeason(
        raw.map((f) => ({ fixtureId: String(f.fixtureId), round: f.round, homeTeamId: String(f.homeTeamId ?? ""), awayTeamId: String(f.awayTeamId ?? ""), status: f.status, result: f.result, resultStatus: f.resultStatus, matchEvents: f.matchEvents })),
        Boolean(sc.resultApprovalRequired),
      );
      const goals = new Map([...totalsByMember.entries()].filter(([, t]) => t.goals > 0).map(([id, t]) => [id, t.goals]));
      if (!goals.has(memberKey)) continue; // only ranked once you've scored
      const r = rankInCompetition(memberKey, goals);
      if (r) ranks.push({ seasonCompetitionId: scId, competition: String(sc.displayName ?? sc.competitionName ?? sc.name ?? scId), ...r });
    }

    // Player of the match and other awards.
    const awards = await db.collection(COMPETITION_AWARDS_COLLECTION).find({ memberId: memberKey }, { projection: { awardType: 1, context: 1 } }).toArray();
    const awardCount = (t: string) => awards.filter((a) => a.awardType === t).length;

    // Representative selections and tournaments attended.
    const [nominations, entries] = await Promise.all([
      db.collection("rep_nominations").find({ $or: [{ memberId: memberKey }, { nomineeId: memberKey }, { playerId: memberKey }] }, { projection: { status: 1, nominationType: 1, season: 1, ageGroup: 1, memberId: 1, nomineeId: 1, playerId: 1 } }).limit(200).toArray(),
      db.collection("team_tournament_entries").find({ attendingMemberIds: memberKey, status: { $ne: "withdrawn" } }, { projection: { tournamentId: 1, attendingMemberIds: 1 } }).limit(200).toArray(),
    ]);
    const tIds = [...new Set(entries.map((e) => String(e.tournamentId)).filter(Boolean))];
    const tDocs = tIds.length ? await db.collection("rep_tournaments").find({ tournamentId: { $in: tIds } }, { projection: { tournamentId: 1, title: 1, season: 1 } }).toArray() : [];
    const tournaments = new Map(tDocs.map((t) => [String(t.tournamentId), { title: String(t.title ?? "Tournament"), season: String(t.season ?? "") }]));
    const repAppearances = buildRepAppearances(memberKey, nominations, entries, tournaments);

    const earliest = stats.bySeason.length ? stats.bySeason[stats.bySeason.length - 1].year : null;

    return NextResponse.json({
      ...stats,
      isPlayer: hasPlayerHistory(member, { gamesTotal: stats.allTime.games }),
      milestones: computeMilestones(stats.allTime.games),
      awards: { playerOfMatch: awardCount("player_of_match"), playerOfCompetition: awardCount("player_of_competition"), topGoalScorer: awardCount("top_goal_scorer") },
      competitionRanks: ranks,
      repAppearances,
      membership: membershipLength(member.membership?.joinDate, now, earliest),
      // Not tracked yet — the dashboard shows a placeholder until training/availability data exists.
      attendance: { tracked: false },
      availability: { tracked: false },
    });
  } catch (e) {
    console.error("my-stats error:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
