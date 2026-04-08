// app/admin/components/clubs/ClubChangeLogModal.tsx
// View club change history

"use client";

import { useState, useEffect } from "react";

interface ClubChange {
  id: string;
  clubId: string;
  clubName: string;
  changeType: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  changes?: any[];
  oldValues?: any;
  newValues?: any;
  reason?: string;
}

interface ClubChangeLogModalProps {
  clubId: string;
  clubName: string;
  onClose: () => void;
}

export default function ClubChangeLogModal({
  clubId,
  clubName,
  onClose,
}: ClubChangeLogModalProps) {
  const [changes, setChanges] = useState<ClubChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChanges();
  }, [clubId]);

  const fetchChanges = async () => {
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/changelog`);
      if (response.ok) {
        const data = await response.json();
        setChanges(data);
      }
    } catch (error) {
      console.error("Error fetching change log:", error);
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case "created":
        return "✨";
      case "updated":
        return "✏️";
      case "deactivated":
        return "⏸️";
      case "reactivated":
        return "▶️";
      case "deleted":
        return "🗑️";
      default:
        return "📝";
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "created":
        return "bg-green-100 text-green-700 border-green-300";
      case "updated":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "deactivated":
        return "bg-red-100 text-red-700 border-red-300";
      case "reactivated":
        return "bg-green-100 text-green-700 border-green-300";
      case "deleted":
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-black uppercase text-[#06054e]">
            Change History
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {clubName} - All Changes
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading change history...</p>
            </div>
          ) : changes.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl font-bold text-slate-400">
                No changes recorded
              </p>
              <p className="text-sm text-slate-500 mt-2">
                This club has no change history yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {changes.map((change) => (
                <div
                  key={change.id}
                  className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Change Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {getChangeTypeIcon(change.changeType)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase border-2 ${getChangeTypeColor(
                              change.changeType
                            )}`}
                          >
                            {change.changeType}
                          </span>
                          <span className="text-sm text-slate-600">
                            {new Date(change.timestamp).toLocaleString("en-AU")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          by {change.userName || change.userId || "System"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  {change.reason && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                      <p className="text-sm font-bold text-slate-700">
                        Reason:
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {change.reason}
                      </p>
                    </div>
                  )}

                  {/* Changes Detail */}
                  {change.changes && change.changes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-700">
                        Changes:
                      </p>
                      <div className="space-y-2">
                        {change.changes.map((detail: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-xl">
                            <p className="text-xs font-bold text-slate-700 uppercase mb-2">
                              {detail.displayName || detail.field}
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">
                                  Old Value:
                                </p>
                                <p className="text-slate-900 font-mono text-xs bg-white p-2 rounded border border-slate-200">
                                  {formatValue(detail.oldValue)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">
                                  New Value:
                                </p>
                                <p className="text-slate-900 font-mono text-xs bg-white p-2 rounded border border-slate-200">
                                  {formatValue(detail.newValue)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-slate-200 text-slate-900 rounded-full font-black uppercase hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
