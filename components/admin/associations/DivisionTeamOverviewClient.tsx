"use client";

/**
 * N4 — Registrar-facing view: which club teams sit in which season league + division,
 * canonical ids vs legacy `competition` label, quick PATCH via association league-context API.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Loader2,
  Users,
} from "lucide-react";

type DivisionDef = {
  divisionId: string;
  name: string;
  grade?: string;
  gender?: string;
  ageCategory?: string;
};

type TeamRow = {
  teamId: string;
  clubId: string;
  clubName: string;
  name: string;
  season: string;
  seasonCompetitionId: string | null;
  competitionDivisionId: string | null;
  competition: string | null;
  divisionLevel: number;
  divisionName: string;
  grade?: string | null;
  status: string;
};

type SeasonBlock = {
  seasonCompetitionId: string;
  competitionId: string;
  season: string;
  displayName: string | null;
  status: string;
  divisions: DivisionDef[];
  teamsByDivision: Record<string, TeamRow[]>;
  teamsUnassigned: TeamRow[];
};

type OverviewPayload = {
  associationId: string;
  clubs: { clubId: string; clubName: string }[];
  seasons: SeasonBlock[];
  teamsOrphanSeason: TeamRow[];
};

function shortId(id: string, n = 10) {
  if (!id) return "—";
  return id.length <= n ? id : `${id.slice(0, n)}…`;
}

export default function DivisionTeamOverviewClient({
  associationId,
  associationName,
  primaryColor = "#06054e",
}: {
  associationId: string;
  associationName: string;
  primaryColor?: string;
}) {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [clubFilter, setClubFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [draftDivision, setDraftDivision] = useState<Record<string, string>>({});
  const [orphanSeasonPick, setOrphanSeasonPick] = useState<Record<string, string>>({});
  const [orphanDivisionPick, setOrphanDivisionPick] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/division-team-overview`,
        { credentials: "include" },
      );
      const j = (await res.json()) as OverviewPayload & { error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load overview");
      setData(j);
      const nextDraft: Record<string, string> = {};
      const walk = (rows: TeamRow[]) => {
        for (const t of rows) {
          nextDraft[t.teamId] = t.competitionDivisionId ?? "";
        }
      };
      for (const s of j.seasons ?? []) {
        for (const rows of Object.values(s.teamsByDivision ?? {})) walk(rows);
        walk(s.teamsUnassigned ?? []);
      }
      walk(j.teamsOrphanSeason ?? []);
      setDraftDivision(nextDraft);
      const oSeason: Record<string, string> = {};
      const oDiv: Record<string, string> = {};
      for (const t of j.teamsOrphanSeason ?? []) {
        const match = j.seasons.find((s) => s.season === t.season);
        const first = j.seasons[0];
        const pick = match ?? first;
        if (pick) {
          oSeason[t.teamId] = pick.seasonCompetitionId;
          const d0 = pick.divisions[0];
          oDiv[t.teamId] = d0?.divisionId ?? "";
        }
      }
      setOrphanSeasonPick(oSeason);
      setOrphanDivisionPick(oDiv);
      if (j.seasons?.length) {
        setExpanded(new Set([j.seasons[0].seasonCompetitionId]));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [associationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSeason = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const patchTeam = async (
    team: TeamRow,
    body: Record<string, unknown>,
  ) => {
    setSaving(team.teamId);
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/teams/${encodeURIComponent(team.teamId)}/league-context`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Update failed");
      toast.success("Team league context updated.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  const passesClub = (t: TeamRow) =>
    !clubFilter.trim() || t.clubId === clubFilter.trim();

  const renderTeamRow = (team: TeamRow, season: SeasonBlock, divOptions: DivisionDef[]) => {
    if (!passesClub(team)) return null;
    const sel = draftDivision[team.teamId] ?? "";
    const mismatch =
      team.seasonCompetitionId &&
      team.seasonCompetitionId !== season.seasonCompetitionId;
    return (
      <tr key={team.teamId} className="border-t border-slate-100 hover:bg-slate-50/80">
        <td className="px-3 py-2 font-bold text-slate-900">
          {team.name}
          <div className="text-[10px] font-mono text-slate-500">{team.teamId}</div>
        </td>
        <td className="px-3 py-2 text-sm font-bold text-slate-700">
          <Link
            href={`/admin/clubs/${encodeURIComponent(team.clubId)}`}
            className="text-[#06054e] underline"
          >
            {team.clubName}
          </Link>
        </td>
        <td className="px-3 py-2 text-xs text-slate-600 max-w-[160px]">
          <div className="font-bold text-slate-800">Legacy label</div>
          <div className="truncate">{team.competition ?? "—"}</div>
        </td>
        <td className="px-3 py-2 text-xs font-mono text-slate-700">
          <div className="font-black text-slate-500 uppercase text-[10px]">seasonCompetitionId</div>
          {team.seasonCompetitionId ? shortId(team.seasonCompetitionId) : "—"}
          {mismatch ? (
            <div className="text-amber-800 font-bold mt-1">Differs from section</div>
          ) : null}
        </td>
        <td className="px-3 py-2">
          <select
            className="w-full max-w-[220px] rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold"
            value={sel}
            onChange={(e) =>
              setDraftDivision((d) => ({ ...d, [team.teamId]: e.target.value }))
            }
          >
            <option value="">(No division id)</option>
            {divOptions.map((d) => (
              <option key={d.divisionId} value={d.divisionId}>
                {d.name} · {shortId(d.divisionId, 8)}
              </option>
            ))}
          </select>
          <div className="text-[10px] text-slate-500 mt-1">
            Roster division: {team.divisionName} (L{team.divisionLevel})
          </div>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <button
            type="button"
            disabled={saving === team.teamId}
            className="rounded-lg px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
            style={{ backgroundColor: primaryColor }}
            onClick={() => {
              const nextDiv = (draftDivision[team.teamId] ?? "").trim();
              const cur = team.competitionDivisionId ?? "";
              const divPayload =
                nextDiv === (cur || "") ? undefined : nextDiv || null;
              void patchTeam(team, {
                seasonCompetitionId: season.seasonCompetitionId,
                ...(divPayload !== undefined
                  ? { competitionDivisionId: divPayload }
                  : {}),
              });
            }}
          >
            {saving === team.teamId ? <Loader2 className="h-3 w-3 animate-spin inline" /> : null}
            Save link
          </button>
          <button
            type="button"
            disabled={saving === team.teamId}
            className="ml-2 rounded-lg border border-slate-300 px-2 py-1.5 text-[10px] font-black uppercase text-slate-700"
            onClick={() =>
              void patchTeam(team, {
                seasonCompetitionId: season.seasonCompetitionId,
                syncCompetitionLabel: true,
              })
            }
          >
            Sync label
          </button>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-600 font-bold">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading division overview…
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm font-bold text-red-700">Could not load data for this association.</p>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className="rounded-xl p-3 text-white shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#06054e]">Teams &amp; league divisions</h1>
            <p className="text-sm font-bold text-slate-600 mt-1">
              {associationName} — each <strong>season competition</strong> lists configured{" "}
              <strong>divisions</strong> (from league setup) and which <strong>club teams</strong>{" "}
              reference them via <code className="font-mono text-xs">seasonCompetitionId</code> +{" "}
              <code className="font-mono text-xs">competitionDivisionId</code>. The legacy{" "}
              <code className="font-mono text-xs">competition</code> string is display-only; prefer
              canonical ids for fixtures and standings.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-black">
              <Link
                href={`/admin/associations/${encodeURIComponent(associationId)}/competitions`}
                className="text-emerald-900 underline"
              >
                League setup (edit divisions)
              </Link>
              <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-bold">
                <BookOpen className="h-3 w-3" />
                Repo reference: <code className="font-mono">docs/domain/CANONICAL_GRAPH.md</code>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 items-end">
          <label className="block text-xs font-black uppercase text-slate-500">
            Filter by club
            <select
              className="mt-1 block rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold min-w-[200px]"
              value={clubFilter}
              onChange={(e) => setClubFilter(e.target.value)}
            >
              <option value="">All clubs</option>
              {data.clubs.map((c) => (
                <option key={c.clubId} value={c.clubId}>
                  {c.clubName}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {data.teamsOrphanSeason.filter(passesClub).length > 0 ? (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-700 shrink-0" />
            <div>
              <h2 className="text-sm font-black text-amber-950 uppercase tracking-wide">
                Teams not linked to a season league on this association
              </h2>
              <p className="text-sm font-bold text-amber-900 mt-1">
                Pick the canonical season league (must match the team&apos;s{" "}
                <code className="font-mono">season</code> year) and division, then save.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-amber-100 text-[10px] font-black uppercase text-amber-950">
                <tr>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-left">Club</th>
                  <th className="px-3 py-2 text-left">Team season</th>
                  <th className="px-3 py-2 text-left">Link to season league</th>
                  <th className="px-3 py-2 text-left">Division</th>
                  <th className="px-3 py-2 text-left">Save</th>
                </tr>
              </thead>
              <tbody>
                {data.teamsOrphanSeason.filter(passesClub).map((team) => {
                  const scId = orphanSeasonPick[team.teamId] ?? "";
                  const seasonObj = data.seasons.find((s) => s.seasonCompetitionId === scId);
                  const divs = seasonObj?.divisions ?? [];
                  return (
                    <tr key={team.teamId} className="border-t border-amber-100">
                      <td className="px-3 py-2 font-bold">
                        {team.name}
                        <div className="text-[10px] font-mono text-slate-500">{team.teamId}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/clubs/${encodeURIComponent(team.clubId)}`}
                          className="text-[#06054e] underline font-bold text-sm"
                        >
                          {team.clubName}
                        </Link>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {team.season}
                        {seasonObj && seasonObj.season !== team.season ? (
                          <div className="text-amber-800 font-bold text-[10px] mt-1 max-w-[140px]">
                            Selected league is season {seasonObj.season} — must match team season to save.
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="max-w-[240px] rounded-lg border px-2 py-1 text-xs font-bold"
                          value={scId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setOrphanSeasonPick((p) => ({ ...p, [team.teamId]: v }));
                            const so = data.seasons.find((s) => s.seasonCompetitionId === v);
                            const d0 = so?.divisions[0];
                            setOrphanDivisionPick((p) => ({
                              ...p,
                              [team.teamId]: d0?.divisionId ?? "",
                            }));
                          }}
                        >
                          <option value="">Select season league…</option>
                          {data.seasons.map((s) => (
                            <option key={s.seasonCompetitionId} value={s.seasonCompetitionId}>
                              {s.season} · {s.displayName ?? s.competitionId} ·{" "}
                              {shortId(s.seasonCompetitionId, 8)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="max-w-[200px] rounded-lg border px-2 py-1 text-xs font-bold"
                          value={orphanDivisionPick[team.teamId] ?? ""}
                          onChange={(e) =>
                            setOrphanDivisionPick((p) => ({
                              ...p,
                              [team.teamId]: e.target.value,
                            }))
                          }
                          disabled={!scId}
                        >
                          <option value="">Division…</option>
                          {divs.map((d) => (
                            <option key={d.divisionId} value={d.divisionId}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="rounded-lg px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
                          style={{ backgroundColor: primaryColor }}
                          disabled={saving === team.teamId || !scId || !(orphanDivisionPick[team.teamId] ?? "").trim()}
                          onClick={() =>
                            void patchTeam(team, {
                              seasonCompetitionId: scId,
                              competitionDivisionId: (orphanDivisionPick[team.teamId] ?? "").trim(),
                            })
                          }
                        >
                          {saving === team.teamId ? (
                            <Loader2 className="h-3 w-3 animate-spin inline" />
                          ) : null}
                          Link team
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {data.seasons.map((season) => {
          const isOpen = expanded.has(season.seasonCompetitionId);
          const divs = season.divisions ?? [];
          const allRows: TeamRow[] = [
            ...Object.values(season.teamsByDivision ?? {}).flat(),
            ...(season.teamsUnassigned ?? []),
          ];
          const visibleCount = allRows.filter(passesClub).length;
          return (
            <div
              key={season.seasonCompetitionId}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 text-left hover:bg-slate-100"
                onClick={() => toggleSeason(season.seasonCompetitionId)}
              >
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-slate-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                )}
                <div className="flex-1">
                  <div className="font-black text-[#06054e]">
                    {season.displayName ?? "Season league"} · {season.season}{" "}
                    <span className="text-slate-500 font-mono text-xs ml-2">
                      {shortId(season.seasonCompetitionId, 14)}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-500 mt-0.5">
                    Status: {season.status} · {visibleCount} team(s) visible
                    {clubFilter ? " (club filter)" : ""}
                  </div>
                </div>
              </button>

              {isOpen ? (
                <div className="p-4 space-y-6">
                  {divs.length === 0 ? (
                    <p className="text-sm font-bold text-amber-800">
                      No divisions configured — add divisions in{" "}
                      <Link
                        href={`/admin/associations/${encodeURIComponent(associationId)}/competitions?seasonCompetitionId=${encodeURIComponent(season.seasonCompetitionId)}`}
                        className="underline font-black"
                      >
                        League setup
                      </Link>
                      .
                    </p>
                  ) : null}

                  {divs.map((d) => {
                    const rows = season.teamsByDivision[d.divisionId] ?? [];
                    return (
                      <div key={d.divisionId}>
                        <h3 className="text-xs font-black uppercase text-slate-500 tracking-wide mb-2">
                          {d.name}{" "}
                          <span className="font-mono text-slate-400">
                            divisionId={shortId(d.divisionId, 12)}
                          </span>
                        </h3>
                        {rows.filter(passesClub).length === 0 ? (
                          <p className="text-xs font-bold text-slate-400 italic">No teams linked.</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600">
                                <tr>
                                  <th className="px-3 py-2 text-left">Team</th>
                                  <th className="px-3 py-2 text-left">Club</th>
                                  <th className="px-3 py-2 text-left">Legacy</th>
                                  <th className="px-3 py-2 text-left">Canon. season</th>
                                  <th className="px-3 py-2 text-left">Division id</th>
                                  <th className="px-3 py-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.flatMap((t) => {
                                  const el = renderTeamRow(t, season, divs);
                                  return el ? [el] : [];
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div>
                    <h3 className="text-xs font-black uppercase text-amber-800 tracking-wide mb-2">
                      Unassigned division id (wrong or empty competitionDivisionId)
                    </h3>
                    {season.teamsUnassigned.filter(passesClub).length === 0 ? (
                      <p className="text-xs font-bold text-slate-400 italic">None.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-amber-200">
                        <table className="min-w-full text-sm">
                          <thead className="bg-amber-50 text-[10px] font-black uppercase text-amber-900">
                            <tr>
                              <th className="px-3 py-2 text-left">Team</th>
                              <th className="px-3 py-2 text-left">Club</th>
                              <th className="px-3 py-2 text-left">Legacy</th>
                              <th className="px-3 py-2 text-left">Canon. season</th>
                              <th className="px-3 py-2 text-left">Pick division</th>
                              <th className="px-3 py-2 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {season.teamsUnassigned.flatMap((t) => {
                              const el = renderTeamRow(t, season, divs);
                              return el ? [el] : [];
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {data.seasons.length === 0 ? (
        <p className="text-sm font-bold text-slate-500">
          No season competitions for this association yet. Use{" "}
          <Link
            href={`/admin/associations/${encodeURIComponent(associationId)}/competitions`}
            className="underline text-[#06054e]"
          >
            League setup
          </Link>{" "}
          to create one.
        </p>
      ) : null}
    </div>
  );
}
