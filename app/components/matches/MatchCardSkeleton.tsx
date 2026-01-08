export default function MatchCardSkeleton() {
  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm border-2 border-transparent animate-pulse">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* MATCH META (Left) */}
        <div className="flex flex-col items-center md:items-start min-w-[120px] gap-2">
          <div className="h-3 w-16 bg-slate-200 rounded"></div>
          <div className="h-2 w-12 bg-slate-200 rounded"></div>
        </div>

        {/* TEAMS & SCORE (Center) */}
        <div className="flex-1 flex items-center justify-center gap-4 md:gap-12 w-full">
          {/* Home Team */}
          <div className="flex flex-1 items-center justify-end gap-4">
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
            <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0"></div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            <div className="h-12 w-24 bg-slate-200 rounded"></div>
          </div>

          {/* Away Team */}
          <div className="flex flex-1 items-center justify-start gap-4">
            <div className="w-12 h-12 bg-slate-200 rounded-full shrink-0"></div>
            <div className="h-4 w-24 bg-slate-200 rounded"></div>
          </div>
        </div>

        {/* ACTION (Right) */}
        <div className="hidden md:flex flex-col items-end min-w-[100px]">
          <div className="h-8 w-20 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
