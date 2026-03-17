"use client";

// app/admin/tournaments/page.tsx
// Representative Tournament / Competition management

import { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  X,
  Loader2,
  ChevronDown,
  AlertCircle,
  CalendarClock,
} from "lucide-react";
import RichTextEditor from "@/app/admin/components/RichTextEditor";
import type { Tournament, CreateTournamentRequest } from "@/types/tournaments";
import { friday8WeeksBefore, getPeriodStatus } from "@/types/tournaments";

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear().toString();

const STATUS_STYLES = {
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-green-50 text-green-700 border-green-200",
  past: "bg-slate-50 text-slate-500 border-slate-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tournamentStatus(t: Tournament): "upcoming" | "active" | "past" {
  const today = new Date().toISOString().split("T")[0];
  if (today < t.startDate) return "upcoming";
  if (today > t.endDate) return "past";
  return "active";
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM: Omit<CreateTournamentRequest, "season"> = {
  ageGroup: "",
  title: "",
  startDate: "",
  endDate: "",
  location: "",
  additionalInfo: "",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface TournamentModalProps {
  season: string;
  ageGroups: string[];
  initial?: Tournament | null;
  onClose: () => void;
  onSaved: () => void;
}

function TournamentModal({
  season,
  ageGroups,
  initial,
  onClose,
  onSaved,
}: TournamentModalProps) {
  const isEdit = !!initial;

  const [form, setForm] = useState<Omit<CreateTournamentRequest, "season">>({
    ageGroup: initial?.ageGroup ?? "",
    title: initial?.title ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
    location: initial?.location ?? "",
    additionalInfo: initial?.additionalInfo ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill end date when start date changes (end = start + 4 days by default)
  const handleStartDateChange = (val: string) => {
    setForm((prev) => {
      const newForm = { ...prev, startDate: val };
      if (!prev.endDate && val) {
        const d = new Date(val + "T00:00:00");
        d.setDate(d.getDate() + 4);
        newForm.endDate = d.toISOString().split("T")[0];
      }
      return newForm;
    });
  };

  async function handleSave() {
    setError("");
    if (!form.ageGroup || !form.title || !form.startDate || !form.endDate || !form.location) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("End date must be on or after start date.");
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/tournaments/${initial!._id ?? initial!.tournamentId}`
        : "/api/admin/tournaments";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, season }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Save failed");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // Computed nomination close date (preview)
  const nominationClose = form.startDate ? friday8WeeksBefore(form.startDate) : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-6 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-8 py-6 border-b-4 border-[#06054e] rounded-t-3xl">
          <div className="flex items-center gap-3">
            <Trophy size={22} className="text-yellow-500" />
            <h2 className="text-xl font-black uppercase text-[#06054e]">
              {isEdit ? "Edit Tournament" : "Add Tournament"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-semibold">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Age group */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Age Group <span className="text-red-500">*</span>
            </label>
            <select
              value={form.ageGroup}
              onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm font-bold text-[#06054e] focus:border-[#06054e] focus:outline-none"
            >
              <option value="">Select age group…</option>
              {ageGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Competition / Tournament Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. 2026 Queensland Hockey Under 14 Championships"
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Tournament Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Tournament End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                min={form.startDate}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
              />
            </div>
          </div>

          {/* Nomination close date preview */}
          {nominationClose && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
              <CalendarClock size={15} className="text-amber-600 flex-shrink-0" />
              <span className="text-amber-800">
                <strong>Calculated nomination close date:</strong>{" "}
                {formatDate(nominationClose)}{" "}
                <span className="text-amber-600 text-xs">(Friday, 8 weeks before tournament)</span>
              </span>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Hockey World, Gold Coast QLD"
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
            />
          </div>

          {/* Additional info – rich text */}
          <RichTextEditor
            label="Additional Information"
            value={form.additionalInfo ?? ""}
            onChange={(val) => setForm({ ...form, additionalInfo: val })}
            placeholder="Add accommodation details, schedule notes, dress requirements, contact information…"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 bg-[#06054e] hover:bg-[#0a0870] text-white text-sm font-black uppercase rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save Changes" : "Create Tournament"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tournament Card ──────────────────────────────────────────────────────────

function TournamentCard({
  tournament,
  onEdit,
  onDelete,
}: {
  tournament: Tournament;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const status = tournamentStatus(tournament);
  const nomClose = tournament.startDate ? friday8WeeksBefore(tournament.startDate) : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Coloured top bar by status */}
      <div
        className={`h-1.5 ${
          status === "active"
            ? "bg-green-400"
            : status === "upcoming"
              ? "bg-blue-400"
              : "bg-slate-200"
        }`}
      />

      <div className="px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Status + age group */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${STATUS_STYLES[status]}`}
              >
                {status}
              </span>
              <span className="px-2.5 py-0.5 bg-[#06054e]/10 text-[#06054e] rounded-full text-[10px] font-black uppercase">
                {tournament.ageGroup}
              </span>
            </div>

            {/* Title */}
            <h3 className="font-black text-[#06054e] text-base leading-tight mb-3">
              {tournament.title}
            </h3>

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-slate-400" />
                {formatDate(tournament.startDate)} – {formatDate(tournament.endDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                {tournament.location}
              </span>
            </div>

            {/* Nomination close reminder */}
            {nomClose && (
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                <CalendarClock size={12} className="text-amber-500" />
                <span className="text-amber-700 font-semibold">
                  Nominations close:{" "}
                  <strong>{formatDate(nomClose)}</strong>
                  {(() => {
                    const s = getPeriodStatus(
                      new Date().toISOString().split("T")[0],
                      nomClose,
                    );
                    return s === "closed"
                      ? " (closed)"
                      : s === "open"
                        ? " · open now"
                        : "";
                  })()}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-[#06054e] transition-colors"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Additional info toggle */}
        {tournament.additionalInfo && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 hover:text-[#06054e] transition-colors"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${showInfo ? "rotate-180" : ""}`}
              />
              {showInfo ? "Hide" : "Show"} additional information
            </button>
            {showInfo && (
              <div
                className="mt-3 prose prose-sm max-w-none text-slate-600 bg-slate-50 rounded-2xl p-4"
                dangerouslySetInnerHTML={{ __html: tournament.additionalInfo }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TournamentsPage() {
  const [season, setSeason] = useState(CURRENT_YEAR);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
  const [availableAgeGroups, setAvailableAgeGroups] = useState<string[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  // Load seasons + age groups from rosters
  useEffect(() => {
    fetch(`/api/rosters?year=${season}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailableSeasons(data.seasons ?? []);
        setAvailableAgeGroups(data.ageGroups ?? []);
      })
      .catch(console.error);
  }, [season]);

  // Fetch tournaments
  const fetchTournaments = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/tournaments?season=${encodeURIComponent(season)}`)
      .then((r) => r.json())
      .then((data) => setTournaments(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [season]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  async function handleDelete(tournament: Tournament) {
    if (!confirm(`Delete "${tournament.title}"?`)) return;
    const res = await fetch(
      `/api/admin/tournaments/${tournament._id ?? tournament.tournamentId}`,
      { method: "DELETE" },
    );
    if (res.ok) fetchTournaments();
    else alert("Failed to delete tournament");
  }

  // Group by age group for display
  const grouped = availableAgeGroups.map((ag) => ({
    ageGroup: ag,
    tournaments: tournaments.filter((t) => t.ageGroup === ag),
  }));
  const ungroupedAgeGroups = [
    ...new Set(
      tournaments
        .filter((t) => !availableAgeGroups.includes(t.ageGroup))
        .map((t) => t.ageGroup),
    ),
  ];
  if (ungroupedAgeGroups.length > 0) {
    ungroupedAgeGroups.forEach((ag) =>
      grouped.push({
        ageGroup: ag,
        tournaments: tournaments.filter((t) => t.ageGroup === ag),
      }),
    );
  }

  const populatedGroups = grouped.filter((g) => g.tournaments.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase text-[#06054e] flex items-center gap-3">
              <Trophy size={22} className="text-yellow-500" />
              Tournaments & Competitions
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage representative tournament and competition details
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Season picker */}
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="px-3 py-2 bg-slate-100 rounded-xl text-sm font-bold text-[#06054e] border-0 focus:ring-2 focus:ring-[#06054e]"
            >
              {(availableSeasons.length > 0 ? availableSeasons : [CURRENT_YEAR]).map(
                (s) => (
                  <option key={s} value={s}>
                    {s} Season
                  </option>
                ),
              )}
            </select>
            <button
              onClick={() => {
                setEditingTournament(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#06054e] hover:bg-[#0a0870] text-white text-xs font-black uppercase rounded-xl transition-all shadow-lg shadow-[#06054e]/20"
            >
              <Plus size={15} />
              Add Tournament
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#06054e] animate-spin" />
          </div>
        )}

        {!loading && tournaments.length === 0 && (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <Trophy size={48} className="mx-auto text-slate-200 mb-5" />
            <p className="font-black uppercase text-slate-300 text-xl mb-2">
              No Tournaments for {season}
            </p>
            <p className="text-slate-400 text-sm mb-8">
              Add a tournament to set nomination close dates automatically.
            </p>
            <button
              onClick={() => {
                setEditingTournament(null);
                setShowModal(true);
              }}
              className="px-8 py-3 bg-[#06054e] text-white font-black uppercase text-xs rounded-2xl hover:bg-[#0a0870] transition-all"
            >
              <Plus size={14} className="inline mr-2" />
              Add First Tournament
            </button>
          </div>
        )}

        {!loading && populatedGroups.length > 0 && (
          <div className="space-y-8">
            {populatedGroups.map((group) => (
              <div key={group.ageGroup}>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-3">
                  <span className="w-6 h-0.5 bg-slate-200" />
                  {group.ageGroup}
                  <span className="w-6 h-0.5 bg-slate-200" />
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {group.tournaments.map((t) => (
                    <TournamentCard
                      key={t.tournamentId}
                      tournament={t}
                      onEdit={() => {
                        setEditingTournament(t);
                        setShowModal(true);
                      }}
                      onDelete={() => handleDelete(t)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Age groups with no tournaments yet */}
        {!loading && availableAgeGroups.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
              Age Groups Without Tournaments
            </h2>
            <div className="flex flex-wrap gap-2">
              {availableAgeGroups
                .filter((ag) => !tournaments.some((t) => t.ageGroup === ag))
                .map((ag) => (
                  <button
                    key={ag}
                    onClick={() => {
                      setEditingTournament(null);
                      setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-400 hover:border-[#06054e] hover:text-[#06054e] transition-all"
                  >
                    <Plus size={12} />
                    {ag}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <TournamentModal
          season={season}
          ageGroups={availableAgeGroups}
          initial={editingTournament}
          onClose={() => {
            setShowModal(false);
            setEditingTournament(null);
          }}
          onSaved={fetchTournaments}
        />
      )}
    </div>
  );
}
