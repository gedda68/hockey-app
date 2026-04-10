"use client";

// app/admin/tournaments/page.tsx
// Representative Tournament / Competition management

import { useState, useEffect, useCallback } from "react";
import { sanitizeHtml } from "@/lib/utils/sanitize";
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
  DollarSign,
  Users,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import RichTextEditor from "@/app/(admin)/admin/components/RichTextEditor";
import type {
  Tournament,
  CreateTournamentRequest,
  TournamentDrawState,
  TournamentEntryEligibility,
  TournamentHostType,
} from "@/types/tournaments";
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

type TournamentFormState = Omit<
  CreateTournamentRequest,
  | "season"
  | "hostType"
  | "hostId"
  | "brandingAssociationId"
  | "entryRules"
> & {
  gender: string;
  nominationFee: number;
  hostType: TournamentHostType;
  hostId: string;
  brandingAssociationId: string;
  entryEligibility: TournamentEntryEligibility;
  allowedClubIdsText: string;
  maxTeamsInput: string;
  entryOpensAt: string;
  entryClosesAt: string;
  withdrawalDeadline: string;
  /** Whole dollars; converted to cents for API. */
  entryFeeDollars: number;
};

const EMPTY_FORM: TournamentFormState = {
  ageGroup: "",
  gender: "mixed",
  title: "",
  startDate: "",
  endDate: "",
  location: "",
  additionalInfo: "",
  nominationFee: 0,
  hostType: "association",
  hostId: "",
  brandingAssociationId: "",
  entryEligibility: "branding_association_clubs",
  allowedClubIdsText: "",
  maxTeamsInput: "",
  entryOpensAt: "",
  entryClosesAt: "",
  withdrawalDeadline: "",
  entryFeeDollars: 0,
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

  const [form, setForm] = useState<TournamentFormState>({
    ageGroup: initial?.ageGroup ?? "",
    gender: initial?.gender ?? "mixed",
    title: initial?.title ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
    location: initial?.location ?? "",
    additionalInfo: initial?.additionalInfo ?? "",
    nominationFee: initial?.nominationFee ?? 0,
    hostType: initial?.hostType ?? "association",
    hostId: initial?.hostId ?? "",
    brandingAssociationId:
      initial?.brandingAssociationId ?? initial?.hostId ?? "",
    entryEligibility:
      initial?.entryRules?.entryEligibility ?? "branding_association_clubs",
    allowedClubIdsText: initial?.entryRules?.allowedClubIds?.join(", ") ?? "",
    maxTeamsInput:
      initial?.entryRules?.maxTeams != null
        ? String(initial.entryRules.maxTeams)
        : "",
    entryOpensAt: initial?.entryRules?.entryOpensAt?.slice(0, 10) ?? "",
    entryClosesAt: initial?.entryRules?.entryClosesAt?.slice(0, 10) ?? "",
    withdrawalDeadline:
      initial?.entryRules?.withdrawalDeadline?.slice(0, 10) ?? "",
    entryFeeDollars: initial?.entryRules?.entryFeeCents
      ? Math.round(initial.entryRules.entryFeeCents) / 100
      : 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assocOptions, setAssocOptions] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [clubOptions, setClubOptions] = useState<{ id: string; name: string }[]>(
    [],
  );

  const tournamentApiId = initial?._id ?? initial?.tournamentId ?? "";
  const [drawSnap, setDrawSnap] = useState<TournamentDrawState | null>(null);
  const [drawBusy, setDrawBusy] = useState(false);
  const [drawSectionError, setDrawSectionError] = useState("");
  const [genKind, setGenKind] = useState<
    "snake_pools" | "single_elimination" | "pools_then_knockout"
  >("snake_pools");
  const [genPoolCount, setGenPoolCount] = useState("4");
  const [genRandom, setGenRandom] = useState(false);
  const [importSeasonCompetitionId, setImportSeasonCompetitionId] = useState("");
  const [importPublishedOnly, setImportPublishedOnly] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [aRes, cRes] = await Promise.all([
          fetch("/api/admin/associations?simple=true&limit=400&status=active"),
          fetch("/api/admin/clubs?simple=true&limit=600&status=active"),
        ]);
        const aJson = aRes.ok ? await aRes.json() : {};
        const cJson = cRes.ok ? await cRes.json() : {};
        if (cancelled) return;
        setAssocOptions(aJson.associations ?? []);
        setClubOptions(
          (cJson.clubs ?? []).map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          })),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !tournamentApiId) return;
    let cancelled = false;
    (async () => {
      setDrawBusy(true);
      setDrawSectionError("");
      try {
        const r = await fetch(
          `/api/admin/tournaments/${encodeURIComponent(tournamentApiId)}/draw`,
        );
        const j = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setDrawSectionError(typeof j.error === "string" ? j.error : "Could not load draw");
          setDrawSnap(null);
          return;
        }
        setDrawSnap(j.draw ?? null);
      } catch {
        if (!cancelled) {
          setDrawSectionError("Could not load draw");
          setDrawSnap(null);
        }
      } finally {
        if (!cancelled) setDrawBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, tournamentApiId]);

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.user) return;
        const u = data.user as {
          associationId?: string | null;
          clubId?: string | null;
        };
        setForm((f) => {
          if (f.hostId) return f;
          if (u.associationId) {
            return {
              ...f,
              hostType: "association",
              hostId: u.associationId,
              brandingAssociationId: u.associationId,
            };
          }
          if (u.clubId) {
            return { ...f, hostType: "club", hostId: u.clubId, brandingAssociationId: "" };
          }
          return f;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

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
    if (
      !form.ageGroup ||
      !form.title ||
      !form.startDate ||
      !form.endDate ||
      !form.location
    ) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.hostId.trim()) {
      setError("Select or enter a host (association or club).");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("End date must be on or after start date.");
      return;
    }
    if (
      form.entryEligibility === "explicit_clubs" &&
      !form.allowedClubIdsText.trim()
    ) {
      setError("Explicit club list: enter at least one club id (comma-separated).");
      return;
    }
    if (form.maxTeamsInput.trim()) {
      const n = parseInt(form.maxTeamsInput, 10);
      if (Number.isNaN(n) || n < 1) {
        setError("Max teams must be a positive integer or left blank for no cap.");
        return;
      }
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/tournaments/${initial!._id ?? initial!.tournamentId}`
        : "/api/admin/tournaments";
      const method = isEdit ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        ageGroup: form.ageGroup,
        gender: form.gender,
        title: form.title,
        startDate: form.startDate,
        endDate: form.endDate,
        location: form.location,
        additionalInfo: form.additionalInfo,
        nominationFee: form.nominationFee,
        hostType: form.hostType,
        hostId: form.hostId.trim(),
        season,
      };
      if (form.hostType === "association") {
        const b = form.brandingAssociationId.trim();
        if (b && b !== form.hostId.trim()) {
          payload.brandingAssociationId = b;
        }
      }

      const maxTeamsParsed = form.maxTeamsInput.trim()
        ? parseInt(form.maxTeamsInput, 10)
        : null;
      payload.entryRules = {
        entryEligibility: form.entryEligibility,
        allowedClubIds: form.allowedClubIdsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        maxTeams: maxTeamsParsed,
        entryOpensAt: form.entryOpensAt.trim() || null,
        entryClosesAt: form.entryClosesAt.trim() || null,
        withdrawalDeadline: form.withdrawalDeadline.trim() || null,
        entryFeeCents:
          form.entryFeeDollars > 0
            ? Math.round(form.entryFeeDollars * 100)
            : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function refreshDrawFromServer() {
    if (!tournamentApiId) return;
    setDrawBusy(true);
    setDrawSectionError("");
    try {
      const r = await fetch(
        `/api/admin/tournaments/${encodeURIComponent(tournamentApiId)}/draw`,
      );
      const j = await r.json();
      if (!r.ok) {
        setDrawSectionError(typeof j.error === "string" ? j.error : "Could not load draw");
        return;
      }
      setDrawSnap(j.draw ?? null);
    } catch {
      setDrawSectionError("Could not load draw");
    } finally {
      setDrawBusy(false);
    }
  }

  async function runDrawGenerate() {
    if (!tournamentApiId) return;
    setDrawBusy(true);
    setDrawSectionError("");
    try {
      const poolCount =
        genKind === "single_elimination"
          ? undefined
          : parseInt(genPoolCount, 10);
      if (
        genKind !== "single_elimination" &&
        (Number.isNaN(poolCount) || (poolCount ?? 0) < 2)
      ) {
        setDrawSectionError("Enter a pool count between 2 and 16.");
        return;
      }
      const r = await fetch(
        `/api/admin/tournaments/${encodeURIComponent(tournamentApiId)}/draw/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: genKind,
            poolCount,
            randomizeOrder: genRandom,
          }),
        },
      );
      const j = await r.json();
      if (!r.ok) {
        setDrawSectionError(typeof j.error === "string" ? j.error : "Generate failed");
        return;
      }
      setDrawSnap(j.draw ?? null);
    } catch {
      setDrawSectionError("Generate failed");
    } finally {
      setDrawBusy(false);
    }
  }

  async function runImportSeeds() {
    if (!tournamentApiId) return;
    const scid = importSeasonCompetitionId.trim();
    if (!scid) {
      setDrawSectionError("Enter a season competition id to import seeds.");
      return;
    }
    setDrawBusy(true);
    setDrawSectionError("");
    try {
      const r = await fetch(
        `/api/admin/tournaments/${encodeURIComponent(tournamentApiId)}/draw/import-seeds`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seasonCompetitionId: scid,
            publishedFixturesOnly: importPublishedOnly,
          }),
        },
      );
      const j = await r.json();
      if (!r.ok) {
        setDrawSectionError(typeof j.error === "string" ? j.error : "Import failed");
        return;
      }
      setDrawSnap(j.draw ?? null);
    } catch {
      setDrawSectionError("Import failed");
    } finally {
      setDrawBusy(false);
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

          {/* D1 — Host */}
          <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/80 p-4 space-y-4">
            <p className="text-xs font-black uppercase text-slate-500">
              Host & permissions <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tournaments are scoped to an <strong>association</strong> or <strong>club</strong> host.
              Only users with access to that host (or parent association for club events) can edit or delete.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Host type
                </label>
                <select
                  value={form.hostType}
                  onChange={(e) => {
                    const ht = e.target.value as TournamentHostType;
                    setForm((f) => ({
                      ...f,
                      hostType: ht,
                      hostId: "",
                      brandingAssociationId: ht === "association" ? "" : "",
                    }));
                  }}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-[#06054e]"
                >
                  <option value="association">Association</option>
                  <option value="club">Club</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  {form.hostType === "association" ? "Host association" : "Host club"}
                </label>
                <select
                  value={form.hostId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setForm((f) => ({
                      ...f,
                      hostId: id,
                      brandingAssociationId:
                        f.hostType === "association" ? id : f.brandingAssociationId,
                    }));
                  }}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-[#06054e]"
                >
                  <option value="">Select…</option>
                  {(form.hostType === "association" ? assocOptions : clubOptions).map(
                    (o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>
            {form.hostType === "association" && (
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Branding / permission association (optional)
                </label>
                <p className="text-[11px] text-slate-400 mb-1">
                  Defaults to the host. Choose a parent association if branding and RBAC should follow a different org node.
                </p>
                <select
                  value={
                    form.brandingAssociationId === form.hostId
                      ? ""
                      : form.brandingAssociationId
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      brandingAssociationId: v || f.hostId,
                    }));
                  }}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-[#06054e]"
                >
                  <option value="">Same as host</option>
                  {assocOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

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

          {/* Gender */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Tournament Gender
            </label>
            <div className="flex gap-2">
              {(["mixed", "male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, gender: g })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-black uppercase transition-all ${
                    form.gender === g
                      ? g === "male"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : g === "female"
                          ? "border-pink-500 bg-pink-50 text-pink-700"
                          : "border-[#06054e] bg-[#06054e]/10 text-[#06054e]"
                      : "border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  <Users size={13} />
                  {g === "mixed" ? "Mixed" : g === "male" ? "Male" : "Female"}
                </button>
              ))}
            </div>
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

          {/* Nomination Fee */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1">
              Nomination Fee (AUD)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.nominationFee}
                onChange={(e) => setForm({ ...form, nominationFee: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:border-[#06054e] focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Enter 0 if there is no nomination fee.</p>
          </div>

          {/* D2 — Entry rules */}
          <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-4 space-y-4">
            <p className="text-xs font-black uppercase text-emerald-800">
              Team entry rules (D2)
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Controls who can create <strong>team tournament entries</strong>, deadlines, caps, and a default
              team entry fee line item when a club registers.
            </p>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Who may enter
              </label>
              <select
                value={form.entryEligibility}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    entryEligibility: e.target.value as TournamentEntryEligibility,
                  }))
                }
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-[#06054e]"
              >
                <option value="branding_association_clubs">
                  Clubs under branding association
                </option>
                <option value="host_association_clubs">
                  Clubs under host association (association host only)
                </option>
                <option value="host_club_only">Host club only (club host only)</option>
                <option value="explicit_clubs">Explicit club list</option>
              </select>
            </div>
            {form.entryEligibility === "explicit_clubs" && (
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Allowed club ids (comma-separated)
                </label>
                <input
                  type="text"
                  value={form.allowedClubIdsText}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, allowedClubIdsText: e.target.value }))
                  }
                  placeholder="club-id-1, club-id-2"
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-mono"
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Max teams (blank = no cap)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.maxTeamsInput}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxTeamsInput: e.target.value }))
                  }
                  placeholder="e.g. 16"
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Team entry fee (AUD, optional)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.entryFeeDollars || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      entryFeeDollars: parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Entries open (from)
                </label>
                <input
                  type="date"
                  value={form.entryOpensAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, entryOpensAt: e.target.value }))
                  }
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Entries close
                </label>
                <input
                  type="date"
                  value={form.entryClosesAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, entryClosesAt: e.target.value }))
                  }
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Withdraw by
                </label>
                <input
                  type="date"
                  value={form.withdrawalDeadline}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, withdrawalDeadline: e.target.value }))
                  }
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* D3 — Draw */}
          {isEdit && (
            <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-black uppercase text-indigo-900 flex items-center gap-2">
                  <GitBranch size={14} />
                  Tournament draw (D3)
                </p>
                <button
                  type="button"
                  onClick={() => void refreshDrawFromServer()}
                  disabled={drawBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-white border-2 border-indigo-200 text-indigo-800 hover:bg-indigo-50 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={drawBusy ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assign pools (snake draft), single-elimination first round, or pools plus a cross-pool
                winner round. Seeds control ordering unless you randomize. Import seeds from a season
                ladder using each entry&apos;s team.
              </p>
              {drawSectionError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs font-semibold">
                  <AlertCircle size={14} />
                  {drawSectionError}
                </div>
              )}
              <div className="rounded-xl bg-white/80 border border-indigo-100 px-3 py-2.5 text-xs text-slate-700 space-y-1">
                <p>
                  <span className="font-bold text-slate-500">Format:</span>{" "}
                  {drawBusy && !drawSnap ? "…" : drawSnap?.format ?? "none"}
                </p>
                <p>
                  <span className="font-bold text-slate-500">Pools:</span>{" "}
                  {drawSnap?.pools?.length ?? 0} ·{" "}
                  <span className="font-bold text-slate-500">Knockout rows:</span>{" "}
                  {drawSnap?.knockoutMatches?.length ?? 0} ·{" "}
                  <span className="font-bold text-slate-500">Seeds:</span>{" "}
                  {drawSnap?.seeds ? Object.keys(drawSnap.seeds).length : 0}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Generate layout
                  </label>
                  <select
                    value={genKind}
                    onChange={(e) =>
                      setGenKind(
                        e.target.value as
                          | "snake_pools"
                          | "single_elimination"
                          | "pools_then_knockout",
                      )
                    }
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-bold text-[#06054e]"
                  >
                    <option value="snake_pools">Snake pools (round-robin pools)</option>
                    <option value="single_elimination">Single elimination (round 1)</option>
                    <option value="pools_then_knockout">Pools + cross-pool winners</option>
                  </select>
                </div>
                {genKind !== "single_elimination" && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Pool count
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={16}
                      value={genPoolCount}
                      onChange={(e) => setGenPoolCount(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genRandom}
                  onChange={(e) => setGenRandom(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Randomize team order (ignore seeds)
              </label>
              <button
                type="button"
                onClick={() => void runDrawGenerate()}
                disabled={drawBusy}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black uppercase bg-indigo-700 text-white hover:bg-indigo-800 disabled:opacity-50"
              >
                Generate draw
              </button>
              <div className="border-t border-indigo-100 pt-3 space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-500">
                  Import seeds from standings
                </p>
                <input
                  type="text"
                  value={importSeasonCompetitionId}
                  onChange={(e) => setImportSeasonCompetitionId(e.target.value)}
                  placeholder="seasonCompetitionId"
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-mono"
                />
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importPublishedOnly}
                    onChange={(e) => setImportPublishedOnly(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Published fixtures only (recommended)
                </label>
                <button
                  type="button"
                  onClick={() => void runImportSeeds()}
                  disabled={drawBusy}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black uppercase bg-white border-2 border-indigo-300 text-indigo-900 hover:bg-indigo-50 disabled:opacity-50"
                >
                  Import seeds
                </button>
              </div>
            </div>
          )}

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
            {/* Status + age group + gender */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${STATUS_STYLES[status]}`}
              >
                {status}
              </span>
              <span className="px-2.5 py-0.5 bg-[#06054e]/10 text-[#06054e] rounded-full text-[10px] font-black uppercase">
                {tournament.ageGroup}
              </span>
              {tournament.gender && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                  tournament.gender === "male"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : tournament.gender === "female"
                      ? "bg-pink-50 text-pink-700 border-pink-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  {tournament.gender}
                </span>
              )}
              {tournament.nominationFee != null && tournament.nominationFee > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-[10px] font-black uppercase">
                  <DollarSign size={9} />
                  {tournament.nominationFee.toFixed(2)} AUD
                </span>
              )}
              {!tournament.hostType && !tournament.hostId ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-amber-300 bg-amber-50 text-amber-800">
                  Legacy — set host on edit
                </span>
              ) : (
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border border-slate-200 bg-slate-50 text-slate-600 max-w-[200px] truncate"
                  title={`${tournament.hostType} ${tournament.hostId}`}
                >
                  {tournament.hostType === "club" ? "Club" : "Assoc"} ·{" "}
                  {tournament.hostId}
                </span>
              )}
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
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(tournament.additionalInfo) }}
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
          key={editingTournament?.tournamentId ?? "new"}
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
