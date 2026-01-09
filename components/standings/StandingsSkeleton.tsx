export default function StandingsSkeleton() {
  return (
    <div className="sticky top-8 bg-[#06054e] rounded-3xl p-6 shadow-2xl text-white">
      <div className="flex justify-between items-center mb-6">
        <div className="h-5 w-24 bg-white/20 rounded animate-pulse"></div>
      </div>

      <div className="space-y-1">
        {/* Table Header */}
        <div className="grid grid-cols-12 items-center px-2 pb-2 border-b border-white/20">
          <div className="col-span-1 h-2 w-4 bg-white/10 rounded animate-pulse"></div>
          <div className="col-span-5 h-2 w-16 bg-white/10 rounded animate-pulse"></div>
          <div className="col-span-2 h-2 w-4 bg-white/10 rounded animate-pulse mx-auto"></div>
          <div className="col-span-2 h-2 w-6 bg-white/10 rounded animate-pulse mx-auto"></div>
          <div className="col-span-2 h-2 w-6 bg-white/10 rounded animate-pulse ml-auto"></div>
        </div>

        {/* Team Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 items-center bg-white/5 p-2 rounded-lg animate-pulse"
          >
            <div className="col-span-1 h-3 w-4 bg-white/10 rounded"></div>
            <div className="col-span-5 flex items-center gap-2">
              <div className="w-4 h-4 bg-white/10 rounded-full shrink-0"></div>
              <div className="h-2 w-20 bg-white/10 rounded"></div>
            </div>
            <div className="col-span-2 h-3 w-6 bg-white/10 rounded mx-auto"></div>
            <div className="col-span-2 h-3 w-8 bg-white/10 rounded mx-auto"></div>
            <div className="col-span-2 h-3 w-6 bg-white/10 rounded ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
