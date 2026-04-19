"use client";

/**
 * Association-only guided setup for league (Competition + SeasonCompetition).
 * Club admins cannot use league builder APIs; this page lives under /admin/associations/[id].
 */

import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trophy,
  AlertTriangle,
  Users,
  Rocket,
} from "lucide-react";
import { isLeagueFixtureBulkReplaceEnabled } from "@/lib/platform/featureFlags";
import { LeagueHierarchyPolicyCallout } from "@/components/admin/associations/LeagueHierarchyPolicyCallout";
import { roundRobinRoundCounts } from "@/lib/competitions/roundRobin";
import { ladderFinalistCount } from "@/lib/competitions/seasonFinalsRules";
import type { FinalsSeriesFormat } from "@/lib/db/schemas/competition.schema";

type StepId =
  | "competition"
  | "season"
  | "divisions"
  | "rules"
  | "venues"
  | "generate"
  | "fixtures"
  | "publish";

type CompetitionRow = {
  competitionId: string;
  name: string;
};

type SeasonRow = {
  seasonCompetitionId: string;
  competitionId: string;
  season: string;
  status?: string;
  displayName?: string;
  logoUrl?: string;
};

type TeamRow = { teamId: string; name: string; clubId: string; clubName: string };

type ClubRow = { clubId: string; clubName: string };

type ClubVenueDraft = { venueName: string; addressLine: string; notes: string };

type BlockoutRow = { rowKey: string; startDate: string; endDate: string; label: string };

type DivisionRow = {
  divisionId: string;
  name: string;
  grade: string;
  gender: "" | "male" | "female" | "mixed";
  ageCategory: "" | "junior" | "senior" | "masters";
};

const defaultLadderRules = () => ({
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  pointsForfeitWin: 3,
  pointsForfeitLoss: 0,
  pointsShootoutWin: 2,
  pointsShootoutLoss: 1,
  pointsOvertimeWin: 2,
  pointsOvertimeLoss: 1,
  forfeitWinnerGoals: 3,
  forfeitLoserGoals: 0,
  tieBreakers: ["points", "gd", "gf"] as ("points" | "gd" | "gf" | "h2h")[],
  includeAbandonedInPlayed: false,
});

const STEPS: { id: StepId; label: string }[] = [
  { id: "competition", label: "Competition" },
  { id: "season", label: "Season" },
  { id: "divisions", label: "Divisions" },
  { id: "rules", label: "Points & forfeit" },
  { id: "venues", label: "Venues & calendar" },
  { id: "generate", label: "Draw" },
  { id: "fixtures", label: "Schedule" },
  { id: "publish", label: "Publish" },
];

function newRowKey() {
  return `blk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const FINALS_FORMAT_OPTIONS: { value: FinalsSeriesFormat; label: string }[] = [
  { value: "single_elimination", label: "Single elimination (knockout)" },
  { value: "double_elimination", label: "Double elimination" },
  { value: "page_playoff", label: "Page playoff" },
  { value: "best_of_3_series", label: "Best-of-3 series (finals rounds)" },
  { value: "best_of_5_series", label: "Best-of-5 series (finals rounds)" },
  {
    value: "best_of_3_then_best_of_5_grand_final",
    label: "Best-of-3 semi/finals, best-of-5 grand final",
  },
  { value: "round_robin_finals_pool", label: "Round-robin finals pool / mini league" },
  { value: "custom", label: "Custom (describe in notes)" },
];

function defaultFinalsDraft() {
  return {
    teamCountThreshold: 10,
    qualifierCountBelowThreshold: 4,
    qualifierCountAtOrAboveThreshold: 5,
    seriesFormat: "single_elimination" as FinalsSeriesFormat,
    seriesFormatNotes: "",
  };
}

function CalendarWindowRowsEditor({
  rows,
  setRows,
  title,
  description,
  emptyHint,
  addLabel,
  labelPlaceholder = "e.g. Label",
}: {
  rows: BlockoutRow[];
  setRows: Dispatch<SetStateAction<BlockoutRow[]>>;
  title: string;
  description?: string;
  emptyHint: string;
  addLabel: string;
  labelPlaceholder?: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-black uppercase text-slate-500 tracking-wide">{title}</h3>
      {description ? (
        <p className="text-xs font-bold text-slate-600 leading-relaxed">{description}</p>
      ) : null}
      {rows.length === 0 ? <p className="text-sm text-slate-500">{emptyHint}</p> : null}
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div
            key={row.rowKey}
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 p-4 bg-slate-50/80"
          >
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Start
              </label>
              <input
                type="date"
                className="w-full rounded-lg border px-2 py-2 text-sm font-bold font-mono"
                value={row.startDate}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...row, startDate: e.target.value };
                  setRows(next);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                End
              </label>
              <input
                type="date"
                className="w-full rounded-lg border px-2 py-2 text-sm font-bold font-mono"
                value={row.endDate}
                onChange={(e) => {
                  const next = [...rows];
                  next[idx] = { ...row, endDate: e.target.value };
                  setRows(next);
                }}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Label (optional)
              </label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border px-2 py-2 text-sm font-bold"
                  value={row.label}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, label: e.target.value };
                    setRows(next);
                  }}
                />
                <button
                  type="button"
                  className="text-xs font-black uppercase text-red-600 px-2 shrink-0"
                  onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="text-sm font-black uppercase text-[#06054e] underline"
        onClick={() =>
          setRows([...rows, { rowKey: newRowKey(), startDate: "", endDate: "", label: "" }])
        }
      >
        {addLabel}
      </button>
    </div>
  );
}

export default function LeagueCompetitionWizard({
  associationId,
  associationName,
  associationLevel,
  primaryColor = "#06054e",
  initialSeasonCompetitionId,
}: {
  associationId: string;
  associationName: string;
  /** Stored `associations.level` from DB; null if missing (policy callout skipped). */
  associationLevel: number | null;
  primaryColor?: string;
  initialSeasonCompetitionId?: string | null;
}) {
  const replaceAllowed = isLeagueFixtureBulkReplaceEnabled();

  const nationalOrStateBlocksNewSeasonLeague = useMemo(() => {
    if (associationLevel === null || !Number.isFinite(associationLevel)) return false;
    return associationLevel <= 1;
  }, [associationLevel]);

  const [step, setStep] = useState<StepId>("competition");
  const [loading, setLoading] = useState(false);
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [seasonComps, setSeasonComps] = useState<SeasonRow[]>([]);

  const [compMode, setCompMode] = useState<"new" | "existing">("new");
  const [newCompName, setNewCompName] = useState("");
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");

  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [seasonCompetitionId, setSeasonCompetitionId] = useState("");

  const [divisions, setDivisions] = useState<DivisionRow[]>([
    { divisionId: "div-1", name: "Division 1", grade: "", gender: "", ageCategory: "" },
  ]);

  const [ladderRules, setLadderRules] = useState(defaultLadderRules);
  const [resultApprovalRequired, setResultApprovalRequired] = useState(false);

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  /** Persisted season preference; fixture POST uses the same flag as `doubleRound`. */
  const [homeAndAway, setHomeAndAway] = useState(false);
  const [clubVenueDrafts, setClubVenueDrafts] = useState<Record<string, ClubVenueDraft>>({});
  const [blockoutRows, setBlockoutRows] = useState<BlockoutRow[]>([]);
  const [specialMatchRows, setSpecialMatchRows] = useState<BlockoutRow[]>([]);
  const [finalsSeriesDraft, setFinalsSeriesDraft] = useState(defaultFinalsDraft);
  const [replaceExisting, setReplaceExisting] = useState(false);

  const [fixtures, setFixtures] = useState<
    Array<{
      fixtureId: string;
      round: number;
      homeTeamId: string;
      awayTeamId: string;
      venueName: string | null;
      scheduledStart: string | null;
      published?: boolean;
      status?: string;
    }>
  >([]);

  const [seasonStatus, setSeasonStatus] = useState<string>("draft");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/competitions?owningAssociationId=${encodeURIComponent(associationId)}&include=all`,
        { credentials: "include" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load competitions");
      setCompetitions(
        (data.competitions ?? []).map((c: { competitionId: string; name: string }) => ({
          competitionId: c.competitionId,
          name: c.name,
        })),
      );
      setSeasonComps(data.seasonCompetitions ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [associationId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const sid = initialSeasonCompetitionId?.trim();
    if (!sid) return;
    setSeasonCompetitionId(sid);
    setStep("generate");
    void (async () => {
      const res = await fetch(`/api/admin/season-competitions/${encodeURIComponent(sid)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const sc = await res.json();
      setSelectedCompetitionId(String(sc.competitionId ?? ""));
      setSeason(String(sc.season ?? ""));
      setDisplayName(String(sc.displayName ?? ""));
      setLogoUrl(String(sc.logoUrl ?? ""));
      setResultApprovalRequired(Boolean(sc.resultApprovalRequired));
      if (sc.divisions?.length) {
        setDivisions(
          sc.divisions.map(
            (d: {
              divisionId: string;
              name: string;
              grade?: string;
              gender?: string;
              ageCategory?: string;
            }) => ({
              divisionId: d.divisionId,
              name: d.name,
              grade: d.grade ?? "",
              gender: (d.gender as DivisionRow["gender"]) || "",
              ageCategory: (d.ageCategory as DivisionRow["ageCategory"]) || "",
            }),
          ),
        );
      }
      if (sc.ladderRules && typeof sc.ladderRules === "object") {
        setLadderRules((prev) => ({ ...prev, ...sc.ladderRules }));
      }
      setSeasonStatus(String(sc.status ?? "draft"));
      setHomeAndAway(Boolean(sc.homeAndAway));
      if (Array.isArray(sc.blockoutPeriods) && sc.blockoutPeriods.length) {
        setBlockoutRows(
          sc.blockoutPeriods.map(
            (p: { startDate?: string; endDate?: string; label?: string }) => ({
              rowKey: newRowKey(),
              startDate: String(p.startDate ?? ""),
              endDate: String(p.endDate ?? ""),
              label: String(p.label ?? ""),
            }),
          ),
        );
      } else {
        setBlockoutRows([]);
      }
      if (Array.isArray(sc.specialMatchPeriods) && sc.specialMatchPeriods.length) {
        setSpecialMatchRows(
          sc.specialMatchPeriods.map(
            (p: { startDate?: string; endDate?: string; label?: string }) => ({
              rowKey: newRowKey(),
              startDate: String(p.startDate ?? ""),
              endDate: String(p.endDate ?? ""),
              label: String(p.label ?? ""),
            }),
          ),
        );
      } else {
        setSpecialMatchRows([]);
      }
      if (sc.finalsSeries && typeof sc.finalsSeries === "object") {
        const fs = sc.finalsSeries as Record<string, unknown>;
        const fmt = String(fs.seriesFormat ?? "");
        const allowed = new Set(FINALS_FORMAT_OPTIONS.map((o) => o.value));
        setFinalsSeriesDraft({
          teamCountThreshold: Number(fs.teamCountThreshold) || 10,
          qualifierCountBelowThreshold: Number(fs.qualifierCountBelowThreshold) || 4,
          qualifierCountAtOrAboveThreshold: Number(fs.qualifierCountAtOrAboveThreshold) || 5,
          seriesFormat: (allowed.has(fmt as FinalsSeriesFormat)
            ? fmt
            : "single_elimination") as FinalsSeriesFormat,
          seriesFormatNotes: String(fs.seriesFormatNotes ?? ""),
        });
      } else {
        setFinalsSeriesDraft(defaultFinalsDraft());
      }
      if (Array.isArray(sc.clubNominatedVenues)) {
        setClubVenueDrafts((prev) => {
          const next = { ...prev };
          for (const v of sc.clubNominatedVenues as Array<{
            clubId?: string;
            venueName?: string;
            addressLine?: string;
            notes?: string;
          }>) {
            const id = String(v.clubId ?? "");
            if (!id) continue;
            next[id] = {
              venueName: String(v.venueName ?? ""),
              addressLine: String(v.addressLine ?? ""),
              notes: String(v.notes ?? ""),
            };
          }
          return next;
        });
      }
    })();
  }, [initialSeasonCompetitionId]);

  const loadTeams = useCallback(async () => {
    const res = await fetch(
      `/api/admin/associations/${encodeURIComponent(associationId)}/league-builder-teams`,
      { credentials: "include" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load teams");
    setTeams(data.teams ?? []);
    const clubList: ClubRow[] = (data.clubs ?? []).map((c: { clubId: string; clubName: string }) => ({
      clubId: String(c.clubId ?? ""),
      clubName: String(c.clubName ?? "Club"),
    }));
    setClubs(clubList);
    setClubVenueDrafts((prev) => {
      const next = { ...prev };
      for (const c of clubList) {
        if (!next[c.clubId]) {
          next[c.clubId] = { venueName: "", addressLine: "", notes: "" };
        }
      }
      return next;
    });
  }, [associationId]);

  const loadFixtures = useCallback(async () => {
    if (!seasonCompetitionId) return;
    const res = await fetch(
      `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/fixtures`,
      { credentials: "include" },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load fixtures");
    setFixtures(data.fixtures ?? []);
  }, [seasonCompetitionId]);

  const loadSeasonMeta = useCallback(async () => {
    if (!seasonCompetitionId) return;
    const res = await fetch(
      `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}`,
      { credentials: "include" },
    );
    if (!res.ok) return;
    const sc = await res.json();
    setSeasonStatus(String(sc.status ?? "draft"));
  }, [seasonCompetitionId]);

  useEffect(() => {
    if ((step === "venues" || step === "generate") && seasonCompetitionId) {
      void loadTeams().catch((e) => toast.error(String(e.message)));
    }
  }, [step, seasonCompetitionId, loadTeams]);

  useEffect(() => {
    if (step === "fixtures" && seasonCompetitionId) {
      void loadFixtures().catch((e) => toast.error(String(e.message)));
    }
  }, [step, seasonCompetitionId, loadFixtures]);

  useEffect(() => {
    if (step === "publish" && seasonCompetitionId) {
      void loadSeasonMeta();
    }
  }, [step, seasonCompetitionId, loadSeasonMeta]);

  const stepIndex = useMemo(() => STEPS.findIndex((s) => s.id === step), [step]);

  const drawSchedulePreview = useMemo(() => {
    const n = selectedTeamIds.size;
    return { teamCount: n, ...roundRobinRoundCounts(n) };
  }, [selectedTeamIds]);

  const ladderFinalistPreview = useMemo(() => {
    const n = selectedTeamIds.size;
    if (n < 2) return null;
    return ladderFinalistCount(n, {
      teamCountThreshold: finalsSeriesDraft.teamCountThreshold,
      qualifierCountBelowThreshold: finalsSeriesDraft.qualifierCountBelowThreshold,
      qualifierCountAtOrAboveThreshold: finalsSeriesDraft.qualifierCountAtOrAboveThreshold,
      seriesFormat: finalsSeriesDraft.seriesFormat,
      seriesFormatNotes: finalsSeriesDraft.seriesFormatNotes.trim() || undefined,
    });
  }, [
    selectedTeamIds,
    finalsSeriesDraft.teamCountThreshold,
    finalsSeriesDraft.qualifierCountBelowThreshold,
    finalsSeriesDraft.qualifierCountAtOrAboveThreshold,
    finalsSeriesDraft.seriesFormat,
    finalsSeriesDraft.seriesFormatNotes,
  ]);

  const finalsFormatLabel = useMemo(
    () => FINALS_FORMAT_OPTIONS.find((o) => o.value === finalsSeriesDraft.seriesFormat)?.label,
    [finalsSeriesDraft.seriesFormat],
  );

  const goNext = () => {
    const i = stepIndex;
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].id);
  };

  const goPrev = () => {
    const i = stepIndex;
    if (i > 0) setStep(STEPS[i - 1].id);
  };

  const createCompetitionIfNeeded = async (): Promise<string> => {
    if (compMode === "existing") {
      if (!selectedCompetitionId.trim()) throw new Error("Select a competition");
      return selectedCompetitionId.trim();
    }
    if (!newCompName.trim()) throw new Error("Enter a league / competition name");
    const res = await fetch("/api/admin/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        kind: "competition",
        owningAssociationId: associationId,
        name: newCompName.trim(),
        sport: "hockey",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not create competition");
    const id = data.competition?.competitionId;
    if (!id) throw new Error("No competition id returned");
    await loadCatalog();
    setSelectedCompetitionId(id);
    return id;
  };

  const createSeasonCompetition = async (competitionIdForSeason: string) => {
    const compId = competitionIdForSeason.trim();
    if (!compId) throw new Error("Missing competition id for season");

    const divPayload = divisions
      .filter((d) => d.name.trim() && d.divisionId.trim())
      .map((d) => ({
        divisionId: d.divisionId.trim(),
        name: d.name.trim(),
        ...(d.grade.trim() ? { grade: d.grade.trim() } : {}),
        ...(d.gender ? { gender: d.gender } : {}),
        ...(d.ageCategory ? { ageCategory: d.ageCategory } : {}),
      }));

    const lr = {
      pointsWin: ladderRules.pointsWin,
      pointsDraw: ladderRules.pointsDraw,
      pointsLoss: ladderRules.pointsLoss,
      pointsForfeitWin: ladderRules.pointsForfeitWin,
      pointsForfeitLoss: ladderRules.pointsForfeitLoss,
      pointsShootoutWin: ladderRules.pointsShootoutWin,
      pointsShootoutLoss: ladderRules.pointsShootoutLoss,
      pointsOvertimeWin: ladderRules.pointsOvertimeWin,
      pointsOvertimeLoss: ladderRules.pointsOvertimeLoss,
      forfeitWinnerGoals: ladderRules.forfeitWinnerGoals,
      forfeitLoserGoals: ladderRules.forfeitLoserGoals,
      tieBreakers: ladderRules.tieBreakers,
      includeAbandonedInPlayed: ladderRules.includeAbandonedInPlayed,
    };

    const res = await fetch("/api/admin/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        kind: "seasonCompetition",
        competitionId: compId,
        owningAssociationId: associationId,
        season: season.trim(),
        divisions: divPayload,
        ladderRules: lr,
        resultApprovalRequired,
        logoUrl: logoUrl.trim() || undefined,
        displayName: displayName.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not create season competition");
    const id = data.seasonCompetition?.seasonCompetitionId;
    if (!id) throw new Error("No season competition id returned");
    setSeasonCompetitionId(id);
    await loadCatalog();
    toast.success("Season competition created");
  };

  const patchSeason = async (body: Record<string, unknown>) => {
    if (!seasonCompetitionId) throw new Error("No season competition");
    const res = await fetch(
      `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Update failed");
    await loadSeasonMeta();
    return data;
  };

  const handleSaveRulesAndDivisions = async () => {
    if (!seasonCompetitionId && nationalOrStateBlocksNewSeasonLeague) {
      toast.error(
        "Season club-vs-club leagues cannot be created for national or state associations (stored level ≤ 1). Use a regional association in this wizard, or use Tournaments for rep play.",
      );
      return;
    }
    setLoading(true);
    try {
      if (!seasonCompetitionId) {
        const compId = await createCompetitionIfNeeded();
        await createSeasonCompetition(compId);
        goNext();
        return;
      }
      const divPayload = divisions
        .filter((d) => d.name.trim() && d.divisionId.trim())
        .map((d) => ({
          divisionId: d.divisionId.trim(),
          name: d.name.trim(),
          ...(d.grade.trim() ? { grade: d.grade.trim() } : {}),
          ...(d.gender ? { gender: d.gender } : {}),
          ...(d.ageCategory ? { ageCategory: d.ageCategory } : {}),
        }));
      await patchSeason({
        divisions: divPayload,
        ladderRules: {
          pointsWin: ladderRules.pointsWin,
          pointsDraw: ladderRules.pointsDraw,
          pointsLoss: ladderRules.pointsLoss,
          pointsForfeitWin: ladderRules.pointsForfeitWin,
          pointsForfeitLoss: ladderRules.pointsForfeitLoss,
          pointsShootoutWin: ladderRules.pointsShootoutWin,
          pointsShootoutLoss: ladderRules.pointsShootoutLoss,
          pointsOvertimeWin: ladderRules.pointsOvertimeWin,
          pointsOvertimeLoss: ladderRules.pointsOvertimeLoss,
          forfeitWinnerGoals: ladderRules.forfeitWinnerGoals,
          forfeitLoserGoals: ladderRules.forfeitLoserGoals,
          tieBreakers: ladderRules.tieBreakers,
          includeAbandonedInPlayed: ladderRules.includeAbandonedInPlayed,
        },
        resultApprovalRequired,
        logoUrl: logoUrl.trim() || null,
        displayName: displayName.trim() || null,
      });
      toast.success("Season settings saved");
      goNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVenuesAndCalendar = async () => {
    if (!seasonCompetitionId) {
      toast.error("Create the season first (complete the rules step with Save & continue).");
      return;
    }
    setLoading(true);
    try {
      const collectWindows = (rows: BlockoutRow[], label: string) => {
        const out = rows
          .filter((r) => r.startDate.trim() && r.endDate.trim())
          .map((r) => ({
            startDate: r.startDate.trim(),
            endDate: r.endDate.trim(),
            ...(r.label.trim() ? { label: r.label.trim() } : {}),
          }));
        for (const p of out) {
          if (p.endDate < p.startDate) {
            throw new Error(
              `${label}: end date before start (${p.startDate} → ${p.endDate}). Fix or remove the row.`,
            );
          }
        }
        return out;
      };

      const periods = collectWindows(blockoutRows, "Calendar blockout");
      const specialPeriods = collectWindows(specialMatchRows, "Special match window");

      const th = Math.min(99, Math.max(2, Math.floor(finalsSeriesDraft.teamCountThreshold)));
      const qb = Math.min(24, Math.max(2, Math.floor(finalsSeriesDraft.qualifierCountBelowThreshold)));
      const qa = Math.min(
        24,
        Math.max(2, Math.floor(finalsSeriesDraft.qualifierCountAtOrAboveThreshold)),
      );

      const clubNominatedVenues = clubs
        .map((c) => {
          const d = clubVenueDrafts[c.clubId];
          if (!d?.venueName?.trim()) return null;
          return {
            clubId: c.clubId,
            venueName: d.venueName.trim(),
            ...(d.addressLine.trim() ? { addressLine: d.addressLine.trim() } : {}),
            ...(d.notes.trim() ? { notes: d.notes.trim() } : {}),
          };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null);

      await patchSeason({
        homeAndAway,
        blockoutPeriods: periods,
        specialMatchPeriods: specialPeriods,
        finalsSeries: {
          teamCountThreshold: th,
          qualifierCountBelowThreshold: qb,
          qualifierCountAtOrAboveThreshold: qa,
          seriesFormat: finalsSeriesDraft.seriesFormat,
          ...(finalsSeriesDraft.seriesFormatNotes.trim()
            ? { seriesFormatNotes: finalsSeriesDraft.seriesFormatNotes.trim() }
            : {}),
        },
        clubNominatedVenues,
      });
      toast.success("Venues & calendar saved");
      goNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!seasonCompetitionId) {
      toast.error("Create the season first (use steps 1–4)");
      return;
    }
    const ids = [...selectedTeamIds];
    if (ids.length < 2) {
      toast.error("Select at least two teams");
      return;
    }
    if (replaceExisting && !replaceAllowed) {
      toast.error(
        "Replace existing fixtures is disabled by server policy (FEATURE_DISABLE_LEAGUE_FIXTURE_BULK_REPLACE).",
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/fixtures/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            teamIds: ids,
            doubleRound: homeAndAway,
            replace: replaceExisting,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Generate failed");
      toast.success(`Generated ${data.count ?? 0} fixtures`);
      await loadFixtures();
      goNext();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const patchFixture = async (
    fixtureId: string,
    body: { venueName?: string | null; scheduledStart?: string | null; published?: boolean; status?: string },
  ) => {
    const res = await fetch(
      `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/fixtures/${encodeURIComponent(fixtureId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Fixture update failed");
    return data;
  };

  const teamLabel = (id: string) => teams.find((t) => t.teamId === id)?.name ?? id;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {associationLevel !== null && associationLevel <= 1 ? (
        <LeagueHierarchyPolicyCallout
          associationLevel={associationLevel}
          associationName={associationName}
        />
      ) : null}

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="rounded-xl p-3 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <Trophy size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#06054e]">League competition wizard</h1>
            <p className="text-sm font-bold text-slate-600 mt-1">
              {associationName} — set up a named league, season, ladder rules, round-robin draw, and
              publishing.{" "}
              <span className="text-slate-500">
                Postponements: use{" "}
                <strong className="text-slate-700">Match events</strong> or edit fixtures here (
                set status to postponed, adjust time/venue).
              </span>
            </p>
            <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
              Requires <code className="font-mono">competitions.manage</code> to create competitions
              and seasons; <code className="font-mono">competitions.fixtures</code> can generate draws
              and edit schedules.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 mb-5 text-xs font-bold text-slate-700 space-y-1">
          <div className="font-black uppercase text-slate-500 tracking-wide">
            League owner (owningAssociationId)
          </div>
          <div className="font-mono text-sm text-slate-900 break-all">{associationId}</div>
          <p className="text-slate-500 font-semibold leading-relaxed">
            New competitions and season leagues created in this wizard use this ID as{" "}
            <code className="font-mono text-[11px]">owningAssociationId</code> (aligned with your admin
            context for this page).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors ${
                s.id === step
                  ? "text-white"
                  : idx < stepIndex
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-slate-100 text-slate-500"
              }`}
              style={s.id === step ? { backgroundColor: primaryColor } : undefined}
            >
              {idx + 1}. {s.label}
            </button>
          ))}
        </div>

        {step === "competition" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-600">
              Name the league anything you like (e.g. &quot;Men&apos;s Premier&quot;, &quot;Juniors
              Turf&quot;). This becomes the durable <strong>competition</strong> record; each season is
              a separate <strong>season competition</strong>.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 font-bold text-sm">
                <input
                  type="radio"
                  checked={compMode === "new"}
                  onChange={() => setCompMode("new")}
                />
                Create new competition
              </label>
              <label className="flex items-center gap-2 font-bold text-sm">
                <input
                  type="radio"
                  checked={compMode === "existing"}
                  onChange={() => setCompMode("existing")}
                />
                Use existing
              </label>
            </div>
            {compMode === "new" ? (
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  League / competition name
                </label>
                <input
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold"
                  placeholder="e.g. Saturday Seniors Turf"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Competition
                </label>
                <select
                  value={selectedCompetitionId}
                  onChange={(e) => setSelectedCompetitionId(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold"
                >
                  <option value="">Select…</option>
                  {competitions.map((c) => (
                    <option key={c.competitionId} value={c.competitionId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {step === "season" && (
          <div className="space-y-4">
            {nationalOrStateBlocksNewSeasonLeague && !initialSeasonCompetitionId ? (
              <p className="text-sm font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                You can still name a <strong>base competition</strong> for branding, but saving a{" "}
                <strong>season league</strong> will be blocked at national/state level. Open{" "}
                <Link href="/admin/tournaments" className="underline font-black text-amber-950">
                  Tournaments
                </Link>{" "}
                for rep draws, or switch to a regional association (level ≥ 2) for club-vs-club seasons.
              </p>
            ) : null}
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Season year
              </label>
              <input
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full max-w-xs rounded-xl border-2 border-slate-200 px-4 py-3 font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Optional display label for this season
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold"
                placeholder="e.g. 2026 Men’s Premier"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                Optional league logo URL
              </label>
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold text-sm"
                placeholder="https://… or /icons/…"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={resultApprovalRequired}
                onChange={(e) => setResultApprovalRequired(e.target.checked)}
              />
              Require result approval before scores appear publicly
            </label>
          </div>
        )}

        {step === "divisions" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-600">
              Add one or more divisions (grades, gender, age category are optional).
            </p>
            <p className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
              After saving, club teams reference each division via{" "}
              <code className="font-mono">competitionDivisionId</code>. See{" "}
              <Link
                href={`/admin/associations/${associationId}/division-teams`}
                className="underline font-black"
              >
                Teams &amp; divisions
              </Link>{" "}
              for who is linked where.
            </p>
            {divisions.map((d, idx) => (
              <div
                key={d.divisionId}
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border border-slate-200 p-4 bg-slate-50/80"
              >
                <input
                  className="rounded-lg border px-2 py-2 text-sm font-bold font-mono"
                  placeholder="divisionId"
                  value={d.divisionId}
                  onChange={(e) => {
                    const next = [...divisions];
                    next[idx] = { ...d, divisionId: e.target.value };
                    setDivisions(next);
                  }}
                />
                <input
                  className="rounded-lg border px-2 py-2 text-sm font-bold"
                  placeholder="Display name"
                  value={d.name}
                  onChange={(e) => {
                    const next = [...divisions];
                    next[idx] = { ...d, name: e.target.value };
                    setDivisions(next);
                  }}
                />
                <input
                  className="rounded-lg border px-2 py-2 text-sm font-bold"
                  placeholder="Grade (optional)"
                  value={d.grade}
                  onChange={(e) => {
                    const next = [...divisions];
                    next[idx] = { ...d, grade: e.target.value };
                    setDivisions(next);
                  }}
                />
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-lg border px-2 py-2 text-sm font-bold"
                    value={d.gender}
                    onChange={(e) => {
                      const next = [...divisions];
                      next[idx] = { ...d, gender: e.target.value as DivisionRow["gender"] };
                      setDivisions(next);
                    }}
                  >
                    <option value="">Gender —</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="mixed">Mixed</option>
                  </select>
                  <button
                    type="button"
                    className="text-xs font-black uppercase text-red-600 px-2"
                    onClick={() => setDivisions(divisions.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-sm font-black uppercase text-[#06054e] underline"
              onClick={() =>
                setDivisions([
                  ...divisions,
                  {
                    divisionId: `div-${divisions.length + 1}`,
                    name: `Division ${divisions.length + 1}`,
                    grade: "",
                    gender: "",
                    ageCategory: "",
                  },
                ])
              }
            >
              + Add division
            </button>
          </div>
        )}

        {step === "rules" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-600">
              Ladder points and forfeit goal totals. Forfeits: when both forfeit goal fields are set,
              standings use them for goals for/against even if the match card shows 0–0.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {(
                [
                  ["pointsWin", "Points — win"],
                  ["pointsDraw", "Points — draw"],
                  ["pointsLoss", "Points — loss"],
                  ["pointsForfeitWin", "Points — forfeit win"],
                  ["pointsForfeitLoss", "Points — forfeit loss"],
                  ["pointsOvertimeWin", "Points — shootout / ET win"],
                  ["pointsOvertimeLoss", "Points — shootout / ET loss"],
                  ["pointsShootoutWin", "Points — SO win (legacy)"],
                  ["pointsShootoutLoss", "Points — SO loss (legacy)"],
                  ["forfeitWinnerGoals", "Forfeit — winner goals (GF)"],
                  ["forfeitLoserGoals", "Forfeit — loser goals (GA)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 font-mono font-bold"
                    value={ladderRules[key as keyof typeof ladderRules] as number}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setLadderRules((r) => ({ ...r, [key]: Number.isFinite(v) ? v : 0 }));
                    }}
                  />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={ladderRules.includeAbandonedInPlayed}
                onChange={(e) =>
                  setLadderRules((r) => ({ ...r, includeAbandonedInPlayed: e.target.checked }))
                }
              />
              Count abandoned matches in played (goals only)
            </label>
          </div>
        )}

        {step === "venues" && (
          <div className="space-y-6">
            {!seasonCompetitionId && (
              <p className="text-sm font-bold text-amber-800">
                Complete the rules step with <strong>Save &amp; continue</strong> first so the season
                exists, then you can record venues and calendar blockouts.
              </p>
            )}
            <p className="text-xs font-bold text-violet-900 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
              Epic V master data: maintain canonical venues &amp; pitches in{" "}
              <Link
                href={`/admin/associations/${associationId}/venues`}
                className="underline font-black"
              >
                Venues &amp; pitches
              </Link>{" "}
              (optional today; fixture grid can still use free-text until V2 links pitches).
            </p>
            <p className="text-sm font-bold text-slate-600">
              Nominate each club&apos;s <strong>league home ground</strong>, record dates to{" "}
              <strong>avoid</strong> for the regular draw (holidays, school breaks), dates reserved
              for <strong>showcase / special</strong> matches, and <strong>finals ladder rules</strong>{" "}
              (how many teams qualify by league size and what series format applies). Dates use{" "}
              <span className="font-mono">YYYY-MM-DD</span>.
            </p>

            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={homeAndAway}
                onChange={(e) => setHomeAndAway(e.target.checked)}
              />
              Full home-and-away season (double round-robin — each pair plays twice, reversed)
            </label>

            <CalendarWindowRowsEditor
              rows={blockoutRows}
              setRows={setBlockoutRows}
              title="Calendar blockouts"
              description="Dates when regular league games should not be scheduled (public holidays, school holidays, venue closures)."
              emptyHint="No blockouts yet — add rows as needed."
              addLabel="+ Add blockout period"
              labelPlaceholder="e.g. Easter long weekend"
            />

            <CalendarWindowRowsEditor
              rows={specialMatchRows}
              setRows={setSpecialMatchRows}
              title="Special / showcase match windows"
              description="Reserve dates for fixtures that sit outside the normal draw (e.g. mid-season top-two showcase, charity round). Same date range shape as blockouts; stored separately for planners."
              emptyHint="No special-match windows yet."
              addLabel="+ Add special match window"
              labelPlaceholder="e.g. Top 2 ladder showcase"
            />

            <div className="space-y-3 rounded-xl border border-slate-200 p-4 bg-slate-50/80">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wide">
                Finals series (ladder → finals)
              </h3>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                Set how many teams qualify from the ladder based on <strong>entered team count</strong>
                . Example: threshold 10 — fewer than 10 teams → top 4; 10 or more → top 5. Pick the
                bracket / series format; use notes for local bylaws.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    Team count threshold
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={99}
                    className="w-full rounded-lg border px-2 py-2 text-sm font-mono font-bold"
                    value={finalsSeriesDraft.teamCountThreshold}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setFinalsSeriesDraft((d) => ({
                        ...d,
                        teamCountThreshold: Number.isFinite(v) ? v : d.teamCountThreshold,
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    Finalists if below threshold
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={24}
                    className="w-full rounded-lg border px-2 py-2 text-sm font-mono font-bold"
                    value={finalsSeriesDraft.qualifierCountBelowThreshold}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setFinalsSeriesDraft((d) => ({
                        ...d,
                        qualifierCountBelowThreshold: Number.isFinite(v)
                          ? v
                          : d.qualifierCountBelowThreshold,
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                    Finalists at or above threshold
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={24}
                    className="w-full rounded-lg border px-2 py-2 text-sm font-mono font-bold"
                    value={finalsSeriesDraft.qualifierCountAtOrAboveThreshold}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setFinalsSeriesDraft((d) => ({
                        ...d,
                        qualifierCountAtOrAboveThreshold: Number.isFinite(v)
                          ? v
                          : d.qualifierCountAtOrAboveThreshold,
                      }));
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Finals format
                </label>
                <select
                  className="w-full max-w-xl rounded-lg border px-2 py-2 text-sm font-bold"
                  value={finalsSeriesDraft.seriesFormat}
                  onChange={(e) =>
                    setFinalsSeriesDraft((d) => ({
                      ...d,
                      seriesFormat: e.target.value as FinalsSeriesFormat,
                    }))
                  }
                >
                  {FINALS_FORMAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1">
                  Format notes (optional)
                </label>
                <textarea
                  className="w-full min-h-[72px] rounded-lg border px-2 py-2 text-sm font-bold"
                  placeholder="e.g. Semi best-of-1 at higher seed; GF neutral venue"
                  value={finalsSeriesDraft.seriesFormatNotes}
                  onChange={(e) =>
                    setFinalsSeriesDraft((d) => ({ ...d, seriesFormatNotes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wide">
                Club home grounds
              </h3>
              {clubs.length === 0 ? (
                <p className="p-4 text-sm text-slate-500 rounded-xl border border-slate-200">
                  No member clubs found yet. Once clubs sit under this association, list them here
                  for venue nomination.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 divide-y">
                  {clubs.map((c) => {
                    const d = clubVenueDrafts[c.clubId] ?? {
                      venueName: "",
                      addressLine: "",
                      notes: "",
                    };
                    return (
                      <div key={c.clubId} className="p-4 space-y-2 bg-white">
                        <p className="text-sm font-black text-[#06054e]">{c.clubName}</p>
                        <input
                          className="w-full rounded-lg border px-2 py-2 text-sm font-bold"
                          placeholder="Venue name (required to save this club)"
                          value={d.venueName}
                          onChange={(e) => {
                            const v = e.target.value;
                            setClubVenueDrafts((prev) => ({
                              ...prev,
                              [c.clubId]: { ...d, venueName: v },
                            }));
                          }}
                        />
                        <input
                          className="w-full rounded-lg border px-2 py-2 text-sm font-bold"
                          placeholder="Address / directions (optional)"
                          value={d.addressLine}
                          onChange={(e) => {
                            const v = e.target.value;
                            setClubVenueDrafts((prev) => ({
                              ...prev,
                              [c.clubId]: { ...d, addressLine: v },
                            }));
                          }}
                        />
                        <input
                          className="w-full rounded-lg border px-2 py-2 text-xs font-bold text-slate-700"
                          placeholder="Notes — pitch number, lights, parking (optional)"
                          value={d.notes}
                          onChange={(e) => {
                            const v = e.target.value;
                            setClubVenueDrafts((prev) => ({
                              ...prev,
                              [c.clubId]: { ...d, notes: v },
                            }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "generate" && (
          <div className="space-y-4">
            {!seasonCompetitionId && (
              <p className="text-sm font-bold text-amber-800">
                Create the season first: use <strong>Save &amp; continue</strong> on the rules step, then
                save <strong>Venues &amp; calendar</strong> before generating your first draw (you can
                revisit that step later to adjust blockouts or home grounds).
              </p>
            )}
            <p className="text-sm font-bold text-slate-600">
              Select teams from member clubs of this association. Round-robin uses the circle method.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 divide-y">
              {teams.length === 0 && (
                <p className="p-4 text-sm text-slate-500">No teams found for clubs under this association.</p>
              )}
              {teams.map((t) => (
                <label
                  key={t.teamId}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeamIds.has(t.teamId)}
                    onChange={() => {
                      const next = new Set(selectedTeamIds);
                      if (next.has(t.teamId)) next.delete(t.teamId);
                      else next.add(t.teamId);
                      setSelectedTeamIds(next);
                    }}
                  />
                  <span className="font-bold">{t.name}</span>
                  <span className="text-xs text-slate-500">{t.clubName}</span>
                </label>
              ))}
            </div>
            {drawSchedulePreview.teamCount >= 2 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 space-y-2">
                <p>
                  With <strong>{drawSchedulePreview.teamCount}</strong> teams:{" "}
                  <strong>{drawSchedulePreview.roundsSingle}</strong> rounds /{" "}
                  <strong>{drawSchedulePreview.fixturesSingle}</strong> fixtures (single), or{" "}
                  <strong>{drawSchedulePreview.roundsHomeAndAway}</strong> rounds /{" "}
                  <strong>{drawSchedulePreview.fixturesHomeAndAway}</strong> fixtures (home-and-away).
                </p>
                {ladderFinalistPreview != null ? (
                  <p className="text-slate-600 border-t border-slate-200 pt-2">
                    <span className="text-slate-800">Finals ladder cut</span> (from Venues &amp;
                    calendar): top <strong className="text-slate-900">{ladderFinalistPreview}</strong>{" "}
                    teams — format:{" "}
                    <strong className="text-slate-900">{finalsFormatLabel ?? "—"}</strong>
                    {finalsSeriesDraft.teamCountThreshold ? (
                      <>
                        {" "}
                        (threshold{" "}
                        <strong>{finalsSeriesDraft.teamCountThreshold}</strong> teams: fewer than that
                        → top {finalsSeriesDraft.qualifierCountBelowThreshold}; otherwise → top{" "}
                        {finalsSeriesDraft.qualifierCountAtOrAboveThreshold})
                      </>
                    ) : null}
                    .
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-500">
                Select at least two teams to preview round and fixture counts.
              </p>
            )}
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={homeAndAway}
                onChange={(e) => {
                  const v = e.target.checked;
                  setHomeAndAway(v);
                  if (seasonCompetitionId) {
                    void patchSeason({ homeAndAway: v }).catch((err) =>
                      toast.error(err instanceof Error ? err.message : String(err)),
                    );
                  }
                }}
              />
              Home-and-away (double round-robin)
            </label>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                />
                Replace existing generated fixtures for this season
              </label>
              {!replaceAllowed && (
                <p className="text-xs font-bold text-amber-900 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Bulk replace is currently disabled on this server.
                </p>
              )}
            </div>
          </div>
        )}

        {step === "fixtures" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-600">
              Set venue and start time per fixture. Use status <strong>postponed</strong> when
              rescheduling after generate.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 font-black uppercase text-xs text-slate-600">
                  <tr>
                    <th className="px-2 py-2 text-left">Rd</th>
                    <th className="px-2 py-2 text-left">Home</th>
                    <th className="px-2 py-2 text-left">Away</th>
                    <th className="px-2 py-2 text-left">Venue</th>
                    <th className="px-2 py-2 text-left">Start</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Pub</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {fixtures.map((fx) => (
                    <FixtureRowEditor
                      key={fx.fixtureId}
                      fx={fx}
                      homeName={teamLabel(fx.homeTeamId)}
                      awayName={teamLabel(fx.awayTeamId)}
                      onSave={async (patch) => {
                        try {
                          await patchFixture(fx.fixtureId, patch);
                          toast.success("Fixture saved");
                          await loadFixtures();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : String(e));
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              {seasonCompetitionId ? (
                <Link
                  href={`/admin/associations/${associationId}/fixtures-console?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`}
                  className="inline-flex text-sm font-black text-emerald-900 underline"
                >
                  Fixture operations console (filters, bulk publish, CSV) →
                </Link>
              ) : null}
              <Link
                href={`/admin/associations/${associationId}/match-events`}
                className="inline-flex text-sm font-black text-[#06054e] underline"
              >
                Open match events editor for results &amp; stats →
              </Link>
              {seasonCompetitionId ? (
                <Link
                  href={`/admin/competition-awards?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`}
                  className="inline-flex text-sm font-black text-emerald-800 underline"
                >
                  Competition awards (player of match, season awards) →
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {step === "publish" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-600">
              Current status: <strong>{seasonStatus}</strong>. Publishing allows public fixtures
              lists (subject to each fixture&apos;s published flag).
            </p>
            {seasonCompetitionId ? (
              <p className="text-sm font-bold text-slate-600">
                Day-to-day publish windows and CSV export:{" "}
                <Link
                  href={`/admin/associations/${associationId}/fixtures-console?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`}
                  className="text-emerald-900 underline font-black"
                >
                  Fixture operations console
                </Link>
                .
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!seasonCompetitionId || seasonStatus !== "draft" || loading}
                className="rounded-xl px-5 py-3 font-black text-white disabled:opacity-40"
                style={{ backgroundColor: primaryColor }}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await patchSeason({ status: "published" });
                    toast.success("Season competition published");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : String(e));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <Rocket className="inline mr-2" size={18} />
                Publish season competition
              </button>
              <button
                type="button"
                disabled={!seasonCompetitionId || seasonStatus !== "published" || loading}
                className="rounded-xl border-2 border-slate-300 px-5 py-3 font-black text-slate-800 disabled:opacity-40"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await patchSeason({ status: "in_progress" });
                    toast.success("Marked in progress");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : String(e));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Mark in progress
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3 mt-8 pt-6 border-t border-slate-200">
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIndex === 0 || loading}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-2.5 font-black text-sm disabled:opacity-40"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <div className="flex gap-2">
            {step === "rules" && (
              <button
                type="button"
                disabled={
                  loading ||
                  (!seasonCompetitionId && nationalOrStateBlocksNewSeasonLeague)
                }
                onClick={() => void handleSaveRulesAndDivisions()}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 text-[#06054e] px-5 py-2.5 font-black text-sm hover:bg-yellow-300 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                Save &amp; continue
              </button>
            )}
            {step === "venues" && (
              <button
                type="button"
                disabled={loading || !seasonCompetitionId}
                onClick={() => void handleSaveVenuesAndCalendar()}
                className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 text-[#06054e] px-5 py-2.5 font-black text-sm hover:bg-yellow-300 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                Save &amp; continue
              </button>
            )}
            {step === "generate" && (
              <button
                type="button"
                disabled={loading || !seasonCompetitionId}
                onClick={() => void handleGenerate()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-2.5 font-black text-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />}
                Generate draw
              </button>
            )}
            {(step === "competition" ||
              step === "season" ||
              step === "divisions" ||
              step === "fixtures") && (
              <button
                type="button"
                disabled={loading}
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-black text-sm text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Next
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FixtureRowEditor({
  fx,
  homeName,
  awayName,
  onSave,
}: {
  fx: {
    fixtureId: string;
    round: number;
    homeTeamId: string;
    awayTeamId: string;
    venueName: string | null;
    scheduledStart: string | null;
    published?: boolean;
    status?: string;
  };
  homeName: string;
  awayName: string;
  onSave: (patch: {
    venueName?: string | null;
    scheduledStart?: string | null;
    published?: boolean;
    status?: string;
  }) => Promise<void>;
}) {
  const [venue, setVenue] = useState(fx.venueName ?? "");
  const [start, setStart] = useState(
    fx.scheduledStart ? fx.scheduledStart.slice(0, 16) : "",
  );
  const [published, setPublished] = useState(Boolean(fx.published));
  const [status, setStatus] = useState(fx.status ?? "scheduled");

  return (
    <tr className="border-t border-slate-100">
      <td className="px-2 py-2 font-mono">{fx.round}</td>
      <td className="px-2 py-2 font-bold text-xs">{homeName}</td>
      <td className="px-2 py-2 font-bold text-xs">{awayName}</td>
      <td className="px-2 py-2">
        <input
          className="w-36 sm:w-44 rounded border px-1 py-1 text-xs font-bold"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="datetime-local"
          className="w-40 rounded border px-1 py-1 text-xs font-mono"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </td>
      <td className="px-2 py-2">
        <select
          className="rounded border px-1 py-1 text-xs font-bold"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="scheduled">scheduled</option>
          <option value="postponed">postponed</option>
          <option value="in_progress">in_progress</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </td>
      <td className="px-2 py-2">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          className="text-xs font-black uppercase text-[#06054e] underline"
          onClick={() =>
            void onSave({
              venueName: venue.trim() || null,
              scheduledStart: start ? new Date(start).toISOString() : null,
              published,
              status: status as "scheduled" | "postponed" | "in_progress" | "completed" | "cancelled",
            })
          }
        >
          Save
        </button>
      </td>
    </tr>
  );
}
