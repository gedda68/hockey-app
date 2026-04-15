import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicTenantForServerPage } from "@/lib/tenant/serverTenant";
import { getPublicMatchCentreById } from "@/lib/data/matches";
import MatchCentreTabs from "@/components/matches/MatchCentreTabs";

export const dynamic = "force-dynamic";

export default async function MatchCentrePage({
  params,
  searchParams,
}: {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { matchId } = await params;
  const sp = await searchParams;
  const tenant = await getPublicTenantForServerPage(sp);
  const centre = await getPublicMatchCentreById(matchId, tenant);
  if (!centre) notFound();
  const match = centre.match;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/competitions/matches"
          className="inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          ← Back to fixtures & results
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black uppercase italic tracking-tight">
                Match centre
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Round {match.round} · {match.division}
              </p>
              <p className="mt-1 text-sm text-white/70">
                {new Date(match.dateTime).toLocaleString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {match.location ? ` · ${match.location}` : ""}
              </p>
            </div>

            <div className="mt-3 sm:mt-0">
              <span className="inline-flex rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[11px] font-black">
                {match.status}
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-center">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] font-black uppercase text-white/60">
                Home
              </p>
              <p className="mt-1 text-lg font-black">{match.homeTeam}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <p className="text-4xl font-black italic tracking-tight">
                {match.homeScore ?? "-"}:{match.awayScore ?? "-"}
              </p>
              {match.status === "Final (SO)" &&
              match.homeShootOutScore != null &&
              match.awayShootOutScore != null ? (
                <p className="mt-2 text-[11px] font-black text-yellow-200">
                  Shootout {match.homeShootOutScore}-{match.awayShootOutScore}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-right">
              <p className="text-[11px] font-black uppercase text-white/60">
                Away
              </p>
              <p className="mt-1 text-lg font-black">{match.awayTeam}</p>
            </div>
          </div>

          <MatchCentreTabs
            match={match}
            teamNameById={centre.teamNameById}
            venue={centre.venue}
            umpires={centre.umpires}
          />
        </div>
      </div>
    </div>
  );
}

