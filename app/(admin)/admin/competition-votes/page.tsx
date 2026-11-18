"use client";

// Competition vote leaderboard: each team's own 3-2-1 votes plus the umpires' and officials' votes, added up for every
// player in the competition. The top of the table is the player of the season.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Comp { seasonCompetitionId: string; name: string; season: string; status: string }
interface Row { memberId: string; name: string; teamName: string; teamPoints: number; officialPoints: number; total: number; wins: number; games: number }
interface Board { games: number; rows: Row[]; openVotes: number; settings: { enabled: boolean; closeDays: number }; recorded: string[] }

export default function CompetitionVotesPage() {
  const [comps, setComps] = useState<Comp[] | null>(null);
  const [id, setId] = useState("");
  const [board, setBoard] = useState<Board | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/admin/competition-votes", { credentials: "include" }).catch(() => null);
      const list: Comp[] = r?.ok ? (await r.json()).competitions : [];
      setComps(list);
      if (list[0]) setId(list[0].seasonCompetitionId);
    })();
  }, []);
  const load = useCallback(async () => {
    if (!id) return;
    setBoard(null);
    const r = await fetch(`/api/admin/competition-votes?seasonCompetitionId=${encodeURIComponent(id)}`, { credentials: "include" }).catch(() => null);
    setBoard(r?.ok ? await r.json() : { games: 0, rows: [], openVotes: 0, settings: { enabled: true, closeDays: 3 }, recorded: [] });
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const post = async (body: Record<string, unknown>, ok: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/competition-votes", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ seasonCompetitionId: id, ...body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(ok);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); await load(); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Awards" title="Competition votes" subtitle="Every team's player-of-the-match votes and the umpires' and officials' votes, added up across the season. The top player is the player of the season." />
      {!comps ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : comps.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-slate-500">No competitions to show.</p> : (
        <>
          <select value={id} onChange={(e) => setId(e.target.value)} className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-bold">
            {comps.map((c) => <option key={c.seasonCompetitionId} value={c.seasonCompetitionId}>{c.name}{c.season ? ` (${c.season})` : ""}</option>)}
          </select>
          {!board ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
            <>
              <section className="space-y-2 rounded-2xl border-2 border-slate-100 bg-white p-4">
                <label className="flex items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={board.settings.enabled} onChange={(e) => post({ action: "settings", officials: { enabled: e.target.checked } }, "Saved")} /> Umpires and officials vote on the best players after each game</label>
                <p className="text-xs font-semibold text-slate-400">{board.games} team votes counted · {board.openVotes} votes still open. Voting stays open {board.settings.closeDays} days. Officials are the people allocated to the fixture as umpires or technical officials.</p>
              </section>
              {board.rows.length === 0 ? <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-400">No votes have been counted yet.</p> : (
                <div className="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 text-left text-xs font-black uppercase tracking-wide text-slate-400"><th className="px-3 py-2">#</th><th className="px-3 py-2">Player</th><th className="px-3 py-2">Team</th><th className="px-3 py-2 text-right">Team votes</th><th className="px-3 py-2 text-right">Officials</th><th className="px-3 py-2 text-right">Wins</th><th className="px-3 py-2 text-right">Total</th><th /></tr></thead>
                    <tbody>
                      {board.rows.map((r, i) => (
                        <tr key={r.memberId} className="border-b border-slate-50 last:border-0">
                          <td className="px-3 py-2 font-black text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-800">{r.name}</td>
                          <td className="px-3 py-2 text-slate-500">{r.teamName}</td>
                          <td className="px-3 py-2 text-right">{r.teamPoints}</td>
                          <td className="px-3 py-2 text-right">{r.officialPoints}</td>
                          <td className="px-3 py-2 text-right">{r.wins}</td>
                          <td className="px-3 py-2 text-right font-black text-amber-700">{r.total}</td>
                          <td className="px-3 py-2 text-right">{board.recorded.includes(r.memberId) ? <span className="text-xs font-black text-emerald-700">🏆 Recorded</span> : i === 0 ? <button type="button" disabled={busy} onClick={() => post({ action: "record", memberId: r.memberId }, "Recorded as player of the season", `Record ${r.name} as player of the season? It will appear on the public awards page.`)} className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-black text-white">Record as player of the season</button> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
