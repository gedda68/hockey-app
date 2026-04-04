"use client";

/**
 * /admin/team-tournaments
 *
 * Admin page for managing team tournament entries and their fee structures.
 *
 * Workflow:
 *   1. Register a team for a tournament (create entry).
 *   2. Add fee line items with total costs (accommodation, flights, etc.).
 *   3. Select attending roster members.
 *   4. Click "Distribute Fees" — system calculates each member's share.
 *   5. Members see their itemised portion on their My Fees dashboard.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
} from "lucide-react";
import {
  TOURNAMENT_FEE_CATEGORIES,
  type TournamentFeeCategory,
  type TeamFeeItem,
  type TeamTournamentEntry,
  type TeamTournamentEntrySummary,
  type EntryStatus,
} from "@/types/teamTournament";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_CONFIG: Record<EntryStatus, { label: string; color: string; bg: string }> = {
  draft:       { label: "Draft",       color: "text-gray-600",  bg: "bg-gray-100 border-gray-300" },
  registered:  { label: "Registered",  color: "text-blue-700",  bg: "bg-blue-100 border-blue-300" },
  confirmed:   { label: "Confirmed",   color: "text-green-700", bg: "bg-green-100 border-green-300" },
  withdrawn:   { label: "Withdrawn",   color: "text-red-700",   bg: "bg-red-100 border-red-300" },
};

function StatusBadge({ status }: { status: EntryStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const FEE_CATEGORY_ICONS: Record<TournamentFeeCategory, string> = {
  entry:         "🏆",
  accommodation: "🏨",
  flights:       "✈️",
  transfers:     "🚐",
  food:          "🍽️",
  sundries:      "🛍️",
  staff:         "👨‍💼",
  other:         "💰",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface TournamentOption { tournamentId: string; title: string; season: string; ageGroup: string; startDate: string }
interface TeamOption { teamId: string; name: string; displayName?: string; clubId: string }
interface MemberOption { memberId: string; name: string }
interface AllocationSummary {
  memberId: string;
  memberName: string;
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  status: string;
}

// ── Create Entry Modal ────────────────────────────────────────────────────────

function CreateEntryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tournaments").then((r) => r.json()),
      fetch("/api/admin/clubs").then((r) => r.json()),
    ]).then(([tData, cData]) => {
      setTournaments(tData.tournaments ?? []);
      // Teams are fetched per-club — for now show all teams from clubs
    });
    fetch("/api/admin/teams").then((r) => r.json()).then((d) => setTeams(d.teams ?? []));
  }, []);

  async function handleSubmit() {
    if (!selectedTournament || !selectedTeam) {
      toast.error("Select both a tournament and a team");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/team-tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selectedTeam, tournamentId: selectedTournament }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create entry");
      toast.success("Entry created");
      onCreated();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Register Team for Tournament</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tournament</label>
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select tournament…</option>
              {tournaments.map((t) => (
                <option key={t.tournamentId} value={t.tournamentId}>
                  {t.title} — {t.ageGroup} ({t.season})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select team…</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.displayName ?? t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fee Item Editor ───────────────────────────────────────────────────────────

function FeeItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: TeamFeeItem;
  onChange: (updated: TeamFeeItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start py-2 border-b last:border-0">
      <div className="col-span-3">
        <select
          value={item.category}
          onChange={(e) => onChange({ ...item, category: e.target.value as TournamentFeeCategory })}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        >
          {(Object.entries(TOURNAMENT_FEE_CATEGORIES) as [TournamentFeeCategory, string][]).map(([k, v]) => (
            <option key={k} value={k}>{FEE_CATEGORY_ICONS[k]} {v}</option>
          ))}
        </select>
      </div>
      <div className="col-span-4">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          placeholder="Description"
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        />
      </div>
      <div className="col-span-2">
        <input
          type="number"
          value={item.totalAmountCents / 100}
          onChange={(e) =>
            onChange({ ...item, totalAmountCents: Math.round(parseFloat(e.target.value || "0") * 100) })
          }
          min={0}
          step={0.01}
          placeholder="Total $"
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        />
      </div>
      <div className="col-span-2">
        <select
          value={item.splitMethod}
          onChange={(e) => onChange({ ...item, splitMethod: e.target.value as "equal" | "manual" })}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="equal">Equal split</option>
          <option value="manual">Manual</option>
        </select>
      </div>
      <div className="col-span-1 flex justify-center pt-1.5">
        <button onClick={onRemove} className="text-red-400 hover:text-red-600">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Entry Detail Panel ────────────────────────────────────────────────────────

function EntryDetailPanel({
  entryId,
  onClose,
  onChanged,
}: {
  entryId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [entry, setEntry] = useState<TeamTournamentEntry | null>(null);
  const [memberDetails, setMemberDetails] = useState<Record<string, { name: string }>>({});
  const [allocations, setAllocations] = useState<AllocationSummary[]>([]);
  const [allTeamMembers, setAllTeamMembers] = useState<MemberOption[]>([]);
  const [feeItems, setFeeItems] = useState<TeamFeeItem[]>([]);
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [showRoster, setShowRoster] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/team-tournaments/${entryId}`);
    if (!res.ok) { toast.error("Failed to load entry"); return; }
    const data = await res.json();
    setEntry(data.entry);
    setFeeItems(data.entry.feeItems ?? []);
    setAttendingIds(new Set(data.entry.attendingMemberIds ?? []));
    setMemberDetails(data.memberDetails ?? {});
    setAllocations(data.allocations ?? []);

    // Load team roster for member selection
    if (data.entry.teamId) {
      const teamRes = await fetch(`/api/admin/teams/${data.entry.teamId}`);
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        const roster = teamData.team?.roster ?? [];
        // Load member names
        const memberIds: string[] = roster.map((r: { memberId: string }) => r.memberId);
        if (memberIds.length > 0) {
          const mRes = await fetch(`/api/admin/members?ids=${memberIds.join(",")}`);
          if (mRes.ok) {
            const mData = await mRes.json();
            setAllTeamMembers(
              (mData.members ?? []).map((m: Record<string, unknown>) => ({
                memberId: m.memberId as string,
                name: `${(m.personalInfo as Record<string, unknown>)?.firstName ?? ""} ${(m.personalInfo as Record<string, unknown>)?.lastName ?? ""}`.trim(),
              }))
            );
          }
        }
      }
    }
  }, [entryId]);

  useEffect(() => { load(); }, [load]);

  function addFeeItem() {
    const newItem: TeamFeeItem = {
      itemId:          `item-${Date.now()}`,
      category:        "entry",
      name:            "",
      totalAmountCents: 0,
      splitMethod:     "equal",
      gstIncluded:     true,
    };
    setFeeItems((prev) => [...prev, newItem]);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/team-tournaments/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feeItems,
          attendingMemberIds: [...attendingIds],
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      toast.success("Saved");
      await load();
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function distribute() {
    setDistributing(true);
    try {
      const res = await fetch(`/api/admin/team-tournaments/${entryId}/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Distribution failed");
      toast.success(`Fees distributed to ${data.distributed} members`);
      await load();
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Distribution failed");
    } finally {
      setDistributing(false);
    }
  }

  async function updateStatus(status: EntryStatus) {
    try {
      const res = await fetch(`/api/admin/team-tournaments/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Status updated to ${status}`);
      await load();
      onChanged();
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  const totalFeesCents = feeItems.reduce((s, i) => s + i.totalAmountCents, 0);
  const perMemberEstimate = attendingIds.size > 0 ? Math.round(totalFeesCents / attendingIds.size) : 0;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <button className="flex-1 bg-black/40" onClick={onClose} aria-label="Close" />

      {/* Panel */}
      <div className="w-full max-w-2xl bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-start justify-between z-10">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{entry.tournamentTitle}</h2>
            <p className="text-sm text-gray-500">{entry.teamName} · {entry.ageGroup} · {formatDate(entry.startDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={entry.status} />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-2">×</button>
          </div>
        </div>

        <div className="p-4 space-y-6 flex-1">
          {/* Status controls */}
          <div className="flex gap-2 flex-wrap">
            {(["draft", "registered", "confirmed", "withdrawn"] as EntryStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                disabled={entry.status === s}
                className={`text-xs px-3 py-1 rounded-lg border font-medium transition ${
                  entry.status === s
                    ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Fee items */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">Fee Items</h3>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {attendingIds.size > 0 && totalFeesCents > 0 && (
                  <span className="text-indigo-600 font-medium">
                    ~{formatCents(perMemberEstimate)} / member
                  </span>
                )}
                <span className="font-bold text-gray-900">Total: {formatCents(totalFeesCents)}</span>
              </div>
            </div>

            {feeItems.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2">No fee items yet.</p>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 pb-1 border-b">
                  <div className="col-span-3">Category</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Total</div>
                  <div className="col-span-2">Split</div>
                  <div className="col-span-1"></div>
                </div>
                {feeItems.map((item, idx) => (
                  <FeeItemRow
                    key={item.itemId}
                    item={item}
                    onChange={(updated) =>
                      setFeeItems((prev) => prev.map((i, j) => (j === idx ? updated : i)))
                    }
                    onRemove={() => setFeeItems((prev) => prev.filter((_, j) => j !== idx))}
                  />
                ))}
              </div>
            )}

            <button
              onClick={addFeeItem}
              className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Plus className="w-4 h-4" /> Add fee item
            </button>
          </section>

          {/* Roster / attending members */}
          <section>
            <button
              className="flex items-center gap-2 font-semibold text-gray-800 w-full"
              onClick={() => setShowRoster((v) => !v)}
            >
              <Users className="w-4 h-4" />
              Attending Members ({attendingIds.size})
              {showRoster ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>

            {showRoster && (
              <div className="mt-2 space-y-1 max-h-56 overflow-y-auto border rounded-lg p-2">
                {allTeamMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2 text-center">
                    No roster members found. Make sure the team has players assigned.
                  </p>
                ) : (
                  allTeamMembers.map((m) => (
                    <label key={m.memberId} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={attendingIds.has(m.memberId)}
                        onChange={(e) => {
                          setAttendingIds((prev) => {
                            const next = new Set(prev);
                            e.target.checked ? next.add(m.memberId) : next.delete(m.memberId);
                            return next;
                          });
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span className="text-sm text-gray-800">{m.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </section>

          {/* Member allocations (after distribution) */}
          {allocations.length > 0 && (
            <section>
              <h3 className="font-semibold text-gray-800 mb-2">Member Fee Allocations</h3>
              <div className="space-y-1">
                {allocations.map((a: AllocationSummary) => (
                  <div key={a.memberId} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      {a.status === "paid" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : a.status === "partially-paid" ? (
                        <Clock className="w-4 h-4 text-blue-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                      )}
                      <span className="text-sm text-gray-800">{a.memberName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{formatCents(a.totalCents)}</span>
                      {a.outstandingCents > 0 && (
                        <span className="text-xs text-orange-600 ml-2">({formatCents(a.outstandingCents)} outstanding)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-gray-800 text-white py-2.5 rounded-lg font-medium hover:bg-gray-900 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
            Save Changes
          </button>
          <button
            onClick={distribute}
            disabled={distributing || attendingIds.size === 0 || feeItems.length === 0}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            title={
              attendingIds.size === 0 ? "Select attending members first" :
              feeItems.length === 0 ? "Add fee items first" : "Calculate and distribute fees to members"
            }
          >
            {distributing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Distribute Fees
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onSelect,
}: {
  entry: TeamTournamentEntrySummary;
  onSelect: () => void;
}) {
  const pctCollected = entry.totalFeesCents > 0
    ? Math.round((entry.totalCollectedCents / entry.totalFeesCents) * 100)
    : 0;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-indigo-300 transition cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{entry.tournamentTitle}</p>
          <p className="text-sm text-gray-500">{entry.teamName} · {entry.ageGroup}</p>
          <p className="text-xs text-gray-400 mt-0.5">{entry.clubName} · {formatDate(entry.startDate)}</p>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{entry.attendingCount} attending</span>
          <span>{formatCents(entry.totalCollectedCents)} / {formatCents(entry.totalFeesCents)}</span>
        </div>
        {entry.totalFeesCents > 0 && (
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${pctCollected}%` }}
            />
          </div>
        )}
        {entry.outstandingCents > 0 && (
          <p className="text-xs text-orange-600 font-medium">
            {formatCents(entry.outstandingCents)} outstanding
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamTournamentsPage() {
  const { isLoading: authLoading } = useAuth();

  const [entries, setEntries] = useState<TeamTournamentEntrySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/team-tournaments?season=${season}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      toast.error("Failed to load team tournament entries");
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => {
    if (!authLoading) loadEntries();
  }, [authLoading, loadEntries]);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1].map(String);

  const totalOutstanding = entries.reduce((s, e) => s + e.outstandingCents, 0);
  const totalFees = entries.reduce((s, e) => s + e.totalFeesCents, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Tournament Fees</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage team entries, fee breakdowns, and per-member cost allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadEntries}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Register Team
          </button>
        </div>
      </div>

      {/* Season filter */}
      <div className="flex items-center gap-2">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setSeason(y)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              season === y
                ? "bg-indigo-600 text-white"
                : "bg-white border border-gray-300 text-gray-600 hover:border-indigo-400"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Summary */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{entries.length}</p>
            <p className="text-xs text-gray-500">Team Entries</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{formatCents(totalFees)}</p>
            <p className="text-xs text-gray-500">Total Fees</p>
          </div>
          <div className="bg-white rounded-xl border p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{formatCents(totalOutstanding)}</p>
            <p className="text-xs text-gray-500">Outstanding</p>
          </div>
        </div>
      )}

      {/* Entry list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400 font-medium">No team entries for {season}</p>
          <p className="text-sm text-gray-400 mt-1">Click "Register Team" to add the first entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <EntryCard
              key={entry.entryId}
              entry={entry}
              onSelect={() => setSelectedEntryId(entry.entryId)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateEntryModal
          onClose={() => setShowCreate(false)}
          onCreated={loadEntries}
        />
      )}

      {/* Detail panel */}
      {selectedEntryId && (
        <EntryDetailPanel
          entryId={selectedEntryId}
          onClose={() => setSelectedEntryId(null)}
          onChanged={loadEntries}
        />
      )}
    </div>
  );
}
