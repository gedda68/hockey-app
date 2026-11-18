"use client";

// Player-of-the-match voting: pick your top three from the match-day squad (3, 2 and 1 points).

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Cand { memberId: string; name: string; shirtNumber: number | null; teamName?: string }
interface Ballot { first?: string; second?: string; third?: string }
interface Round { roundId: string; kind?: string; teamName: string; opponentName?: string; startsAt: string; closesAt: string; candidates: Cand[]; myBallot: Ballot | null }
interface Done { roundId: string; teamName: string; opponentName?: string; startsAt: string; winnerName: string | null; tied: boolean }
interface Board { teamId: string; teamName: string; rows: { memberId: string; name: string; points: number; wins: number }[] }

const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "Australia/Brisbane" });
const PLACES: { key: keyof Ballot; label: string; pts: number }[] = [{ key: "first", label: "1st", pts: 3 }, { key: "second", label: "2nd", pts: 2 }, { key: "third", label: "3rd", pts: 1 }];

function VoteCard({ round, me, onSaved }: { round: Round; me: string; onSaved: () => void }) {
  const [b, setB] = useState<Ballot>(round.myBallot ?? {});
  const [busy, setBusy] = useState(false);
  const picked = Object.values(b).filter(Boolean);
  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/member/match-votes", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roundId: round.roundId, ballot: b }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success("Your votes are in. You can change them until voting closes.");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3 rounded-2xl border-2 border-amber-100 bg-white p-4">
      <div>
        <p className="font-black text-slate-800">{round.teamName}{round.opponentName ? ` v ${round.opponentName}` : ""}</p>
        {round.kind === "officials" && <p className="text-xs font-bold text-sky-700">You officiated this game. Vote for the best players from either team.</p>}
        <p className="text-xs font-semibold text-slate-500">{day(round.startsAt)} · voting closes {day(round.closesAt)}</p>
      </div>
      {PLACES.map(({ key, label, pts }, i) => (
        <label key={key} className="flex items-center gap-3">
          <span className="w-24 text-sm font-black text-slate-600">{label} ({pts} {pts === 1 ? "pt" : "pts"})</span>
          <select value={b[key] ?? ""} disabled={i > 0 && !b[PLACES[i - 1].key]} onChange={(e) => setB((x) => ({ ...x, [key]: e.target.value || undefined }))} className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:bg-slate-50">
            <option value="">{i === 0 ? "Choose a player" : "Optional"}</option>
            {round.candidates.filter((c) => c.memberId !== me && (b[key] === c.memberId || !picked.includes(c.memberId))).map((c) => <option key={c.memberId} value={c.memberId}>{c.shirtNumber != null ? `#${c.shirtNumber} ` : ""}{c.name}{c.teamName ? ` (${c.teamName})` : ""}</option>)}
          </select>
        </label>
      ))}
      <button type="button" disabled={busy || !b.first} onClick={save} className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-white disabled:opacity-40">{busy ? "Saving…" : round.myBallot ? "Update my votes" : "Submit votes"}</button>
    </div>
  );
}

export default function MyVotesPage() {
  const [data, setData] = useState<{ me: string; open: Round[]; done: Done[]; boards: Board[]; year: string } | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/member/match-votes", { credentials: "include" }).catch(() => null);
    setData(r?.ok ? await r.json() : { me: "", open: [], done: [], boards: [], year: "" });
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Awards" title="Player of the match" subtitle="Vote for your top three after each game. 3 points for first, 2 for second, 1 for third. Votes are secret." />
      {!data ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Waiting for your vote</h2>
            {data.open.length === 0 ? <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-400">No votes open right now. They open after each game your team plays.</p> : data.open.map((r) => <VoteCard key={r.roundId} round={r} me={data.me} onSaved={load} />)}
          </section>
          {data.done.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Recent results</h2>
              {data.done.map((d) => (
                <div key={d.roundId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-slate-100 bg-white px-4 py-3">
                  <p className="text-sm font-bold text-slate-700">{d.teamName}{d.opponentName ? ` v ${d.opponentName}` : ""} <span className="font-semibold text-slate-400">· {day(d.startsAt)}</span></p>
                  <p className="text-sm font-black text-amber-700">{d.winnerName ? `🏅 ${d.winnerName}` : d.tied ? "Your coach is choosing between joint leaders" : "No votes"}</p>
                </div>
              ))}
            </section>
          )}
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
