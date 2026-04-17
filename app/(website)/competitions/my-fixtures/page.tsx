import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import MatchList from "@/components/matches/MatchList";
import {
  getMyRecentFixtures,
  getMyTeamIdsForSession,
  getMyUpcomingFixtures,
} from "@/lib/data/myFixtures";

export const dynamic = "force-dynamic";

export default async function MyFixturesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const scopeClubId = typeof sp.clubId === "string" ? sp.clubId.trim() : "";

  const session = await getSession();
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 py-10 md:px-8">
        <div className="mx-auto max-w-4xl text-white">
          <Link
            href="/competitions/this-round"
            className="inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
          >
            ← Back to match day
          </Link>
          <h1 className="mt-6 text-2xl font-black uppercase italic tracking-tight">
            My fixtures
          </h1>
          <p className="mt-3 text-sm text-white/70">
            Sign in to see upcoming fixtures and recent results for your assigned teams.
          </p>
        </div>
      </div>
    );
  }

  const teamIds = await getMyTeamIdsForSession({
    userId: session.userId,
    memberId: session.memberId ?? null,
    scopedRoles: session.scopedRoles ?? [],
    scope: scopeClubId ? { clubId: scopeClubId } : undefined,
  });

  const [upcoming, recent] = await Promise.all([
    getMyUpcomingFixtures({ teamIds, limit: 20 }),
    getMyRecentFixtures({ teamIds, limit: 12 }),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 px-4 py-10 md:px-8">
      <div className="mx-auto max-w-4xl text-white">
        <div className="flex items-end justify-between gap-4">
          <Link
            href="/competitions/this-round"
            className="inline-flex text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
          >
            ← Back to match day
          </Link>
          {scopeClubId ? (
            <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/70">
              Club filtered
            </span>
          ) : null}
        </div>

        <h1 className="mt-6 text-3xl font-black uppercase italic tracking-tight">
          My fixtures
        </h1>
        <p className="mt-2 text-sm text-white/70">
          Upcoming fixtures and recent results for your teams. Each card links to the match centre.
        </p>

        <section className="mt-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
            Upcoming
          </h2>
          <div className="mt-4">
            {upcoming.length > 0 ? (
              <MatchList matches={upcoming} isUpcoming={true} />
            ) : (
              <p className="text-sm text-white/60">No upcoming fixtures found.</p>
            )}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">
            Recent
          </h2>
          <div className="mt-4">
            {recent.length > 0 ? (
              <MatchList matches={recent} isUpcoming={false} />
            ) : (
              <p className="text-sm text-white/60">No recent results found.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

