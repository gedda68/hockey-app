"use client";

// D4 — Rep tournament fixtures: pool + knockout from draw, schedule, results.

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

type RepFx = {
  fixtureId: string;
  phase?: string;
  poolLabel?: string | null;
  poolRound?: number;
  knockoutRoundLabel?: string | null;
  homeSourceLabel?: string | null;
  awaySourceLabel?: string | null;
  homeEntryId?: string | null;
  awayEntryId?: string | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  published?: boolean;
  scheduledStart?: string | null;
  venueName?: string | null;
  result?: { homeScore?: number | null; awayScore?: number | null } | null;
  resultStatus?: string | null;
  status?: string;
};

export default function RepTournamentFixturesPage() {
  const params = useParams();
  const tournamentIdParam = String(params.tournamentId ?? "");

  const [title, setTitle] = useState("");
  const [resultApprovalRequired, setResultApprovalRequired] = useState(false);
  const [fixtures, setFixtures] = useState<RepFx[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [genReplace, setGenReplace] = useState(false);
  const [genDouble, setGenDouble] = useState(false);
  const [genMode, setGenMode] = useState<"pool_round_robin" | "knockout_from_draw">(
    "pool_round_robin",
  );

  const apiBase = `/api/admin/tournaments/${encodeURIComponent(tournamentIdParam)}`;

  const load = useCallback(async () => {
    if (!tournamentIdParam) return;
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`${apiBase}/fixtures`);
      const j = await r.json();
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Failed to load");
        setFixtures([]);
        return;
      }
      setTitle(j.title ?? "");
      setResultApprovalRequired(Boolean(j.resultApprovalRequired));
      setFixtures(j.fixtures ?? []);
    } catch {
      setMsg("Failed to load");
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, tournamentIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateFixtures() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`${apiBase}/fixtures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replace: genReplace,
          doubleRound: genDouble,
          mode: genMode,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Generate failed");
        return;
      }
      const label =
        genMode === "knockout_from_draw" ? "knockout" : "pool";
      setMsg(`Generated ${j.created ?? 0} ${label} fixture(s).`);
      setFixtures(j.fixtures ?? []);
    } catch {
      setMsg("Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(f: RepFx, published: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(
        `${apiBase}/fixtures/${encodeURIComponent(f.fixtureId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published }),
        },
      );
      const j = await r.json();
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Update failed");
        return;
      }
      setFixtures((prev) =>
        prev.map((x) => (x.fixtureId === f.fixtureId ? { ...x, ...j } : x)),
      );
    } catch {
      setMsg("Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function assignEntries(
    f: RepFx,
    homeEntryId: string,
    awayEntryId: string,
  ) {
    setBusy(true);
    setMsg("");
    const body: Record<string, string | null> = {};
    const h = homeEntryId.trim();
    const a = awayEntryId.trim();
    const prevH = (f.homeEntryId ?? "").trim();
    const prevA = (f.awayEntryId ?? "").trim();
    if (h !== prevH) body.homeEntryId = h || null;
    if (a !== prevA) body.awayEntryId = a || null;
    if (Object.keys(body).length === 0) {
      setMsg("No entry id changes.");
      setBusy(false);
      return;
    }
    try {
      const r = await fetch(
        `${apiBase}/fixtures/${encodeURIComponent(f.fixtureId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const j = await r.json();
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Assign failed");
        return;
      }
      setFixtures((prev) =>
        prev.map((x) => (x.fixtureId === f.fixtureId ? { ...x, ...j } : x)),
      );
      setMsg("Entries updated.");
    } catch {
      setMsg("Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveScore(f: RepFx, homeStr: string, awayStr: string) {
    const homeScore = parseInt(homeStr, 10);
    const awayScore = parseInt(awayStr, 10);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setMsg("Enter numeric scores.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(
        `${apiBase}/fixtures/${encodeURIComponent(f.fixtureId)}/result`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            result: {
              resultType: "normal",
              homeScore,
              awayScore,
            },
            setMatchStatusCompleted: true,
          }),
        },
      );
      const j = await r.json();
      if (!r.ok) {
        setMsg(typeof j.error === "string" ? j.error : "Save failed");
        return;
      }
      setFixtures((prev) =>
        prev.map((x) => (x.fixtureId === f.fixtureId ? { ...x, ...j } : x)),
      );
      setMsg(
        resultApprovalRequired
          ? "Result submitted for approval."
          : "Result saved.",
      );
    } catch {
      setMsg("Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/tournaments"
          className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-[#06054e]"
        >
          <ArrowLeft size={16} />
          Tournaments
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase text-[#06054e]">
            Tournament fixtures
          </h1>
          <p className="text-sm text-slate-600 mt-1 font-mono">{tournamentIdParam}</p>
          {title && <p className="text-lg font-bold text-slate-800 mt-2">{title}</p>}
          {resultApprovalRequired && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 max-w-xl">
              Result approval is on: new scores are submitted first; the public site shows
              them only after approval (users with <span className="font-mono">results.approve</span>
              ).
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase border-2 border-slate-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/80 p-4 mb-8 space-y-3">
        <p className="text-xs font-black uppercase text-slate-500">
          Generate fixtures from draw (D4)
        </p>
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="genMode"
              checked={genMode === "pool_round_robin"}
              onChange={() => setGenMode("pool_round_robin")}
            />
            Pool round-robin
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="genMode"
              checked={genMode === "knockout_from_draw"}
              onChange={() => setGenMode("knockout_from_draw")}
            />
            Knockout (D3 skeleton)
          </label>
        </div>
        <p className="text-xs text-slate-600">
          {genMode === "pool_round_robin"
            ? "Uses pools on the tournament draw. Each pool needs at least two entries."
            : "Uses knockout rows from the draw (legacy or division playoff skeleton). TBD slots can be filled below."}{" "}
          Existing rows for that phase block generation unless you replace.
        </p>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={genReplace}
            onChange={(e) => setGenReplace(e.target.checked)}
          />
          Replace existing fixtures for this phase only
        </label>
        {genMode === "pool_round_robin" && (
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={genDouble}
              onChange={(e) => setGenDouble(e.target.checked)}
            />
            Double round-robin (home and away)
          </label>
        )}
        <button
          type="button"
          onClick={() => void generateFixtures()}
          disabled={busy}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-[#06054e] text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin inline" size={14} /> : null} Generate
        </button>
      </div>

      {msg && (
        <div className="mb-4 text-sm font-semibold text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Loading…
        </div>
      ) : fixtures.length === 0 ? (
        <p className="text-slate-500 text-sm">No fixtures yet. Generate from the draw above.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-100 text-left text-[10px] font-black uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Phase</th>
                <th className="px-3 py-2">Round / pool</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">TBD assign</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Public</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {fixtures.map((f) => (
                <FixtureRow
                  key={`${f.fixtureId}-${f.resultStatus ?? ""}-${f.result?.homeScore ?? ""}-${f.result?.awayScore ?? ""}-e-${f.homeEntryId ?? ""}-${f.awayEntryId ?? ""}`}
                  f={f}
                  busy={busy}
                  onTogglePublished={(pub) => void togglePublished(f, pub)}
                  onSaveScore={(h, a) => void saveScore(f, h, a)}
                  onAssignEntries={(h, a) => void assignEntries(f, h, a)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FixtureRow({
  f,
  busy,
  onTogglePublished,
  onSaveScore,
  onAssignEntries,
}: {
  f: RepFx;
  busy: boolean;
  onTogglePublished: (p: boolean) => void;
  onSaveScore: (h: string, a: string) => void;
  onAssignEntries: (home: string, away: string) => void;
}) {
  const [home, setHome] = useState(
    String(f.result?.homeScore ?? f.homeScore ?? ""),
  );
  const [away, setAway] = useState(
    String(f.result?.awayScore ?? f.awayScore ?? ""),
  );
  const [homeE, setHomeE] = useState(f.homeEntryId ?? "");
  const [awayE, setAwayE] = useState(f.awayEntryId ?? "");

  const phase = f.phase ?? "pool";
  const roundLabel =
    phase === "knockout"
      ? (f.knockoutRoundLabel ?? "Knockout")
      : (f.poolLabel ?? "—");
  const subLabel = phase === "knockout" ? "" : `R${f.poolRound ?? "?"}`;

  const homeDisp =
    f.homeTeamName || f.homeSourceLabel || (f.homeEntryId ? "?" : "TBD");
  const awayDisp =
    f.awayTeamName || f.awaySourceLabel || (f.awayEntryId ? "?" : "TBD");

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/80 align-top">
      <td className="px-3 py-2 font-medium capitalize">{phase}</td>
      <td className="px-3 py-2">
        <div>{roundLabel}</div>
        {subLabel && (
          <div className="text-[10px] text-slate-500 font-mono">{subLabel}</div>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="font-semibold">{homeDisp}</span>
        <span className="text-slate-400 mx-1">v</span>
        <span className="font-semibold">{awayDisp}</span>
      </td>
      <td className="px-3 py-2">
        {phase === "knockout" ? (
          <div className="flex flex-col gap-1 max-w-[200px]">
            <input
              type="text"
              placeholder="home entryId"
              className="w-full px-2 py-1 border rounded-lg text-[10px] font-mono"
              value={homeE}
              onChange={(e) => setHomeE(e.target.value)}
            />
            <input
              type="text"
              placeholder="away entryId"
              className="w-full px-2 py-1 border rounded-lg text-[10px] font-mono"
              value={awayE}
              onChange={(e) => setAwayE(e.target.value)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => onAssignEntries(homeE, awayE)}
              className="px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-slate-700 text-white disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1 flex-wrap">
          <input
            type="number"
            min={0}
            className="w-14 px-2 py-1 border rounded-lg text-xs"
            value={home}
            onChange={(e) => setHome(e.target.value)}
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min={0}
            className="w-14 px-2 py-1 border rounded-lg text-xs"
            value={away}
            onChange={(e) => setAway(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => onSaveScore(home, away)}
            className="ml-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-600 text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(f.published)}
            onChange={(e) => onTogglePublished(e.target.checked)}
            disabled={busy}
          />
          Published
        </label>
      </td>
      <td className="px-3 py-2 text-xs text-slate-600">
        {f.status ?? "—"}
        {f.resultStatus ? ` · ${f.resultStatus}` : ""}
      </td>
    </tr>
  );
}
