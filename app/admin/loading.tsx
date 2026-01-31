export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg font-bold text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
