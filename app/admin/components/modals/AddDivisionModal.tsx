// app/admin/components/modals/AddDivisionModal.tsx

import { useState, useEffect } from "react";
import { Calendar, Tag, PlusCircle } from "lucide-react";

interface AddDivisionModalProps {
  onClose: () => void;
  onSubmit: (ageGroup: string, season: string) => void;
}

export default function AddDivisionModal({
  onClose,
  onSubmit,
}: AddDivisionModalProps) {
  const currentYear = new Date().getFullYear();

  const [ageGroup, setAgeGroup] = useState("");
  const [season, setSeason] = useState(currentYear.toString());
  const [existingAgeGroups, setExistingAgeGroups] = useState<string[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        // Use the new dedicated metadata endpoint
        const res = await fetch("/api/admin/metadata", { cache: "no-store" });

        if (!res.ok) throw new Error("Failed to load metadata");

        const data = await res.json();

        // Map the distinct age groups to the datalist state
        setExistingAgeGroups(data.ageGroups || []);
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      } finally {
        setLoadingGroups(false);
      }
    }
    fetchGroups();
  }, []);

  const availableYears = Array.from(
    { length: currentYear - 2000 + 5 }, // Added a few years into future
    (_, i) => (currentYear + 2 - i).toString()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ageGroup.trim() && season.trim()) {
      onSubmit(ageGroup.trim(), season.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-50 rounded-2xl text-green-700">
            <PlusCircle size={24} />
          </div>
          <h2 className="text-2xl font-black uppercase text-[#06054e]">
            New Roster
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
              <Tag size={12} />
              Age Group (Select or Type New)
            </label>
            <div className="relative">
              <input
                list="age-groups-list"
                type="text"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                placeholder={
                  loadingGroups ? "Loading..." : "e.g. Under 13 Boys"
                }
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#06054e] focus:bg-white focus:outline-none font-bold transition-all"
                required
                autoComplete="off"
              />
              {/* This is the magic part - the datalist */}
              <datalist id="age-groups-list">
                {existingAgeGroups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
            </div>
            <p className="mt-2 text-[10px] text-slate-400 italic ml-1">
              Select an existing group or type a new name.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">
              <Calendar size={12} />
              Season Year
            </label>
            <div className="relative">
              <input
                list="years-list"
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#06054e] focus:bg-white focus:outline-none font-bold transition-all"
                required
              />
              <datalist id="years-list">
                {availableYears.map((year) => (
                  <option key={year} value={year} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!ageGroup.trim() || !season.trim()}
              className="flex-1 px-6 py-4 bg-[#06054e] text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-blue-900/20 hover:bg-black transition-all disabled:opacity-50"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
