// sections/TournamentHistorySection.tsx
// Read-only representative history: player tournament nominations + official role history

"use client";

import { useState } from "react";
import { BaseSectionProps, TournamentHistoryEntry, RepOfficialNomination } from "@/types/player.types";
import { Trophy, Calendar, MapPin, Info, CheckCircle, Clock, XCircle, AlertCircle, UserCog } from "lucide-react";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({
  status,
}: {
  status: TournamentHistoryEntry["nominationStatus"];
}) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    accepted: "bg-green-100 text-green-700 border-green-200",
    played: "bg-blue-100 text-blue-700 border-blue-200",
    withdrawn: "bg-slate-100 text-slate-600 border-slate-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };
  const icons: Record<string, JSX.Element> = {
    pending: <Clock size={10} />,
    accepted: <CheckCircle size={10} />,
    played: <Trophy size={10} />,
    withdrawn: <XCircle size={10} />,
    rejected: <XCircle size={10} />,
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    accepted: "Accepted",
    played: "Played",
    withdrawn: "Withdrawn",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${styles[status] ?? styles.pending}`}
    >
      {icons[status] ?? null}
      {labels[status] ?? status}
    </span>
  );
}

const OFFICIAL_ROLE_LABELS: Record<string, string> = {
  head_coach:      "Head Coach",
  assistant_coach: "Assistant Coach",
  manager:         "Manager",
  umpire:          "Umpire / Referee",
  trainer:         "Trainer / Physio",
  other:           "Other Official",
};

const OFFICIAL_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 border-amber-200",
  accepted:  "bg-green-100 text-green-700 border-green-200",
  fulfilled: "bg-blue-100 text-blue-700 border-blue-200",
  withdrawn: "bg-slate-100 text-slate-600 border-slate-200",
  rejected:  "bg-red-100 text-red-700 border-red-200",
};

function OfficialStatusBadge({ status }: { status: RepOfficialNomination["status"] }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${OFFICIAL_STATUS_STYLES[status] ?? OFFICIAL_STATUS_STYLES.pending}`}>
      {status === "accepted" || status === "fulfilled" ? <CheckCircle size={10} /> : null}
      {status === "rejected" || status === "withdrawn" ? <XCircle size={10} /> : null}
      {status === "pending" ? <Clock size={10} /> : null}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function TournamentHistorySection({ formData }: BaseSectionProps) {
  const [activeTab, setActiveTab] = useState<"player" | "official">("player");

  const playerHistory: TournamentHistoryEntry[] = formData.tournamentHistory ?? [];
  const officialHistory: RepOfficialNomination[] = formData.officialHistory ?? [];

  const totalPlayerNoms = playerHistory.length;
  const acceptedCount = playerHistory.filter(
    (e) => e.nominationStatus === "accepted" || e.nominationStatus === "played",
  ).length;
  const activeOfficialRoles = officialHistory.filter(
    (e) => e.status === "accepted" || e.status === "fulfilled",
  ).length;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
        <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 font-semibold">
          Representative history is automatically recorded through the nomination workflow.
          Use the <strong>Representative</strong> tab to submit new nominations.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#06054e]/5 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-[#06054e]">{totalPlayerNoms}</p>
          <p className="text-xs font-black uppercase text-slate-500 mt-1">Player Noms</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-green-600">{acceptedCount}</p>
          <p className="text-xs font-black uppercase text-slate-500 mt-1">Accepted</p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-purple-600">{officialHistory.length}</p>
          <p className="text-xs font-black uppercase text-slate-500 mt-1">Official Roles</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab("player")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${
            activeTab === "player" ? "bg-white text-[#06054e] shadow" : "text-slate-500 hover:text-[#06054e]"
          }`}
        >
          <Trophy size={13} />
          Player ({totalPlayerNoms})
        </button>
        <button
          onClick={() => setActiveTab("official")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${
            activeTab === "official" ? "bg-white text-[#06054e] shadow" : "text-slate-500 hover:text-[#06054e]"
          }`}
        >
          <UserCog size={13} />
          Official ({officialHistory.length})
        </button>
      </div>

      {/* ── Player history ──────────────────────────────────────────────────── */}
      {activeTab === "player" && (
        <>
          {playerHistory.length === 0 ? (
            <div className="text-center py-14 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Trophy size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-400 font-black uppercase text-sm">No player nominations yet.</p>
              <p className="text-slate-400 text-xs mt-1">Use the Representative tab to nominate.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...playerHistory]
                .sort((a, b) => {
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
                            <span className="text-xs text-slate-400 font-semibold">{entry.season}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={entry.nominationStatus} />
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                        <span><span className="font-semibold">Nominated:</span> {formatDate(entry.nominatedDate)}</span>
                      </div>
                      {entry.tournamentStartDate && (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                          <span><span className="font-semibold">Tournament:</span> {formatDate(entry.tournamentStartDate)}</span>
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
        </>
      )}

      {/* ── Official role history ────────────────────────────────────────────── */}
      {activeTab === "official" && (
        <>
          {officialHistory.length === 0 ? (
            <div className="text-center py-14 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <UserCog size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-400 font-black uppercase text-sm">No official role nominations yet.</p>
              <p className="text-slate-400 text-xs mt-1">Use the Representative tab to nominate as an official.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...officialHistory]
                .sort((a, b) => {
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
                        <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <UserCog size={16} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[#06054e] text-sm leading-tight">
                            {OFFICIAL_ROLE_LABELS[entry.role] ?? entry.role}
                          </p>
                          {entry.tournamentTitle && (
                            <p className="text-xs text-slate-500 font-bold truncate mt-0.5">{entry.tournamentTitle}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-black uppercase">
                              {entry.ageGroup}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">{entry.season}</span>
                          </div>
                        </div>
                      </div>
                      <OfficialStatusBadge status={entry.status} />
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} className="text-slate-400 flex-shrink-0" />
                        <span><span className="font-semibold">Nominated:</span> {formatDate(entry.nominatedDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
