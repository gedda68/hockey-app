// sections/TournamentHistorySection.tsx
// Read-only tournament nomination history for a player

"use client";

import { BaseSectionProps, TournamentHistoryEntry } from "../types/player.types";
import { Trophy, Calendar, MapPin, Info, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: TournamentHistoryEntry["nominationStatus"] }) {
  const styles: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700 border-amber-200",
    accepted:  "bg-green-100 text-green-700 border-green-200",
    played:    "bg-blue-100 text-blue-700 border-blue-200",
    withdrawn: "bg-slate-100 text-slate-600 border-slate-200",
    rejected:  "bg-red-100 text-red-700 border-red-200",
  };
  const icons: Record<string, JSX.Element> = {
    pending:   <Clock size={10} />,
    accepted:  <CheckCircle size={10} />,
    played:    <Trophy size={10} />,
    withdrawn: <XCircle size={10} />,
    rejected:  <XCircle size={10} />,
  };
  const labels: Record<string, string> = {
    pending:   "Pending",
    accepted:  "Accepted",
    played:    "Played",
    withdrawn: "Withdrawn",
    rejected:  "Rejected",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${styles[status] ?? styles.pending}`}>
      {icons[status] ?? null}
      {labels[status] ?? status}
    </span>
  );
}

export default function TournamentHistorySection({ formData }: BaseSectionProps) {
  const history: TournamentHistoryEntry[] = formData.tournamentHistory ?? [];

  const totalNominations = history.length;
  const acceptedCount = history.filter(
    (e) => e.nominationStatus === "accepted" || e.nominationStatus === "played",
  ).length;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 font-semibold">
          Tournament history is automatically recorded when a player is nominated
          through the nomination workflow. Records are read-only here.
        </p>
      </div>

      {/* Summary row */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#06054e]/5 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-[#06054e]">{totalNominations}</p>
            <p className="text-xs font-black uppercase text-slate-500 mt-1">
              Total Nominations
            </p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-green-600">{acceptedCount}</p>
            <p className="text-xs font-black uppercase text-slate-500 mt-1">
              Accepted / Played
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Trophy size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 font-black uppercase text-sm">
            No tournament nominations recorded yet.
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Use the Nominate button on the Players list to submit nominations.
          </p>
        </div>
      )}

      {/* History cards */}
      {history.length > 0 && (
        <div className="space-y-3">
          {[...history]
            .sort((a, b) => {
              // Sort descending by season then nominatedDate
              if (b.season !== a.season) return b.season.localeCompare(a.season);
              return b.nominatedDate.localeCompare(a.nominatedDate);
            })
            .map((entry) => (
              <div
                key={entry.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 bg-[#06054e]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Trophy size={16} className="text-[#06054e]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-[#06054e] text-sm leading-tight truncate">
                        {entry.tournamentTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-[#06054e]/10 text-[#06054e] rounded-full text-[10px] font-black uppercase">
                          {entry.ageGroup}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {entry.season}
                        </span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={entry.nominationStatus} />
                </div>

                <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                    <span>
                      <span className="font-semibold">Nominated:</span>{" "}
                      {formatDate(entry.nominatedDate)}
                    </span>
                  </div>
                  {entry.tournamentStartDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                      <span>
                        <span className="font-semibold">Tournament:</span>{" "}
                        {formatDate(entry.tournamentStartDate)}
                      </span>
                    </div>
                  )}
                  {entry.tournamentLocation && (
                    <div className="flex items-center gap-1.5 col-span-2">
                      <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{entry.tournamentLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
