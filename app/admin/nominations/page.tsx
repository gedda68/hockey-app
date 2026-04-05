"use client";

// app/admin/nominations/page.tsx
// Representative Nominations — nominate club members for rep age groups

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  UserMinus,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Info,
  CalendarClock,
  Pencil,
  Save,
  X,
  CalendarDays,
  UserCheck,
  Trophy,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Star,
} from "lucide-react";
import WithdrawalModal from "@/components/admin/nominations/WithdrawalModal";
import type {
  Nomination,
  NominationStatus,
  EligibleMember,
  AgeEligibilityRange,
} from "@/types/nominations";
import type { NominationPeriod, PeriodStatus } from "@/types/tournaments";
import { getPeriodStatus, periodCountdown } from "@/types/tournaments";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EligibleResponse {
  ageGroup: string;
  season: string;
  eligibilityRange: AgeEligibilityRange;
  members: EligibleMember[];
  total: number;
}

interface ClubGroup {
  clubId: string;
  clubName: string;
  members: EligibleMember[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<NominationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  withdrawn: "bg-slate-100 text-slate-500 border-slate-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_ICONS: Record<NominationStatus, React.ReactNode> = {
  pending: <Clock size={12} />,
  accepted: <CheckCircle size={12} />,
  withdrawn: <UserMinus size={12} />,
  rejected: <XCircle size={12} />,
};

const PERIOD_STATUS_STYLES: Record<PeriodStatus, string> = {
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  open: "bg-green-50 text-green-700 border-green-200",
  closed: "bg-red-50 text-red-700 border-red-200",
};

const CURRENT_YEAR = new Date().getFullYear().toString();

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: NominationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_STYLES[status]}`}
    >
      {STATUS_ICONS[status]}
      {status}
    </span>
  );
}

function EligibilityBanner({
  range,
  ageGroup,
  season,
}: {
  range: AgeEligibilityRange;
  ageGroup: string;
  season: string;
}) {
  const rangeText =
    range.maxAge === null
      ? `Age ${range.minAge}+ in ${season}`
      : `Ages ${range.minAge}–${range.maxAge} in ${season}`;

  const colourClass =
    range.divisionType === "junior"
      ? "bg-blue-50 border-blue-200 text-blue-800"
      : range.divisionType === "masters"
        ? "bg-purple-50 border-purple-200 text-purple-800"
        : "bg-green-50 border-green-200 text-green-800";

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border ${colourClass}`}>
      <Info size={16} className="mt-0.5 flex-shrink-0" />
      <div>
        <span className="font-black uppercase text-xs">
          {ageGroup} — Eligibility:{" "}
        </span>
        <span className="text-xs font-semibold">{rangeText}</span>
        <p className="text-[11px] mt-0.5 opacity-70">{range.description}</p>
      </div>
    </div>
  );
}

// ── Nomination Period Banner ───────────────────────────────────────────────────
interface PeriodBannerProps {
  period: NominationPeriod | null;
  season: string;
  ageGroup: string;
  onPeriodSaved: (p: NominationPeriod) => void;
}

function PeriodBanner({ period, season, ageGroup, onPeriodSaved }: PeriodBannerProps) {
  const defaultStart = `${season}-01-01`;
  const [editing, setEditing] = useState(false);
  const [startDate, setStartDate] = useState(period?.startDate ?? defaultStart);
  const [endDate, setEndDate] = useState(period?.endDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Keep local state in sync when period data arrives
  useEffect(() => {
    setStartDate(period?.startDate ?? defaultStart);
    setEndDate(period?.endDate ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period?.startDate, period?.endDate, season]);

  const periodStatus: PeriodStatus | null =
    startDate && endDate ? getPeriodStatus(startDate, endDate) : null;

  async function handleSave() {
    setError("");
    if (!startDate || !endDate) {
      setError("Both start and end dates are required.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after start date.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/nominations/periods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season,
          ageGroup,
          startDate,
          endDate,
          isStartCustom: startDate !== defaultStart,
          isEndCustom: true,
          linkedTournamentId: period?.linkedTournamentId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Save failed");
        return;
      }
      const saved = await res.json();
      onPeriodSaved(saved);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function formatDateAU(iso: string) {
    if (!iso) return "Not set";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl border-2 border-[#06054e] p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black uppercase text-sm text-[#06054e] flex items-center gap-2">
            <CalendarClock size={16} />
            Edit Nomination Period
          </h3>
          <button
            onClick={() => {
              setEditing(false);
              setStartDate(period?.startDate ?? defaultStart);
              setEndDate(period?.endDate ?? "");
              setError("");
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={15} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs font-semibold mb-4">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Nominations Open
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Default: Jan 1, {season}
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Nominations Close
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Auto-set to Friday 8 weeks before tournament
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#06054e] text-white text-sm font-black uppercase rounded-xl hover:bg-[#0a0870] transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Period
          </button>
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border mb-5 ${
        periodStatus ? PERIOD_STATUS_STYLES[periodStatus] : "bg-slate-50 border-slate-200 text-slate-600"
      }`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <CalendarClock size={16} className="flex-shrink-0" />
        <div>
          <p className="text-xs font-black uppercase tracking-wide">
            Nomination Period
            {periodStatus && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full border text-[10px] ${PERIOD_STATUS_STYLES[periodStatus]}`}
              >
                {periodStatus}
              </span>
            )}
          </p>
          {startDate && endDate ? (
            <p className="text-xs font-semibold mt-0.5">
              <span className="flex items-center gap-1.5 flex-wrap">
                <CalendarDays size={11} />
                {formatDateAU(startDate)}
                <span className="opacity-60">→</span>
                {formatDateAU(endDate)}
                {periodStatus && (
                  <span className="opacity-70">· {periodCountdown(startDate, endDate)}</span>
                )}
              </span>
            </p>
          ) : (
            <p className="text-xs opacity-70 mt-0.5">No nomination period set — add a tournament to auto-calculate, or set manually.</p>
          )}
          {period?.isEndCustom && (
            <p className="text-[10px] opacity-60 mt-0.5">
              End date manually overridden
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white/60 hover:bg-white rounded-xl text-xs font-black uppercase border border-current/20 transition-all"
      >
        <Pencil size={11} />
        Edit Dates
      </button>
    </div>
  );
}

// ── Squad panel (right column in Team Selection tab) ─────────────────────────

function SquadPanel({
  nominations,
  onWithdraw,
}: {
  nominations: Nomination[];
  onWithdraw: (nom: Nomination) => void;
}) {
  const mainSquad = nominations
    .filter((n) => n.status === "accepted" && !n.isShadow)
    .sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999));
  const shadows = nominations.filter((n) => n.status === "accepted" && n.isShadow);

  return (
    <div className="space-y-1.5">
      {mainSquad.map((nom, i) => (
        <div key={nom._id ?? nom.nominationId} className="flex items-center gap-3">
          <span className="w-6 h-6 bg-[#06054e] text-white rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-[#06054e] truncate">
              {nom.memberName ?? nom.nomineeName}
            </p>
            <p className="text-[10px] text-slate-400 font-bold truncate">{nom.clubName}</p>
          </div>
          <button
            onClick={() => onWithdraw(nom)}
            className="p-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
            title="Withdraw"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      {shadows.length > 0 && (
        <>
          <div className="pt-2 pb-1 flex items-center gap-2">
            <div className="flex-1 h-px bg-amber-200" />
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1">
              <Star size={9} /> Shadow / Train-on
            </span>
            <div className="flex-1 h-px bg-amber-200" />
          </div>
          {shadows.map((nom) => (
            <div key={nom._id ?? nom.nominationId} className="flex items-center gap-3 opacity-80">
              <span className="w-6 h-6 bg-amber-200 text-amber-800 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0">
                <Star size={10} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-amber-800 truncate">
                  {nom.memberName ?? nom.nomineeName}
                </p>
                <p className="text-[10px] text-slate-400 font-bold truncate">{nom.clubName}</p>
              </div>
              <button
                onClick={() => onWithdraw(nom)}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                title="Withdraw"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NominationsPage() {
  // Filters
  const [season, setSeason] = useState(CURRENT_YEAR);
  const [ageGroup, setAgeGroup] = useState("");
  const [availableAgeGroups, setAvailableAgeGroups] = useState<string[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);

  // Nomination period
  const [period, setPeriod] = useState<NominationPeriod | null>(null);

  // Eligible members
  const [eligibleData, setEligibleData] = useState<EligibleResponse | null>(null);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState("");

  // Nominations list
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [nomLoading, setNomLoading] = useState(false);

  // UI state
  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const [nominating, setNominating] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"eligible" | "nominations" | "selection">("eligible");
  const [statusFilter, setStatusFilter] = useState<NominationStatus | "all">("all");
  const [finalising, setFinalising] = useState(false);
  const [finaliseConfirm, setFinaliseConfirm] = useState(false);
  // Reject notes prompt
  const [rejectTarget, setRejectTarget] = useState<Nomination | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  // Withdrawal modal (for accepted/shadow players being withdrawn from squad)
  const [withdrawTarget, setWithdrawTarget] = useState<Nomination | null>(null);

  // ── Load seasons + age groups from rosters ──────────────────────────────
  useEffect(() => {
    fetch(`/api/rosters?year=${season}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailableSeasons(data.seasons ?? []);
        const groups: string[] = data.ageGroups ?? [];
        setAvailableAgeGroups(groups);
        if (groups.length > 0 && !ageGroup) {
          setAgeGroup(groups[0]);
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  // ── Fetch nomination period ──────────────────────────────────────────────
  useEffect(() => {
    if (!season || !ageGroup) return;
    fetch(
      `/api/admin/nominations/periods?season=${encodeURIComponent(season)}&ageGroup=${encodeURIComponent(ageGroup)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setPeriod(arr.length > 0 ? arr[0] : null);
      })
      .catch(() => setPeriod(null));
  }, [season, ageGroup]);

  // ── Fetch eligible members ───────────────────────────────────────────────
  useEffect(() => {
    if (!season || !ageGroup) return;
    setEligibleLoading(true);
    setEligibleError("");
    setEligibleData(null);

    fetch(
      `/api/admin/nominations/eligible?season=${encodeURIComponent(season)}&ageGroup=${encodeURIComponent(ageGroup)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setEligibleError(data.error);
        else setEligibleData(data);
      })
      .catch(() => setEligibleError("Failed to load eligible members"))
      .finally(() => setEligibleLoading(false));
  }, [season, ageGroup]);

  // ── Fetch nominations ────────────────────────────────────────────────────
  const fetchNominations = useCallback(() => {
    if (!season || !ageGroup) return;
    setNomLoading(true);
    fetch(
      `/api/admin/nominations?season=${encodeURIComponent(season)}&ageGroup=${encodeURIComponent(ageGroup)}`,
    )
      .then((r) => r.json())
      .then((data) => setNominations(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setNomLoading(false));
  }, [season, ageGroup]);

  useEffect(() => {
    fetchNominations();
  }, [fetchNominations]);

  // ── Nominate a player ────────────────────────────────────────────────────
  async function handleNominate(member: EligibleMember) {
    setNominating((prev) => new Set(prev).add(member.memberId));
    try {
      const res = await fetch("/api/admin/nominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season,
          ageGroup,
          clubId: member.clubId,
          memberId: member.memberId,
        }),
      });
      if (res.ok) {
        fetchNominations();
        setEligibleData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            members: prev.members.map((m) =>
              m.memberId === member.memberId
                ? { ...m, alreadyNominated: true }
                : m,
            ),
          };
        });
      } else {
        const err = await res.json();
        alert(err.error ?? "Nomination failed");
      }
    } finally {
      setNominating((prev) => {
        const next = new Set(prev);
        next.delete(member.memberId);
        return next;
      });
    }
  }

  // ── Update nomination status ─────────────────────────────────────────────
  async function handleStatusChange(nom: Nomination, newStatus: NominationStatus) {
    // "rejected" requires review notes — show prompt instead of acting immediately
    if (newStatus === "rejected") {
      setRejectTarget(nom);
      setRejectNotes("");
      return;
    }

    const actionMap: Partial<Record<NominationStatus, string>> = {
      accepted: "accept",
      withdrawn: "withdraw",
    };
    const action = actionMap[newStatus];
    const body = action ? { action } : { status: newStatus };

    const res = await fetch(`/api/admin/nominations/${nom._id ?? nom.nominationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) fetchNominations();
    else alert("Failed to update status");
  }

  // ── Confirm reject with notes ────────────────────────────────────────────
  async function handleConfirmReject() {
    if (!rejectTarget) return;
    const notes = rejectNotes.trim();
    if (!notes) { alert("Please enter a reason for rejection."); return; }
    const res = await fetch(`/api/admin/nominations/${rejectTarget._id ?? rejectTarget.nominationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reviewNotes: notes }),
    });
    if (res.ok) {
      setRejectTarget(null);
      setRejectNotes("");
      fetchNominations();
    } else {
      alert("Failed to reject nomination");
    }
  }

  // ── Toggle shadow / train-on status ─────────────────────────────────────
  async function handleToggleShadow(nom: Nomination) {
    const res = await fetch(`/api/admin/nominations/${nom._id ?? nom.nominationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isShadow: !nom.isShadow }),
    });
    if (res.ok) fetchNominations();
    else alert("Failed to update shadow status");
  }

  // ── Withdraw accepted/shadow player from squad ──────────────────────────
  async function handleConfirmWithdrawal(data: { reason: string; note: string }) {
    if (!withdrawTarget) return;
    const res = await fetch(`/api/admin/nominations/${withdrawTarget._id ?? withdrawTarget.nominationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "withdraw",
        withdrawalInfo: {
          reason:      data.reason,
          note:        data.note,
          withdrawnAt: new Date().toISOString(),
        },
      }),
    });
    if (res.ok) {
      setWithdrawTarget(null);
      fetchNominations();
    } else alert("Failed to withdraw player");
  }

  // ── Move player up/down in squad order ──────────────────────────────────
  async function handleSquadReorder(nom: Nomination, direction: "up" | "down") {
    const squad = nominations
      .filter((n) => n.status === "accepted" && !n.isShadow)
      .sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999));

    const idx = squad.findIndex((n) => (n._id ?? n.nominationId) === (nom._id ?? nom.nominationId));
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= squad.length) return;

    const a = squad[idx];
    const b = squad[swapIdx];
    await Promise.all([
      fetch(`/api/admin/nominations/${a._id ?? a.nominationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squadOrder: swapIdx }),
      }),
      fetch(`/api/admin/nominations/${b._id ?? b.nominationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squadOrder: idx }),
      }),
    ]);
    fetchNominations();
  }

  // ── Finalise squad — reject all remaining pending nominations ────────────
  async function handleFinalise() {
    const pending = nominations.filter((n) => n.status === "pending");
    if (pending.length === 0) { setFinaliseConfirm(false); return; }
    setFinalising(true);
    try {
      await Promise.all(
        pending.map((n) =>
          fetch(`/api/admin/nominations/${n._id ?? n.nominationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reject", reviewNotes: "Not selected for squad" }),
          })
        )
      );
      await fetchNominations();
    } finally {
      setFinalising(false);
      setFinaliseConfirm(false);
    }
  }

  // ── Remove nomination ────────────────────────────────────────────────────
  async function handleRemove(nom: Nomination) {
    if (!confirm(`Remove nomination for ${nom.memberName}?`)) return;
    const res = await fetch(`/api/admin/nominations/${nom._id ?? nom.nominationId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchNominations();
      setEligibleData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.map((m) =>
            m.memberId === nom.memberId
              ? { ...m, alreadyNominated: false, nominationId: undefined }
              : m,
          ),
        };
      });
    } else {
      alert("Failed to remove nomination");
    }
  }

  // ── Group eligible members by club ───────────────────────────────────────
  const clubGroups: ClubGroup[] = [];
  if (eligibleData?.members) {
    const map = new Map<string, ClubGroup>();
    for (const m of eligibleData.members) {
      if (!map.has(m.clubId)) {
        map.set(m.clubId, { clubId: m.clubId, clubName: m.clubName, members: [] });
      }
      map.get(m.clubId)!.members.push(m);
    }
    clubGroups.push(...map.values());
  }

  const filteredNominations =
    statusFilter === "all"
      ? nominations
      : nominations.filter((n) => n.status === statusFilter);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase text-[#06054e]">
              Representative Nominations
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Nominate eligible club members for representative age groups
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Season selector */}
            <select
              value={season}
              onChange={(e) => {
                setSeason(e.target.value);
                setAgeGroup("");
              }}
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

            {/* Age group selector */}
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="px-3 py-2 bg-[#06054e] text-white rounded-xl text-sm font-bold border-0 focus:ring-2 focus:ring-yellow-400 min-w-[140px]"
            >
              {availableAgeGroups.length === 0 && (
                <option value="">No age groups</option>
              )}
              {availableAgeGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 pb-3">
          <button
            onClick={() => setActiveTab("eligible")}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeTab === "eligible"
                ? "bg-[#06054e] text-white"
                : "text-slate-400 hover:text-[#06054e]"
            }`}
          >
            <span className="flex items-center gap-2">
              <Users size={14} />
              Eligible Players
              {eligibleData && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                  {eligibleData.total}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("nominations")}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeTab === "nominations"
                ? "bg-[#06054e] text-white"
                : "text-slate-400 hover:text-[#06054e]"
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle size={14} />
              Nominations
              {nominations.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === "nominations"
                      ? "bg-white/20"
                      : "bg-[#06054e] text-white"
                  }`}
                >
                  {nominations.length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("selection")}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeTab === "selection"
                ? "bg-yellow-400 text-[#06054e]"
                : "text-slate-400 hover:text-[#06054e]"
            }`}
          >
            <span className="flex items-center gap-2">
              <Trophy size={14} />
              Team Selection
              {nominations.filter((n) => n.status === "accepted").length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === "selection"
                      ? "bg-[#06054e]/20 text-[#06054e]"
                      : "bg-yellow-400 text-[#06054e]"
                  }`}
                >
                  {nominations.filter((n) => n.status === "accepted").length} selected
                </span>
              )}
            </span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Nomination period banner — always shown when age group selected */}
        {ageGroup && (
          <PeriodBanner
            period={period}
            season={season}
            ageGroup={ageGroup}
            onPeriodSaved={setPeriod}
          />
        )}

        {/* Eligibility banner */}
        {eligibleData?.eligibilityRange && (
          <div className="mb-6">
            <EligibilityBanner
              range={eligibleData.eligibilityRange}
              ageGroup={ageGroup}
              season={season}
            />
          </div>
        )}

        {/* No age group selected */}
        {!ageGroup && (
          <div className="text-center py-24 text-slate-400 font-bold uppercase text-sm">
            Select an age group above to begin
          </div>
        )}

        {/* ── TAB: ELIGIBLE PLAYERS ──────────────────────────────────────── */}
        {activeTab === "eligible" && ageGroup && (
          <>
            {eligibleLoading && (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#06054e] animate-spin" />
              </div>
            )}

            {eligibleError && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 font-semibold">
                <AlertCircle size={18} />
                {eligibleError}
              </div>
            )}

            {!eligibleLoading && !eligibleError && eligibleData?.total === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <Users size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="font-black uppercase text-slate-300 text-lg">
                  No eligible members found
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  No registered members meet the age requirements for{" "}
                  <strong>{ageGroup}</strong> in {season}.
                </p>
              </div>
            )}

            {!eligibleLoading &&
              clubGroups.map((group) => {
                const isExpanded = expandedClubs.has(group.clubId);
                const nominated = group.members.filter((m) => m.alreadyNominated).length;

                return (
                  <div
                    key={group.clubId}
                    className="bg-white rounded-3xl shadow-sm border border-slate-100 mb-4 overflow-hidden"
                  >
                    {/* Club header */}
                    <button
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                      onClick={() =>
                        setExpandedClubs((prev) => {
                          const next = new Set(prev);
                          if (next.has(group.clubId)) next.delete(group.clubId);
                          else next.add(group.clubId);
                          return next;
                        })
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-[#06054e] text-white flex items-center justify-center font-black text-sm">
                          {group.clubName.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-black text-[#06054e] text-sm uppercase tracking-tight">
                            {group.clubName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {group.members.length} eligible
                            {nominated > 0 && (
                              <span className="ml-2 text-green-600 font-bold">
                                · {nominated} nominated
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={18} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                      )}
                    </button>

                    {/* Members table */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        <table className="w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-2 text-left text-[10px] font-black uppercase text-slate-400">
                                Name
                              </th>
                              <th className="px-4 py-2 text-center text-[10px] font-black uppercase text-slate-400">
                                Age ({season})
                              </th>
                              <th className="px-4 py-2 text-center text-[10px] font-black uppercase text-slate-400">
                                DOB
                              </th>
                              <th className="px-4 py-2 text-right text-[10px] font-black uppercase text-slate-400">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {group.members.map((member) => {
                              const isNominating = nominating.has(member.memberId);
                              return (
                                <tr
                                  key={member.memberId}
                                  className={`group ${
                                    member.alreadyNominated
                                      ? "bg-green-50/40"
                                      : "hover:bg-slate-50/50"
                                  }`}
                                >
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-slate-800">
                                        {member.displayName}
                                      </span>
                                      {member.alreadyNominated && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-black border border-green-200">
                                          <CheckCircle size={10} />
                                          Nominated
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400">
                                      {member.memberId}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-[#06054e]">
                                      {member.ageAtSeason}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-xs text-slate-500">
                                    {member.dateOfBirth
                                      ? new Date(
                                          member.dateOfBirth,
                                        ).toLocaleDateString("en-AU")
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {member.alreadyNominated ? (
                                      <span className="text-[10px] text-slate-400 font-semibold">
                                        Already nominated
                                      </span>
                                    ) : (
                                      <button
                                        disabled={isNominating}
                                        onClick={() => handleNominate(member)}
                                        className="px-4 py-1.5 bg-[#06054e] hover:bg-[#0a0870] text-white text-xs font-black uppercase rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 ml-auto"
                                      >
                                        {isNominating ? (
                                          <Loader2 size={12} className="animate-spin" />
                                        ) : null}
                                        Nominate
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}

        {/* ── TAB: NOMINATIONS ───────────────────────────────────────────── */}
        {activeTab === "nominations" && ageGroup && (
          <>
            {/* Status filter chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(["all", "pending", "accepted", "withdrawn", "rejected"] as const).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${
                      statusFilter === s
                        ? "bg-[#06054e] text-white"
                        : "bg-white border border-slate-200 text-slate-400 hover:text-[#06054e]"
                    }`}
                  >
                    {s === "all" ? `All (${nominations.length})` : s}
                  </button>
                ),
              )}
            </div>

            {nomLoading && (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#06054e] animate-spin" />
              </div>
            )}

            {!nomLoading && filteredNominations.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <CheckCircle size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="font-black uppercase text-slate-300 text-lg">
                  No nominations yet
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  Switch to the Eligible Players tab to start nominating.
                </p>
              </div>
            )}

            {!nomLoading && filteredNominations.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-400">
                        Player
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400">
                        Club
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400">
                        Age
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-[10px] font-black uppercase text-slate-400">
                        Nominated
                      </th>
                      <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredNominations.map((nom) => (
                      <tr
                        key={nom.nominationId ?? nom._id}
                        className="hover:bg-slate-50/50 group"
                      >
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-slate-800">
                            {nom.memberName}
                          </p>
                          <p className="text-[10px] text-slate-400">{nom.memberId}</p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {nom.clubName}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-[#06054e]">
                            {nom.ageAtSeason}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <StatusBadge status={nom.status} />
                        </td>
                        <td className="px-4 py-4 text-center text-xs text-slate-400">
                          {nom.nominatedAt
                            ? new Date(nom.nominatedAt).toLocaleDateString("en-AU")
                            : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={nom.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  nom,
                                  e.target.value as NominationStatus,
                                )
                              }
                              className="text-xs font-bold bg-slate-100 rounded-lg px-2 py-1 border-0 focus:ring-2 focus:ring-[#06054e] text-[#06054e]"
                            >
                              <option value="pending">Pending</option>
                              <option value="accepted">Accept</option>
                              <option value="rejected">Reject</option>
                              <option value="withdrawn">Withdraw</option>
                            </select>
                            <button
                              onClick={() => handleRemove(nom)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Remove nomination"
                            >
                              <XCircle size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TAB: TEAM SELECTION ──────────────────────────────────────────── */}
        {activeTab === "selection" && ageGroup && (
          <>
            {nominations.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <Trophy size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="font-black uppercase text-slate-300 text-lg">No nominations yet</p>
                <p className="text-slate-400 text-sm font-semibold mt-2">
                  Nominations for <strong>{ageGroup}</strong> will appear here once submitted.
                </p>
              </div>
            ) : (
              <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">

                {/* ── Left: Nomination cards ───────────────────────────────── */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black uppercase text-[#06054e] text-sm tracking-widest">
                      All Nominations ({nominations.length})
                    </h3>
                    <div className="flex items-center gap-3 text-xs font-black">
                      <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                        <Clock size={11} />
                        {nominations.filter((n) => n.status === "pending").length} pending
                      </span>
                      <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                        <CheckCircle size={11} />
                        {nominations.filter((n) => n.status === "accepted").length} accepted
                      </span>
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
                        <XCircle size={11} />
                        {nominations.filter((n) => n.status === "rejected").length} declined
                      </span>
                    </div>
                  </div>

                  {[...nominations]
                    .sort((a, b) => {
                      const statusOrder: Record<NominationStatus, number> = {
                        pending: 0, accepted: 1, rejected: 2, withdrawn: 3,
                        "pending-acceptance": 0, "on-ballot": 0, elected: 1, unsuccessful: 2,
                      };
                      if (a.status === "accepted" && b.status === "accepted") {
                        // Sort accepted by squadOrder, shadows last
                        if (a.isShadow !== b.isShadow) return a.isShadow ? 1 : -1;
                        return (a.squadOrder ?? 999) - (b.squadOrder ?? 999);
                      }
                      return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
                    })
                    .map((nom) => {
                      const isShadow = nom.isShadow;
                      const accepted = nominations.filter((n) => n.status === "accepted" && !n.isShadow)
                        .sort((a, b) => (a.squadOrder ?? 999) - (b.squadOrder ?? 999));
                      const squadIdx = accepted.findIndex((n) => (n._id ?? n.nominationId) === (nom._id ?? nom.nominationId));
                      return (
                        <div
                          key={nom._id ?? nom.nominationId}
                          className={`rounded-2xl border-2 p-5 transition-all ${
                            nom.status === "accepted" && isShadow
                              ? "border-amber-200 bg-amber-50"
                              : nom.status === "accepted"
                                ? "border-green-300 bg-green-50"
                                : nom.status === "rejected"
                                  ? "border-slate-200 bg-slate-50 opacity-70"
                                  : nom.status === "withdrawn"
                                    ? "border-slate-200 bg-slate-50 opacity-50"
                                    : "border-slate-200 bg-white hover:border-[#06054e]/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* Player info */}
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black ${
                                nom.status === "accepted" && isShadow ? "bg-amber-200 text-amber-800"
                                : nom.status === "accepted" ? "bg-green-200 text-green-800"
                                : nom.status === "rejected" ? "bg-slate-200 text-slate-500"
                                : "bg-[#06054e]/10 text-[#06054e]"
                              }`}>
                                {(nom.memberName ?? nom.nomineeName ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-[#06054e] text-base leading-tight">
                                    {nom.memberName ?? nom.nomineeName}
                                  </p>
                                  {nom.status === "accepted" && isShadow && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-full text-[10px] font-black uppercase">
                                      <Star size={9} />
                                      Shadow
                                    </span>
                                  )}
                                  {nom.status === "withdrawn" && nom.withdrawalInfo && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-[10px] font-black uppercase">
                                      {nom.withdrawalInfo.reason}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-bold mt-0.5">
                                  {nom.clubName}
                                  {nom.ageAtSeason ? (
                                    <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-black text-slate-600">
                                      Age {nom.ageAtSeason}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Nominated {nom.nominatedAt ? new Date(nom.nominatedAt).toLocaleDateString("en-AU") : "—"}
                                </p>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                              {nom.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(nom, "accepted")}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-sm"
                                  >
                                    <UserCheck size={13} />
                                    Select
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(nom, "rejected")}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase transition-all shadow-sm"
                                  >
                                    <XCircle size={13} />
                                    Decline
                                  </button>
                                </>
                              )}
                              {nom.status === "accepted" && (
                                <>
                                  {/* Reorder arrows (main squad only) */}
                                  {!isShadow && (
                                    <div className="flex flex-col gap-0.5">
                                      <button
                                        onClick={() => handleSquadReorder(nom, "up")}
                                        disabled={squadIdx <= 0}
                                        className="p-1 text-slate-300 hover:text-[#06054e] disabled:opacity-20 transition-colors"
                                        title="Move up"
                                      >
                                        <ArrowUp size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleSquadReorder(nom, "down")}
                                        disabled={squadIdx >= accepted.length - 1}
                                        className="p-1 text-slate-300 hover:text-[#06054e] disabled:opacity-20 transition-colors"
                                        title="Move down"
                                      >
                                        <ArrowDown size={13} />
                                      </button>
                                    </div>
                                  )}
                                  {/* Shadow toggle */}
                                  <button
                                    onClick={() => handleToggleShadow(nom)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all border ${
                                      isShadow
                                        ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                        : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-700"
                                    }`}
                                    title={isShadow ? "Move to main squad" : "Set as shadow/train-on"}
                                  >
                                    <Star size={11} />
                                    {isShadow ? "Main" : "Shadow"}
                                  </button>
                                  {/* Withdraw */}
                                  <button
                                    onClick={() => setWithdrawTarget(nom)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-black uppercase transition-all"
                                  >
                                    <UserMinus size={11} />
                                    Withdraw
                                  </button>
                                </>
                              )}
                              {nom.status === "rejected" && (
                                <button
                                  onClick={() => handleStatusChange(nom, "pending")}
                                  className="flex items-center gap-1.5 px-3 py-2 border-2 border-slate-200 text-slate-500 hover:border-[#06054e] hover:text-[#06054e] rounded-xl text-xs font-black uppercase transition-all"
                                >
                                  Restore
                                </button>
                              )}
                              {nom.status === "withdrawn" && (
                                <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-black uppercase">
                                  Withdrawn
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* ── Right: Selected Squad panel ──────────────────────────── */}
                <div className="lg:col-span-1">
                  <div className="sticky top-6 bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden">
                    {/* Panel header */}
                    <div className="bg-[#06054e] px-6 py-5">
                      <div className="flex items-center gap-3 mb-3">
                        <ShieldCheck size={20} className="text-yellow-400" />
                        <h3 className="font-black uppercase text-white text-sm tracking-widest">
                          Selected Squad
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-center">
                          <p className="text-2xl font-black text-yellow-400">
                            {nominations.filter((n) => n.status === "accepted" && !n.isShadow).length}
                          </p>
                          <p className="text-[10px] text-white/60 font-black uppercase">Squad</p>
                        </div>
                        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-center">
                          <p className="text-2xl font-black text-amber-300">
                            {nominations.filter((n) => n.status === "accepted" && n.isShadow).length}
                          </p>
                          <p className="text-[10px] text-white/60 font-black uppercase">Shadow</p>
                        </div>
                        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-center">
                          <p className="text-2xl font-black text-white">
                            {nominations.filter((n) => n.status === "pending").length}
                          </p>
                          <p className="text-[10px] text-white/60 font-black uppercase">Pending</p>
                        </div>
                      </div>
                    </div>

                    {/* Squad list */}
                    <div className="px-4 py-4 max-h-96 overflow-y-auto">
                      {nominations.filter((n) => n.status === "accepted").length === 0 ? (
                        <div className="text-center py-8">
                          <UserCheck size={28} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-xs font-black text-slate-400 uppercase">
                            No players selected yet
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Use the Select button on nominations to build the squad.
                          </p>
                        </div>
                      ) : (
                        <SquadPanel
                          nominations={nominations}
                          onWithdraw={setWithdrawTarget}
                        />
                      )}
                    </div>

                    {/* Finalise section */}
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                      {nominations.filter((n) => n.status === "pending").length > 0 && (
                        <>
                          {!finaliseConfirm ? (
                            <button
                              onClick={() => setFinaliseConfirm(true)}
                              disabled={nominations.filter((n) => n.status === "accepted").length === 0}
                              className="w-full flex items-center justify-center gap-2 py-3 bg-yellow-400 hover:bg-yellow-300 text-[#06054e] font-black uppercase text-xs rounded-2xl transition-all disabled:opacity-40 shadow-md"
                            >
                              <ShieldCheck size={16} />
                              Finalise Selection
                            </button>
                          ) : (
                            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                              <p className="text-xs font-black text-red-800 mb-1 uppercase">
                                Confirm finalise?
                              </p>
                              <p className="text-[10px] text-red-700 font-bold mb-3">
                                This will decline all {nominations.filter((n) => n.status === "pending").length} remaining pending nominations.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleFinalise}
                                  disabled={finalising}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition-all"
                                >
                                  {finalising ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                                  {finalising ? "Finalising…" : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setFinaliseConfirm(false)}
                                  className="flex-1 py-2 border-2 border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {nominations.filter((n) => n.status === "pending").length === 0 &&
                        nominations.filter((n) => n.status === "accepted").length > 0 && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                          <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                          <p className="text-xs font-black text-green-800">
                            Selection finalised — {nominations.filter((n) => n.status === "accepted").length} players selected.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* ── Withdrawal modal ─────────────────────────────────────────────────── */}
      {withdrawTarget && (
        <WithdrawalModal
          playerName={withdrawTarget.memberName ?? withdrawTarget.nomineeName ?? "Player"}
          onConfirm={handleConfirmWithdrawal}
          onCancel={() => setWithdrawTarget(null)}
        />
      )}

      {/* ── Reject notes modal ───────────────────────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-black uppercase text-[#06054e] mb-1">Reject Nomination</h3>
            <p className="text-sm text-slate-500 mb-4">
              Rejecting <strong>{rejectTarget.memberName ?? rejectTarget.nomineeName}</strong> — please provide a reason.
            </p>
            <textarea
              autoFocus
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (required)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleConfirmReject}
                disabled={!rejectNotes.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => { setRejectTarget(null); setRejectNotes(""); }}
                className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
