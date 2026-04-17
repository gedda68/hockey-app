import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import MatchList from "@/components/matches/MatchList";
import { getMyTeamIdsForSession, getMyUpcomingFixtures, type MyTeamsScope } from "@/lib/data/myFixtures";

export default async function MyFixturesStrip({
  scope,
  limit = 6,
  title = "My fixtures",
}: {
  scope?: MyTeamsScope;
  limit?: number;
  title?: string;
}) {
  const session = await getSession();
  if (!session) return null;

  const teamIds = await getMyTeamIdsForSession({
    userId: session.userId,
    memberId: session.memberId ?? null,
    scopedRoles: session.scopedRoles ?? [],
    scope,
  });
  if (teamIds.length === 0) return null;

  const matches = await getMyUpcomingFixtures({ teamIds, limit });
  if (matches.length === 0) return null;

  const matchDayQs = new URLSearchParams();
  if (scope?.clubId) matchDayQs.set("clubId", scope.clubId);
  const matchDayHref =
    matchDayQs.toString().length > 0
      ? `/competitions/this-round?${matchDayQs.toString()}`
      : "/competitions/this-round";

  return (
    <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
          {title}
        </h2>
        <Link
          href={matchDayHref}
          className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
        >
          Match day →
        </Link>
      </div>
      <div className="mt-4">
        <MatchList matches={matches} isUpcoming={true} />
      </div>
    </section>
  );
}

