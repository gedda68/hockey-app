import Link from "next/link";
import FilterButton from "@/components/shared/FilterButton";
import PageHeader from "@/components/shared/PageHeader";
import MatchList from "@/components/matches/MatchList";
import SpoilerFreeMatchList from "@/components/matches/SpoilerFreeMatchList";
import StandingsTable from "@/components/standings/StandingsTable";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { getMyTeamIdsForSession } from "@/lib/data/myFixtures";
import {
  filterMatches,
  getSeasonCompetitionOptions,
  getRoundsForSeasonCompetition,
} from "@/lib/data";
import type { Match } from "@/types";
import { getLiveStandingsDivision } from "@/lib/data/liveStandings";

export const dynamic = "force-dynamic";

function startOfIsoWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // back to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfIsoWeek(d: Date): Date {
  const start = startOfIsoWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

function parseMatchTime(m: Match): number {
  const t = new Date(m.dateTime).getTime();
  return Number.isFinite(t) ? t : 0;
}

function pickDefaultRound(matches: Match[], now: Date): string {
  const nowMs = now.getTime();
  const upcoming = matches
    .filter((m) => {
      const t = parseMatchTime(m);
      // "Scheduled" is the primary signal, but date alone is a good fallback.
      return m.status === "Scheduled" || t >= nowMs - 6 * 60 * 60 * 1000;
    })
    .sort((a, b) => parseMatchTime(a) - parseMatchTime(b));

  if (upcoming.length > 0) return String(upcoming[0].round ?? "All");

  const completed = matches
    .filter((m) => String(m.status).startsWith("Final") || m.status === "Live")
    .sort((a, b) => parseMatchTime(b) - parseMatchTime(a));

  if (completed.length > 0) return String(completed[0].round ?? "All");
  return "All";
}

type FixtureMeta = {
  match: Match;
  homeTeamId?: string;
  awayTeamId?: string;
  homeClubId?: string;
  awayClubId?: string;
};

async function loadFixturesMeta(seasonCompetitionId: string): Promise<{
  fixtures: FixtureMeta[];
  clubLabelById: Map<string, string>;
  teamLabelById: Map<string, string>;
}> {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const raw = await db
    .collection("league_fixtures")
    .find(
      { seasonCompetitionId, published: true },
      {
        projection: {
          fixtureId: 1,
          seasonCompetitionId: 1,
          competitionId: 1,
          round: 1,
          status: 1,
          homeTeamId: 1,
          awayTeamId: 1,
          scheduledStart: 1,
          venueName: 1,
          result: 1,
          resultStatus: 1,
        },
      },
    )
    .sort({ round: 1, scheduledStart: 1, fixtureId: 1 })
    .toArray();

  const teamIds = new Set<string>();
  for (const f of raw) {
    if (typeof f.homeTeamId === "string" && f.homeTeamId) teamIds.add(f.homeTeamId);
    if (typeof f.awayTeamId === "string" && f.awayTeamId) teamIds.add(f.awayTeamId);
  }

  const teams =
    teamIds.size > 0
      ? await db
          .collection("teams")
          .find({ teamId: { $in: [...teamIds] } })
          .project({ teamId: 1, name: 1, clubId: 1 })
          .toArray()
      : [];

  const teamLabelById = new Map<string, string>();
  const clubIdByTeam = new Map<string, string>();
  for (const t of teams) {
    const tid = typeof t.teamId === "string" ? t.teamId : "";
    if (!tid) continue;
    teamLabelById.set(tid, String(t.name ?? tid));
    if (t.clubId) clubIdByTeam.set(tid, String(t.clubId));
  }

  const clubIds = new Set<string>();
  for (const cid of clubIdByTeam.values()) if (cid) clubIds.add(cid);

  const clubs =
    clubIds.size > 0
      ? await db
          .collection("clubs")
          .find({ id: { $in: [...clubIds] } })
          .project({ id: 1, name: 1, shortName: 1 })
          .toArray()
      : [];

  const clubLabelById = new Map<string, string>();
  for (const c of clubs) {
    const id = typeof c.id === "string" ? c.id : "";
    if (!id) continue;
    const label = String(c.shortName ?? c.name ?? id).trim() || id;
    clubLabelById.set(id, label);
  }

  const fixtures: FixtureMeta[] = raw.map((f) => {
    const homeTeamId = typeof f.homeTeamId === "string" ? f.homeTeamId : undefined;
    const awayTeamId = typeof f.awayTeamId === "string" ? f.awayTeamId : undefined;
    const homeClubId = homeTeamId ? clubIdByTeam.get(homeTeamId) : undefined;
    const awayClubId = awayTeamId ? clubIdByTeam.get(awayTeamId) : undefined;
    const matchId = String(f.fixtureId ?? "");
    const scheduled = typeof f.scheduledStart === "string" ? f.scheduledStart : new Date().toISOString();

    // Use the existing normalization already inside lib/data/matches via filterMatches mapping,
    // but for filtering we only need stable ids here; the displayed cards use `match`.
    const match: Match = {
      matchId,
      seasonCompetitionId: String(f.seasonCompetitionId ?? seasonCompetitionId),
      division: String(f.competitionId ?? "Competition"),
      round: f.round ?? "",
      status: String(f.status ?? "Scheduled"),
      homeTeam: homeTeamId ? (teamLabelById.get(homeTeamId) ?? homeTeamId) : "Home",
      awayTeam: awayTeamId ? (teamLabelById.get(awayTeamId) ?? awayTeamId) : "Away",
      dateTime: scheduled,
      location: typeof f.venueName === "string" ? f.venueName : undefined,
    };

    return { match, homeTeamId, awayTeamId, homeClubId, awayClubId };
  });

  return { fixtures, clubLabelById, teamLabelById };
}

export default async function ThisRoundPage({
  searchParams,
}: {
  searchParams: Promise<{
    seasonCompetitionId?: string;
    round?: string;
    mode?: "week" | "round";
    clubId?: string;
    teamId?: string;
    my?: "1";
    spoiler?: "1";
  }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "round" ? "round" : "week";

  const seasonCompetitions = await getSeasonCompetitionOptions();
  const selectedSeasonCompetitionId =
    params.seasonCompetitionId ||
    seasonCompetitions[0]?.seasonCompetitionId ||
    "";

  const rounds = selectedSeasonCompetitionId
    ? await getRoundsForSeasonCompetition(selectedSeasonCompetitionId)
    : ["All"];

  const session = await getSession();

  const selectedClubId = (params.clubId ?? "").trim();
  const selectedTeamId = (params.teamId ?? "").trim();
  const myOnly = params.my === "1";

  const { fixtures: fixturesMeta, clubLabelById, teamLabelById } =
    selectedSeasonCompetitionId
      ? await loadFixturesMeta(selectedSeasonCompetitionId)
      : { fixtures: [] as FixtureMeta[], clubLabelById: new Map(), teamLabelById: new Map() };

  const myTeamIds = session
    ? await getMyTeamIdsForSession({
        userId: session.userId,
        memberId: session.memberId ?? null,
        scopedRoles: session.scopedRoles ?? [],
      })
    : [];

  const standings = selectedSeasonCompetitionId
    ? await getLiveStandingsDivision(selectedSeasonCompetitionId)
    : null;
  const selectedMeta = seasonCompetitions.find(
    (s) => s.seasonCompetitionId === selectedSeasonCompetitionId,
  );

  const clubIdsInCompetition = Array.from(
    new Set(
      fixturesMeta
        .flatMap((f) => [f.homeClubId, f.awayClubId])
        .filter((x): x is string => Boolean(x)),
    ),
  ).sort((a, b) =>
    (clubLabelById.get(a) ?? a).localeCompare(clubLabelById.get(b) ?? b),
  );

  const teamIdsInCompetition = Array.from(
    new Set(
      fixturesMeta
        .flatMap((f) => [f.homeTeamId, f.awayTeamId])
        .filter((x): x is string => Boolean(x)),
    ),
  ).sort((a, b) =>
    (teamLabelById.get(a) ?? a).localeCompare(teamLabelById.get(b) ?? b),
  );

  const filteredMetaByClubTeam = fixturesMeta.filter((f) => {
    if (myOnly) {
      const hit =
        (f.homeTeamId && myTeamIds.includes(f.homeTeamId)) ||
        (f.awayTeamId && myTeamIds.includes(f.awayTeamId));
      if (!hit) return false;
    }
    if (selectedTeamId) {
      return f.homeTeamId === selectedTeamId || f.awayTeamId === selectedTeamId;
    }
    if (selectedClubId) {
      return f.homeClubId === selectedClubId || f.awayClubId === selectedClubId;
    }
    return true;
  });

  const allMatches = selectedSeasonCompetitionId
    ? ((await filterMatches({
        seasonCompetitionId: selectedSeasonCompetitionId,
      })) as Match[])
    : [];

  const now = new Date();
  const defaultRound = pickDefaultRound(allMatches, now);
  const selectedRound = params.round || defaultRound || "All";

  const weekStart = startOfIsoWeek(now);
  const weekEnd = endOfIsoWeek(now);

  const matchesThisWeek = allMatches
    .filter((m) => {
      const t = parseMatchTime(m);
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    })
    .sort((a, b) => parseMatchTime(a) - parseMatchTime(b));

  const matchesThisRound = selectedSeasonCompetitionId
    ? ((await filterMatches({
        seasonCompetitionId: selectedSeasonCompetitionId,
        round: selectedRound,
      })) as Match[])
    : [];

  const baseMatches = mode === "week" ? matchesThisWeek : matchesThisRound;

  // Apply club/team/my filters by using fixture ids. (Match.matchId === fixtureId)
  const allowed = new Set(filteredMetaByClubTeam.map((f) => f.match.matchId));
  const matches = (selectedClubId || selectedTeamId || myOnly)
    ? baseMatches.filter((m) => allowed.has(m.matchId))
    : baseMatches;

  const buildUrl = (patch: Record<string, string>) => {
    const sp = new URLSearchParams({
      seasonCompetitionId: selectedSeasonCompetitionId,
      round: selectedRound,
      mode,
      ...(selectedClubId ? { clubId: selectedClubId } : {}),
      ...(selectedTeamId ? { teamId: selectedTeamId } : {}),
      ...(myOnly ? { my: "1" } : {}),
      ...(params.spoiler === "1" ? { spoiler: "1" } : {}),
      ...patch,
    });
    // Remove empty/defaults
    if (!sp.get("round") || sp.get("round") === "All") sp.delete("round");
    if (!sp.get("mode") || sp.get("mode") === "week") sp.delete("mode");
    if (!sp.get("clubId")) sp.delete("clubId");
    if (!sp.get("teamId")) sp.delete("teamId");
    if (!sp.get("my")) sp.delete("my");
    if (!sp.get("spoiler")) sp.delete("spoiler");
    return `/competitions/this-round?${sp.toString()}`;
  };

  const modeToggle = (
    <>
      <Link
        href={buildUrl({ mode: "week" })}
        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
          mode === "week"
            ? "bg-red-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-100"
        }`}
      >
        This week
      </Link>
      <Link
        href={buildUrl({ mode: "round" })}
        className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${
          mode === "round"
            ? "bg-red-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-100"
        }`}
      >
        This round
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 md:px-8 lg:px-12 w-full">
      <div className="flex justify-between items-center mb-8">
        <Link
          href="/competitions"
          className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group"
        >
          <span className="transition-transform group-hover:-translate-x-1">
            ←
          </span>{" "}
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col mb-10 border-b-4 border-[#06054e] pb-6">
        <PageHeader title="Match Day" highlight="Central" actions={modeToggle} />

        <div className="mt-6 flex flex-wrap gap-x-12 gap-y-6">
          {/* Competition */}
          {seasonCompetitions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                Competition
              </span>
              <div className="flex gap-2 flex-wrap">
                {seasonCompetitions.map((sc) => (
                  <FilterButton
                    key={sc.seasonCompetitionId}
                    href={`/competitions/this-round?seasonCompetitionId=${encodeURIComponent(
                      sc.seasonCompetitionId,
                    )}`}
                    isActive={selectedSeasonCompetitionId === sc.seasonCompetitionId}
                    variant="primary"
                  >
                    {sc.label}
                  </FilterButton>
                ))}
              </div>
            </div>
          )}

          {/* Round selector (always available; mainly used for "This round") */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Round
            </span>
            <div className="flex gap-2 flex-wrap">
              {rounds
                .filter((r) => r !== "All")
                .map((r) => (
                  <FilterButton
                    key={r}
                    href={buildUrl({ round: r, mode: "round" })}
                    isActive={selectedRound === r && mode === "round"}
                    variant="primary"
                  >
                    {r}
                  </FilterButton>
                ))}
            </div>
          </div>

          {/* My shortcuts + Club filter */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              Club / teams
            </span>
            <div className="flex gap-2 flex-wrap">
              <FilterButton
                href={buildUrl({ clubId: "", teamId: "", my: "" })}
                isActive={!selectedClubId && !selectedTeamId && !myOnly}
                variant="primary"
              >
                All
              </FilterButton>
              {session?.clubId ? (
                <FilterButton
                  href={buildUrl({ clubId: String(session.clubId), teamId: "", my: "" })}
                  isActive={selectedClubId === String(session.clubId) && !selectedTeamId && !myOnly}
                  variant="primary"
                >
                  My club
                </FilterButton>
              ) : null}
              {myTeamIds.length > 0 ? (
                <FilterButton
                  href={buildUrl({ my: "1", clubId: "", teamId: "" })}
                  isActive={myOnly}
                  variant="primary"
                >
                  My teams
                </FilterButton>
              ) : null}
              {clubIdsInCompetition.slice(0, 12).map((cid) => (
                <FilterButton
                  key={cid}
                  href={buildUrl({ clubId: cid, teamId: "", my: "" })}
                  isActive={selectedClubId === cid && !selectedTeamId && !myOnly}
                  variant="primary"
                >
                  {clubLabelById.get(cid) ?? cid}
                </FilterButton>
              ))}
            </div>

            {/* Team filter (only when a club is selected) */}
            {selectedClubId ? (
              <div className="mt-2 flex gap-2 flex-wrap">
                {teamIdsInCompetition
                  .filter((tid) => {
                    const clubId =
                      fixturesMeta.find(
                        (f) => f.homeTeamId === tid || f.awayTeamId === tid,
                      )?.homeClubId ?? undefined;
                    // Slightly approximate; we only show teams that appear with the selected club.
                    return (
                      fixturesMeta.some(
                        (f) =>
                          (f.homeTeamId === tid && f.homeClubId === selectedClubId) ||
                          (f.awayTeamId === tid && f.awayClubId === selectedClubId),
                      )
                    );
                  })
                  .slice(0, 14)
                  .map((tid) => (
                    <FilterButton
                      key={tid}
                      href={buildUrl({ teamId: tid, my: "", mode: "week" })}
                      isActive={selectedTeamId === tid}
                      variant="secondary"
                    >
                      {teamLabelById.get(tid) ?? tid}
                    </FilterButton>
                  ))}
              </div>
            ) : null}
          </div>
        </div>

        {mode === "week" ? (
          <p className="mt-6 text-xs text-white/60">
            Showing fixtures from{" "}
            <span className="font-bold text-white/80">
              {weekStart.toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>{" "}
            to{" "}
            <span className="font-bold text-white/80">
              {new Date(weekEnd.getTime() - 1).toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            .
          </p>
        ) : (
          <p className="mt-6 text-xs text-white/60">
            Showing fixtures for{" "}
            <span className="font-bold text-white/80">Round {selectedRound}</span>.
          </p>
        )}
      </div>

      <div className="max-w-5xl grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8">
        {matches.length > 0 ? (
          <SpoilerFreeMatchList
            matches={matches}
            isUpcoming={mode === "week"}
            defaultSpoilerFree={params.spoiler === "1"}
          />
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-500">
            <p className="text-sm">
              {mode === "week"
                ? "No fixtures scheduled for this week."
                : "No fixtures found for this round."}
            </p>
            <p className="text-xs mt-2">
              Try switching to {mode === "week" ? "This round" : "This week"} or pick another round.
            </p>
          </div>
        )}
        </div>

        <div className="xl:col-span-4">
          <StandingsTable
            division={standings}
            selectedDiv={selectedMeta?.label ?? "Standings"}
            availableYears={selectedMeta?.season ? [selectedMeta.season] : []}
            currentYear={selectedMeta?.season ?? ""}
            showYearFilter={false}
          />
        </div>
      </div>
    </div>
  );
}

