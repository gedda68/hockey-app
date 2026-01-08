import Link from "next/link";

export default function StatisticsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 w-full font-sans text-slate-900">
      {/* Back Button */}
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

      {/* Header Skeleton */}
      <div className="flex flex-col mb-10 border-b-4 border-[#06054e] pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="h-10 w-64 bg-slate-200 rounded animate-pulse"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          {/* Season Filter */}
          <div className="flex flex-col gap-2">
            <div className="h-2 w-12 bg-slate-200 rounded animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Division Filter */}
          <div className="flex flex-col gap-2">
            <div className="h-2 w-16 bg-slate-200 rounded animate-pulse"></div>
            <div className="flex gap-2 flex-wrap">
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-2">
            <div className="h-2 w-20 bg-slate-200 rounded animate-pulse"></div>
            <div className="flex gap-2 flex-wrap">
              <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse"></div>
              <div className="h-8 w-24 bg-slate-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards Skeleton */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-6 shadow-lg animate-pulse"
            >
              <div className="h-2 w-20 bg-slate-200 rounded mb-4"></div>
              <div className="h-8 w-16 bg-slate-200 rounded mb-2"></div>
              <div className="h-2 w-24 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-6 shadow-lg animate-pulse"
            >
              <div className="h-4 w-32 bg-slate-200 rounded mb-6"></div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-4">
                    <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
                    <div className="flex-1 h-4 bg-slate-200 rounded"></div>
                    <div className="w-12 h-4 bg-slate-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
