"use client";

import { useCallback, useEffect, useState } from "react";
import { ListOrdered, Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { FixtureMatchEventKind } from "@/types";

const KIND_OPTIONS: { value: FixtureMatchEventKind; label: string }[] = [
  { value: "goal", label: "Field goal" },
  { value: "penalty_stroke_goal", label: "Penalty stroke (goal)" },
  { value: "penalty_stroke_miss", label: "Penalty stroke (miss)" },
  { value: "shootout_goal", label: "Shootout (goal)" },
  { value: "shootout_miss", label: "Shootout (miss)" },
  { value: "gk_save", label: "GK save" },
  { value: "green_card", label: "Green card" },
  { value: "yellow_card", label: "Yellow card" },
  { value: "red_card", label: "Red card" },
];

type RosterOpt = { memberId: string; displayName: string; jerseyNumber?: number | null };

type Context = {
  seasonCompetitionId: string;
  fixtureId: string;
  round: number | null;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeRoster: RosterOpt[];
  awayRoster: RosterOpt[];
  matchEvents: Array<{
    eventId?: string;
    kind: FixtureMatchEventKind;
    teamId: string;
    memberId: string;
    assistMemberId?: string | null;
    period?: number | null;
    minute?: number | null;
    notes?: string | null;
  }>;
};

type Row = Context["matchEvents"][number] & { eventId: string };

function emptyRow(homeTeamId: string): Row {
  return {
    eventId: "",
    kind: "goal",
    teamId: homeTeamId,
    memberId: "",
    assistMemberId: null,
    period: null,
    minute: null,
    notes: null,
  };
}

export default function MatchEventsEditorClient({
  associationId,
  associationName,
  primaryColor = "#06054e",
}: {
  associationId: string;
  associationName: string;
  primaryColor?: string;
}) {
  const [seasonOptions, setSeasonOptions] = useState<
    { seasonCompetitionId: string; season: string; status: string }[]
  >([]);
  const [seasonCompetitionId, setSeasonCompetitionId] = useState("");
  const [fixtures, setFixtures] = useState<{ fixtureId: string; round: number }[]>([]);
  const [fixtureId, setFixtureId] = useState("");
  const [ctx, setCtx] = useState<Context | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [skipRoster, setSkipRoster] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/associations/${encodeURIComponent(associationId)}/season-competitions`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load season competitions");
        const list = (data.seasonCompetitions ?? []) as typeof seasonOptions;
        if (!cancelled) setSeasonOptions(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [associationId]);

  const loadFixtures = useCallback(async (scId: string) => {
    if (!scId) {
      setFixtures([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/season-competitions/${encodeURIComponent(scId)}/fixtures`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load fixtures");
      const list = (data.fixtures ?? []) as { fixtureId: string; round: number }[];
      setFixtures(list.map((f) => ({ fixtureId: f.fixtureId, round: Number(f.round) || 0 })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setFixtureId("");
    setCtx(null);
    setRows([]);
    void loadFixtures(seasonCompetitionId);
  }, [seasonCompetitionId, loadFixtures]);

  const loadContext = useCallback(async (scId: string, fxId: string) => {
    if (!scId || !fxId) {
      setCtx(null);
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/season-competitions/${encodeURIComponent(scId)}/fixtures/${encodeURIComponent(fxId)}/match-events-context`,
        { credentials: "include" },
      );
      const data = (await res.json()) as Context & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load fixture context");
      setCtx(data);
      const ev = Array.isArray(data.matchEvents) ? data.matchEvents : [];
      setRows(
        ev.map((r) => ({
          ...r,
          eventId: typeof r.eventId === "string" && r.eventId ? r.eventId : "",
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCtx(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContext(seasonCompetitionId, fixtureId);
  }, [seasonCompetitionId, fixtureId, loadContext]);

  const rosterForTeam = (teamId: string) => {
    if (!ctx) return [] as RosterOpt[];
    return teamId === ctx.homeTeamId ? ctx.homeRoster : ctx.awayRoster;
  };

  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = [...prev];
      const cur = { ...next[index], ...patch };
      if (patch.kind && patch.kind !== "goal") {
        cur.assistMemberId = null;
      }
      next[index] = cur;
      return next;
    });
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    if (!ctx) return;
    setRows((prev) => [...prev, emptyRow(ctx.homeTeamId)]);
  };

  const save = async () => {
    if (!seasonCompetitionId || !fixtureId || !ctx) return;
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const payload = {
        events: rows.map((r) => ({
          eventId: r.eventId || undefined,
          kind: r.kind,
          teamId: r.teamId,
          memberId: r.memberId.trim(),
          assistMemberId: r.kind === "goal" ? r.assistMemberId ?? null : undefined,
          period: r.period ?? null,
          minute: r.minute ?? null,
          notes: r.notes ?? null,
        })),
        skipRosterValidation: skipRoster,
      };
      for (const e of payload.events) {
        if (!e.memberId) throw new Error("Each event needs a memberId");
      }
      const res = await fetch(
        `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}/fixtures/${encodeURIComponent(fixtureId)}/match-events`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setToast("Match events saved.");
      await loadContext(seasonCompetitionId, fixtureId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-4">
          <ListOrdered className="h-6 w-6" style={{ color: primaryColor }} />
          Match events (goals, cards, PSO / shootout, GK saves)
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          {associationName} — record player-attributed events per fixture. Roster validation
          applies when team rosters are populated (use “Skip roster check” for guests).
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Season competition
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-medium"
              value={seasonCompetitionId}
              onChange={(e) => setSeasonCompetitionId(e.target.value)}
            >
              <option value="">Select…</option>
              {seasonOptions.map((s) => (
                <option key={s.seasonCompetitionId} value={s.seasonCompetitionId}>
                  {String(s.season)} · {s.seasonCompetitionId.slice(0, 12)}… ({s.status})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Fixture
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-medium"
              value={fixtureId}
              onChange={(e) => setFixtureId(e.target.value)}
              disabled={!seasonCompetitionId}
            >
              <option value="">Select…</option>
              {fixtures.map((f) => (
                <option key={f.fixtureId} value={f.fixtureId}>
                  Round {f.round} · {f.fixtureId.slice(0, 14)}…
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={skipRoster}
            onChange={(e) => setSkipRoster(e.target.checked)}
          />
          Skip roster check (guest / missing roster data)
        </label>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-800">
            {error}
          </div>
        )}
        {toast && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-800">
            {toast}
          </div>
        )}
      </div>

      {ctx && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="text-sm font-bold text-slate-600">
            <span className="text-slate-900">{ctx.homeTeamName}</span> vs{" "}
            <span className="text-slate-900">{ctx.awayTeamName}</span>
            <span className="text-slate-400"> · Round {ctx.round ?? "?"}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-2">Kind</th>
                  <th className="py-2 pr-2">Team</th>
                  <th className="py-2 pr-2">Player</th>
                  <th className="py-2 pr-2">Assist</th>
                  <th className="py-2 pr-2">P</th>
                  <th className="py-2 pr-2">Min</th>
                  <th className="py-2 pr-2">Notes</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const roster = rosterForTeam(row.teamId);
                  const hasRoster = roster.length > 0;
                  return (
                    <tr key={i} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <select
                          className="w-full max-w-[10rem] rounded border border-slate-300 px-1 py-1"
                          value={row.kind}
                          onChange={(e) =>
                            updateRow(i, { kind: e.target.value as FixtureMatchEventKind })
                          }
                        >
                          {KIND_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          className="w-full max-w-[8rem] rounded border border-slate-300 px-1 py-1"
                          value={row.teamId}
                          onChange={(e) => updateRow(i, { teamId: e.target.value, memberId: "" })}
                        >
                          <option value={ctx.homeTeamId}>Home</option>
                          <option value={ctx.awayTeamId}>Away</option>
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        {hasRoster ? (
                          <select
                            className="w-full max-w-[12rem] rounded border border-slate-300 px-1 py-1"
                            value={row.memberId}
                            onChange={(e) => updateRow(i, { memberId: e.target.value })}
                          >
                            <option value="">—</option>
                            {roster.map((r) => (
                              <option key={r.memberId} value={r.memberId}>
                                {r.jerseyNumber != null ? `#${r.jerseyNumber} ` : ""}
                                {r.displayName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="w-full max-w-[12rem] rounded border border-slate-300 px-2 py-1"
                            placeholder="memberId"
                            value={row.memberId}
                            onChange={(e) => updateRow(i, { memberId: e.target.value })}
                          />
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {row.kind === "goal" ? (
                          hasRoster ? (
                            <select
                              className="w-full max-w-[12rem] rounded border border-slate-300 px-1 py-1"
                              value={row.assistMemberId ?? ""}
                              onChange={(e) =>
                                updateRow(i, {
                                  assistMemberId: e.target.value || null,
                                })
                              }
                            >
                              <option value="">—</option>
                              {roster.map((r) => (
                                <option key={r.memberId} value={r.memberId}>
                                  {r.displayName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              className="w-full max-w-[10rem] rounded border border-slate-300 px-2 py-1"
                              placeholder="assist memberId"
                              value={row.assistMemberId ?? ""}
                              onChange={(e) =>
                                updateRow(i, {
                                  assistMemberId: e.target.value || null,
                                })
                              }
                            />
                          )
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          className="w-14 rounded border border-slate-300 px-1 py-1"
                          value={row.period ?? ""}
                          onChange={(e) =>
                            updateRow(i, {
                              period: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          className="w-14 rounded border border-slate-300 px-1 py-1"
                          value={row.minute ?? ""}
                          onChange={(e) =>
                            updateRow(i, {
                              minute: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className="w-full max-w-[8rem] rounded border border-slate-300 px-2 py-1"
                          value={row.notes ?? ""}
                          onChange={(e) => updateRow(i, { notes: e.target.value || null })}
                        />
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          onClick={() => removeRow(i)}
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add event
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-black text-white disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save events
            </button>
          </div>
        </div>
      )}

      {loading && !ctx && seasonCompetitionId && fixtureId && (
        <div className="flex items-center gap-2 text-slate-600 font-bold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      )}
    </div>
  );
}
