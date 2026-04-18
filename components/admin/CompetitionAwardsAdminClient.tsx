"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Award, Loader2, Trash2 } from "lucide-react";

type AwardRow = {
  awardRecordId: string;
  awardType: string;
  fixtureId: string | null;
  memberId: string;
  memberDisplayName: string | null;
  teamId: string | null;
  teamName: string | null;
  awardLabelSnapshot: string;
  notes: string | null;
  createdAt: string;
};

type AwardsLabels = {
  playerOfMatch: string;
  playerOfCompetition: string;
  topGoalScorer: string;
  rookie: string;
  goalkeeper: string;
};

const AWARD_TYPES: { value: string; key: keyof AwardsLabels }[] = [
  { value: "player_of_match", key: "playerOfMatch" },
  { value: "player_of_competition", key: "playerOfCompetition" },
  { value: "top_goal_scorer", key: "topGoalScorer" },
  { value: "rookie", key: "rookie" },
  { value: "goalkeeper", key: "goalkeeper" },
];

function pickApiBase(mode: "league" | "tournament", leagueId: string, tid: string) {
  if (mode === "league") {
    return `/api/admin/season-competitions/${encodeURIComponent(leagueId)}/awards`;
  }
  return `/api/admin/tournaments/${encodeURIComponent(tid)}/awards`;
}

export default function CompetitionAwardsAdminClient() {
  const sp = useSearchParams();
  const qpLeague = sp.get("seasonCompetitionId")?.trim() || "";
  const qpTournament = sp.get("tournamentId")?.trim() || "";

  const [mode, setMode] = useState<"league" | "tournament">(
    qpTournament && !qpLeague ? "tournament" : "league",
  );
  const [seasonCompetitionId, setSeasonCompetitionId] = useState(qpLeague);
  const [tournamentId, setTournamentId] = useState(qpTournament);

  const [loading, setLoading] = useState(false);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [labels, setLabels] = useState<AwardsLabels | null>(null);
  const [contextTitle, setContextTitle] = useState("");

  const [fixtures, setFixtures] = useState<
    { fixtureId: string; round?: string; homeTeamId?: string; awayTeamId?: string }[]
  >([]);

  const [formAwardType, setFormAwardType] = useState("player_of_match");
  const [formFixtureId, setFormFixtureId] = useState("");
  const [formTeamId, setFormTeamId] = useState("");
  const [formMemberId, setFormMemberId] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const activeLeagueId = mode === "league" ? seasonCompetitionId.trim() : "";
  const activeTournamentId = mode === "tournament" ? tournamentId.trim() : "";

  const apiBase = useMemo(
    () =>
      mode === "league" && activeLeagueId
        ? pickApiBase("league", activeLeagueId, "")
        : mode === "tournament" && activeTournamentId
          ? pickApiBase("tournament", "", activeTournamentId)
          : "",
    [mode, activeLeagueId, activeTournamentId],
  );

  const load = useCallback(async () => {
    if (!apiBase) return;
    setLoading(true);
    try {
      const res = await fetch(apiBase, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as {
        awards?: AwardRow[];
        awardsLabels?: AwardsLabels;
        competitionName?: string;
        season?: string;
        title?: string;
      };
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || res.statusText);
      }
      setAwards(data.awards ?? []);
      setLabels(data.awardsLabels ?? null);
      if (mode === "league") {
        setContextTitle(
          `${data.competitionName ?? "League"} · ${data.season ?? ""}`.trim(),
        );
        const fxRes = await fetch(
          `/api/admin/season-competitions/${encodeURIComponent(activeLeagueId)}/fixtures`,
          { credentials: "include" },
        );
        const fxJson = (await fxRes.json().catch(() => ({}))) as {
          fixtures?: { fixtureId?: string; round?: string; homeTeamId?: string; awayTeamId?: string }[];
        };
        if (fxRes.ok) {
          setFixtures(
            (fxJson.fixtures ?? [])
              .map((f) => ({
                fixtureId: String(f.fixtureId ?? ""),
                round: f.round,
                homeTeamId: f.homeTeamId,
                awayTeamId: f.awayTeamId,
              }))
              .filter((f) => f.fixtureId),
          );
        } else {
          setFixtures([]);
        }
      } else {
        setContextTitle(data.title ?? "Tournament");
        const fxRes = await fetch(
          `/api/admin/tournaments/${encodeURIComponent(activeTournamentId)}/fixtures`,
          { credentials: "include" },
        );
        const fxJson = (await fxRes.json().catch(() => ({}))) as {
          fixtures?: { fixtureId?: string; homeTeamId?: string; awayTeamId?: string }[];
        };
        if (fxRes.ok) {
          setFixtures(
            (fxJson.fixtures ?? [])
              .map((f) => ({
                fixtureId: String(f.fixtureId ?? ""),
                homeTeamId: f.homeTeamId ?? undefined,
                awayTeamId: f.awayTeamId ?? undefined,
              }))
              .filter((f) => f.fixtureId),
          );
        } else {
          setFixtures([]);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [apiBase, mode, activeLeagueId, activeTournamentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedFx = useMemo(
    () => fixtures.find((f) => f.fixtureId === formFixtureId),
    [fixtures, formFixtureId],
  );

  const saveLabels = async () => {
    if (!labels) return;
    try {
      if (mode === "league" && activeLeagueId) {
        const res = await fetch(
          `/api/admin/season-competitions/${encodeURIComponent(activeLeagueId)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ awardsLabels: labels }),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || res.statusText);
        }
        toast.success("Award labels saved");
      } else if (mode === "tournament" && activeTournamentId) {
        const res = await fetch(
          `/api/admin/tournaments/${encodeURIComponent(activeTournamentId)}`,
          {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ awardsLabels: labels }),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error || res.statusText);
        }
        toast.success("Award labels saved");
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const submitAward = async () => {
    if (!apiBase) {
      toast.error("Choose a league season or tournament id");
      return;
    }
    const body: Record<string, unknown> = {
      awardType: formAwardType,
      memberId: formMemberId.trim(),
      notes: formNotes.trim() || null,
    };
    if (formAwardType === "player_of_match") {
      body.fixtureId = formFixtureId.trim();
      body.teamId = formTeamId.trim();
    } else {
      body.teamId = formTeamId.trim() || null;
    }
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((j as { error?: string }).error || res.statusText);
      }
      toast.success("Award saved");
      setFormMemberId("");
      setFormNotes("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const deleteAward = async (awardRecordId: string) => {
    if (!apiBase) return;
    if (!confirm("Remove this award?")) return;
    try {
      const res = await fetch(`${apiBase}/${encodeURIComponent(awardRecordId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || res.statusText);
      }
      toast.success("Award removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Admin
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-[#06054e]">
            <Award className="text-amber-500" size={28} />
            Competition awards
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Player of the match (per game), plus end-of-season or end-of-tournament awards.
            Names shown on the public site use the labels below; each recorded row also stores
            the label at save time for history.
          </p>
        </div>
        <Link
          href="/competitions/awards"
          className="text-sm font-bold text-emerald-700 underline underline-offset-4"
        >
          Public awards hall →
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
          Mode
          <select
            className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
            value={mode}
            onChange={(e) => setMode(e.target.value as "league" | "tournament")}
          >
            <option value="league">League (season competition)</option>
            <option value="tournament">Representative tournament</option>
          </select>
        </label>
        {mode === "league" ? (
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
            seasonCompetitionId
            <input
              className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 font-mono text-sm"
              value={seasonCompetitionId}
              onChange={(e) => setSeasonCompetitionId(e.target.value)}
              placeholder="e.g. sc-bha-premier-2026"
            />
          </label>
        ) : (
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
            tournamentId
            <input
              className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 font-mono text-sm"
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              placeholder="Rep tournament id"
            />
          </label>
        )}
        <button
          type="button"
          disabled={loading || !apiBase}
          onClick={() => void load()}
          className="self-end rounded-xl border-2 border-[#06054e] bg-[#06054e] px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-[#06054e]/90 disabled:opacity-40"
        >
          {loading ? <Loader2 className="inline animate-spin" size={16} /> : "Reload"}
        </button>
      </div>

      {contextTitle && (
        <p className="text-sm font-bold text-slate-700">
          <span className="text-slate-400">Editing:</span> {contextTitle}
        </p>
      )}

      {labels && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Display names (optional overrides)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(labels) as (keyof AwardsLabels)[]).map((k) => (
              <label key={k} className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                {k}
                <input
                  className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
                  value={labels[k]}
                  onChange={(e) => setLabels({ ...labels, [k]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void saveLabels()}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-800"
          >
            Save labels
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Add award
          </h2>
          <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
            Type
            <select
              className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-bold"
              value={formAwardType}
              onChange={(e) => setFormAwardType(e.target.value)}
            >
              {AWARD_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {labels?.[o.key] ?? o.value}
                </option>
              ))}
            </select>
          </label>
          {formAwardType === "player_of_match" && (
            <>
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                Fixture
                <select
                  className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
                  value={formFixtureId}
                  onChange={(e) => {
                    setFormFixtureId(e.target.value);
                    setFormTeamId("");
                  }}
                >
                  <option value="">Select fixture…</option>
                  {fixtures.map((f) => (
                    <option key={f.fixtureId} value={f.fixtureId}>
                      {f.round ? `${f.round} · ` : ""}
                      {f.fixtureId}
                    </option>
                  ))}
                </select>
              </label>
              {selectedFx && (
                <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
                  Team (required)
                  <select
                    className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {selectedFx.homeTeamId ? (
                      <option value={selectedFx.homeTeamId}>Home team</option>
                    ) : null}
                    {selectedFx.awayTeamId ? (
                      <option value={selectedFx.awayTeamId}>Away team</option>
                    ) : null}
                  </select>
                </label>
              )}
            </>
          )}
          {formAwardType !== "player_of_match" && (
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
              Team id (optional, for display)
              <input
                className="rounded-xl border-2 border-slate-200 px-3 py-2 font-mono text-sm"
                value={formTeamId}
                onChange={(e) => setFormTeamId(e.target.value)}
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
            Member id
            <input
              className="rounded-xl border-2 border-slate-200 px-3 py-2 font-mono text-sm"
              value={formMemberId}
              onChange={(e) => setFormMemberId(e.target.value)}
              placeholder="members.memberId"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-slate-600">
            Notes (optional)
            <input
              className="rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void submitAward()}
            disabled={!apiBase}
            className="w-full rounded-xl bg-[#06054e] py-3 text-xs font-black uppercase tracking-widest text-yellow-200 hover:bg-[#04033a] disabled:opacity-40"
          >
            Save award
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
            History ({awards.length})
          </h2>
          <ul className="max-h-[480px] space-y-2 overflow-y-auto text-sm">
            {awards.map((a) => (
              <li
                key={a.awardRecordId}
                className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
              >
                <div>
                  <p className="font-black text-[#06054e]">{a.awardLabelSnapshot}</p>
                  <p className="text-xs text-slate-600">
                    {a.memberDisplayName ?? a.memberId}
                    {a.teamName ? ` · ${a.teamName}` : ""}
                  </p>
                  {a.fixtureId ? (
                    <p className="text-[10px] font-mono text-slate-400">Fixture {a.fixtureId}</p>
                  ) : null}
                  {a.notes ? (
                    <p className="text-xs italic text-slate-500">{a.notes}</p>
                  ) : null}
                  <p className="text-[10px] text-slate-400">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => void deleteAward(a.awardRecordId)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
            {awards.length === 0 && (
              <li className="text-sm text-slate-500">No awards recorded yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
