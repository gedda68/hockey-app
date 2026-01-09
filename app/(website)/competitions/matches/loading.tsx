import Link from "next/link";
import MatchListSkeleton from "../../../../components/matches/MatchListSkeleton";
import StandingsSkeleton from "../../../../components/standings/StandingsSkeleton";

export default function MatchesLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 w-full font-sans text-slate-900">
      {/* Header */}
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
        <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse"></div>
      </div>

      {/* Title Section */}
      <div className="flex flex-col mb-10 border-b-4 border-[#06054e] pb-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="h-10 w-64 bg-slate-200 rounded animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-slate-200 rounded-full animate-pulse"></div>
            <div className="h-10 w-24 bg-slate-200 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-wrap gap-x-12 gap-y-6">
          {/* Season Filter */}
          <div className="flex flex-col gap-2">
            <div className="h-2 w-12 bg-slate-200 rounded animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-2">
            <div className="h-2 w-20 bg-slate-200 rounded animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Division Filter */}
          <div className="flex flex-col gap-2">
            <div className="h-2 w-16 bg-slate-200 rounded animate-pulse"></div>
            <div className="flex gap-2 flex-wrap">
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-20 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-8">
          <MatchListSkeleton count={5} />
        </div>

        <div className="xl:col-span-4">
          <StandingsSkeleton />
        </div>
      </div>
    </div>
  );
}
