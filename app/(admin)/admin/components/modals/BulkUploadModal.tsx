// app/admin/components/modals/BulkUploadModal.tsx

import { useState } from "react";
import * as XLSX from "xlsx";
import { Roster } from "../../types";

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  currentSeason: string; // New prop to track target year
}

export default function BulkUploadModal({
  onClose,
  onSuccess,
  currentSeason,
}: BulkUploadModalProps) {
  const [uploading, setUploading] = useState(false);

  // Transform Excel rows into a Roster structure, injecting the currentSeason
  const transformExcelToRoster = (data: any[]): Partial<Roster>[] => {
    const grouped = data.reduce((acc: any, row: any) => {
      const ageGroup = row["Age Group"] || row["ageGroup"];
      if (!ageGroup) return acc;

      if (!acc[ageGroup]) {
        acc[ageGroup] = {
          teams: {},
          shadowPlayers: [],
          withdrawn: [],
          selectors: [],
        };
      }

      const teamName = row["Team Name"] || row["teamName"];
      if (teamName && !acc[ageGroup].teams[teamName]) {
        acc[ageGroup].teams[teamName] = { players: [], staff: {} };
      }

      if (row["Player Name"] || row["playerName"]) {
        acc[ageGroup].teams[teamName].players.push({
          name: row["Player Name"] || row["playerName"],
          club: row["Club"] || row["club"] || "",
          icon: row["Icon"] || row["icon"] || "",
        });
      }

      return acc;
    }, {});

    return Object.entries(grouped).map(([ageGroup, data]: [string, any]) => ({
      ageGroup,
      season: currentSeason, // CRITICAL: Assign the year from the dashboard state
      lastUpdated: new Date().toLocaleDateString("en-AU"),
      teams: Object.entries(data.teams).map(([name, team]: [string, any]) => ({
        name,
        players: team.players,
        staff: team.staff,
      })),
      shadowPlayers: data.shadowPlayers,
      withdrawn: data.withdrawn,
      selectors: data.selectors,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Pass the Excel data through our seasonal transformer
      const transformedData = transformExcelToRoster(jsonData);

      const response = await fetch("/api/admin/rosters/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
      });

      if (response.ok) {
        alert(`✅ Bulk upload successful for the ${currentSeason} season!`);
        onSuccess();
        onClose();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(
        `❌ Error: ${error instanceof Error ? error.message : "Upload failed"}`
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black uppercase text-[#06054e]">
            Bulk Upload
          </h2>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider">
            Season {currentSeason}
          </span>
        </div>

        <div className="mb-6">
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            Upload an Excel file to populate the{" "}
            <strong className="text-slate-900">{currentSeason}</strong> roster.
            The system will group rows by Age Group and Team Name.
          </p>

          <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">
              Required Columns
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["Age Group", "Team Name", "Player Name", "Club"].map((col) => (
                <div
                  key={col}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600"
                >
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  {col}
                </div>
              ))}
            </div>
          </div>

          <label className="block">
            <div
              className={`w-full px-4 py-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all ${
                uploading
                  ? "border-slate-200 bg-slate-50"
                  : "border-slate-300 hover:border-[#06054e] hover:bg-blue-50/30"
              }`}
            >
              {uploading ? (
                <div>
                  <div className="w-10 h-10 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm font-black text-[#06054e] uppercase tracking-tight">
                    Processing Data...
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">📁</div>
                  <p className="text-sm font-black text-slate-700 uppercase">
                    Drop file or click
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">
                    XLSX FORMAT ONLY
                  </p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <button
          onClick={onClose}
          disabled={uploading}
          className="w-full px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all"
        >
          Cancel Upload
        </button>
      </div>
    </div>
  );
}
