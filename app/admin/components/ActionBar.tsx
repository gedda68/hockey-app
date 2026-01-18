// app/admin/components/ActionBar.tsx

interface ActionBarProps {
  refreshing: boolean;
  rostersCount: number;
  onRefresh: () => void;
  onAddDivision: () => void;
  onBulkUpload: () => void;
}

export default function ActionBar({
  refreshing,
  rostersCount,
  onRefresh,
  onAddDivision,
  onBulkUpload,
}: ActionBarProps) {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-4 items-center flex-wrap">
          <button
            onClick={onAddDivision}
            className="px-6 py-3 bg-green-600 text-white rounded-full font-black uppercase text-sm hover:bg-green-700 transition-all"
          >
            + Add Division
          </button>

          <button
            onClick={onBulkUpload}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-black uppercase text-sm hover:bg-blue-700 transition-all"
          >
            📊 Bulk Upload
          </button>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="px-6 py-3 bg-slate-600 text-white rounded-full font-black uppercase text-sm hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
          </button>

          <div className="flex-1"></div>

          <div className="px-4 py-2 bg-blue-100 rounded-full">
            <span className="text-xs font-black uppercase text-blue-900">
              📊 {rostersCount} {rostersCount === 1 ? "division" : "divisions"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
