import Link from "next/link";
import FilterButton from "@/components/shared/FilterButton";
import PageHeader from "@/components/shared/PageHeader";
import MatchList from "@/components/matches/MatchList";
import {
  filterMatches,
  getSeasonCompetitionOptions,
  getRoundsForSeasonCompetition,
} from "@/lib/data";
import type { Match } from "@/types";

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

export default async function ThisRoundPage({
  searchParams,
}: {
  searchParams: Promise<{
    seasonCompetitionId?: string;
    round?: string;
    mode?: "week" | "round";
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

  const matches = mode === "week" ? matchesThisWeek : matchesThisRound;

  const buildUrl = (patch: Record<string, string>) => {
    const sp = new URLSearchParams({
      seasonCompetitionId: selectedSeasonCompetitionId,
      round: selectedRound,
      mode,
      ...patch,
    });
    // Remove empty/defaults
    if (!sp.get("round") || sp.get("round") === "All") sp.delete("round");
    if (!sp.get("mode") || sp.get("mode") === "week") sp.delete("mode");
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

      <div className="max-w-5xl">
        {matches.length > 0 ? (
          <MatchList matches={matches} isUpcoming={mode === "week"} />
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
    </div>
  );
}

