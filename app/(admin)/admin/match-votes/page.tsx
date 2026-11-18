"use client";

// Coaches, managers and committee: player-of-the-match votes for your teams, ties, season leaderboards and settings.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Round { roundId: string; teamName: string; opponentName?: string; startsAt: string; closesAt: string; status: "open" | "closed"; voters: number; voted: number; winnerName: string | null; tied: { memberId: string; name: string }[]; tally: { name: string; points: number; firsts: number }[] }
interface Board { teamId: string; teamName: string; rows: { memberId: string; name: string; points: number; wins: number }[] }
interface Settings { matchVotes: { enabled: boolean; closeDays: number; staffVote: boolean } }

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Brisbane" });

export default function MatchVotesPage() {
  const [data, setData] = useState<{ rounds: Round[]; boards: Board[]; year: string } | null>(null);
  const [denied, setDenied] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/match-votes", { credentials: "include" }).catch(() => null);
    if (r?.status === 403) { setDenied(true); setData({ rounds: [], boards: [], year: "" }); return; }
    setData(r?.ok ? await r.json() : { rounds: [], boards: [], year: "" });
    const s = await fetch("/api/admin/award-settings", { credentials: "include" }).catch(() => null);
    if (s?.ok) setSettings((await s.json()).settings);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const post = async (body: Record<string, unknown>, ok: string) => {
    setBusy(String(body.roundId));
    try {
      const r = await fetch("/api/admin/match-votes", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(ok);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(""); await load(); }
  };
  const saveSettings = async (patch: Partial<Settings["matchVotes"]>) => {
    const r = await fetch("/api/admin/award-settings", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchVotes: patch }) });
    if (r.ok) { setSettings((await r.json()).settings); toast.success("Saved"); } else toast.error("Couldn't save");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Awards" title="Match votes" subtitle="Player-of-the-match votes open after each game your team plays. See who has voted, settle ties and follow the season leaderboard." />
      {!data ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : denied ? <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-slate-500">This page is for coaches, managers and club committee.</p> : (
        <>
          {settings && (
            <section className="space-y-3 rounded-2xl border-2 border-slate-100 bg-white p-4">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Club settings</h2>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={settings.matchVotes.enabled} onChange={(e) => saveSettings({ enabled: e.target.checked })} /> Open a vote after each completed game</label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={settings.matchVotes.staffVote} onChange={(e) => saveSettings({ staffVote: e.target.checked })} /> Coaches and managers on the team sheet can vote too</label>
              <label className="flex items-center gap-3 text-sm font-bold text-slate-700">Voting stays open for
                <select value={settings.matchVotes.closeDays} onChange={(e) => saveSettings({ closeDays: Number(e.target.value) })} className="rounded-lg border-2 border-slate-200 px-2 py-1">{[1, 2, 3, 5, 7, 14].map((n) => <option key={n} value={n}>{n} {n === 1 ? "day" : "days"}</option>)}</select>
              </label>
              <p className="text-xs font-semibold text-slate-400">Votes open only for games where the match-day lineup was entered.</p>
            </section>
          )}
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Recent games</h2>
            {data.rounds.length === 0 ? <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-400">No votes yet. They open once a game is completed and its lineup was entered.</p> : data.rounds.map((r) => (
              <div key={r.roundId} className="space-y-2 rounded-2xl border-2 border-slate-100 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-slate-800">{r.teamName}{r.opponentName ? ` v ${r.opponentName}` : ""} <span className="text-xs font-semibold text-slate-400">· {day(r.startsAt)}</span></p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${r.status === "open" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{r.status === "open" ? `Open until ${day(r.closesAt)}` : "Closed"}</span>
                </div>
                {r.status === "open" ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-slate-600">{r.voted} of {r.voters} have voted</p>
                    <button type="button" disabled={busy === r.roundId} onClick={() => post({ roundId: r.roundId, action: "close" }, "Voting closed")} className="rounded-xl border-2 border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700">Close voting now</button>
                  </div>
                ) : r.winnerName ? <p className="text-sm font-black text-amber-700">🏅 {r.winnerName}</p>
                : r.tied.length ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-amber-700">Dead heat. Choose the player of the match:</p>
                    <div className="flex flex-wrap gap-2">{r.tied.map((t) => <button key={t.memberId} type="button" disabled={busy === r.roundId} onClick={() => post({ roundId: r.roundId, action: "decide", winnerId: t.memberId }, `${t.name} is player of the match`)} className="rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-black text-white">{t.name}</button>)}</div>
                  </div>
                ) : <p className="text-sm font-semibold text-slate-400">Nobody voted.</p>}
                {r.status === "closed" && r.tally.length > 0 && <p className="text-xs font-semibold text-slate-500">{r.tally.map((t) => `${t.name} ${t.points}`).join(" · ")}</p>}
              </div>
            ))}
          </section>
          {data.boards.map((b) => (
            <section key={b.teamId} className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">{b.teamName} leaderboard {data.year}</h2>
              <div className="overflow-hidden rounded-2xl border-2 border-slate-100 bg-white">
                {b.rows.map((r, i) => (
                  <div key={r.memberId} className="flex items-center gap-3 border-b border-slate-50 px-4 py-2 last:border-0">
                    <span className="w-6 text-sm font-black text-slate-400">{i + 1}</span>
                    <span className="flex-1 text-sm font-bold text-slate-700">{r.name}</span>
                    <span className="text-xs font-semibold text-slate-400">{r.wins} {r.wins === 1 ? "win" : "wins"}</span>
                    <span className="w-14 text-right text-sm font-black text-amber-700">{r.points} pts</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
