// app/admin/components/modals/BulkUploadModal.tsx

import { useState } from "react";
import * as XLSX from "xlsx";
import { Roster } from "../../types";

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({
  onClose,
  onSuccess,
}: BulkUploadModalProps) {
  const [uploading, setUploading] = useState(false);

  const transformExcelToRoster = (data: any[]): Partial<Roster>[] => {
    const grouped = data.reduce((acc: any, row: any) => {
      const ageGroup = row["Age Group"] || row["ageGroup"];
      if (!acc[ageGroup]) {
        acc[ageGroup] = { teams: {}, shadowPlayers: [], withdrawn: [] };
      }

      const teamName = row["Team Name"] || row["teamName"];
      if (!acc[ageGroup].teams[teamName]) {
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
      lastUpdated: new Date().toLocaleDateString("en-AU"),
      teams: Object.entries(data.teams).map(([name, team]: [string, any]) => ({
        name,
        players: team.players,
        staff: team.staff,
      })),
      shadowPlayers: data.shadowPlayers,
      withdrawn: data.withdrawn,
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

      const transformedData = transformExcelToRoster(jsonData);

      const response = await fetch("/api/admin/rosters/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedData),
      });

      if (response.ok) {
        alert("✅ Bulk upload successful!");
        onSuccess();
        onClose();
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Failed to upload file. Check console for details.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6">
          Bulk Upload
        </h2>

        <div className="mb-6">
          <p className="text-sm text-slate-600 mb-4">
            Upload an Excel file (.xlsx) with your roster data. The file should
            have these columns:
          </p>
          <ul className="text-xs text-slate-500 space-y-1 mb-4">
            <li>• Age Group</li>
            <li>• Team Name</li>
            <li>• Player Name</li>
            <li>• Club (optional)</li>
            <li>• Icon (optional)</li>
          </ul>

          <label className="block">
            <div className="w-full px-4 py-8 border-2 border-dashed border-slate-300 rounded-xl text-center cursor-pointer hover:border-[#06054e] hover:bg-slate-50 transition-all">
              {uploading ? (
                <div>
                  <div className="w-8 h-8 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm font-bold text-slate-600">
                    Uploading...
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl mb-2">📊</p>
                  <p className="text-sm font-bold text-slate-600">
                    Click to select file
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    .xlsx files only
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
          className="w-full px-6 py-3 bg-slate-200 text-slate-900 rounded-full font-black uppercase hover:bg-slate-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
