"use client";
// Publish / unpublish a competition and its matches, from the top of the competition workspace.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompetitionPublishBar({ seasonCompetitionId, status, rounds, published, total }: { seasonCompetitionId: string; status: string; rounds: number[]; published: number; total: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const base = `/api/admin/season-competitions/${encodeURIComponent(seasonCompetitionId)}`;

  async function call(url: string, init: RequestInit, done: (j: Record<string, unknown>) => string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(url, { ...init, credentials: "include", headers: { "Content-Type": "application/json" } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j.error ?? "Could not update"));
      setMsg({ ok: true, text: done(j) }); router.refresh();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(false); }
  }
  const setStatus = (to: string, text: string) => call(base, { method: "PATCH", body: JSON.stringify({ status: to }) }, () => text);
  const setMatches = (value: boolean) => call(`${base}/fixtures/publish`, { method: "POST", body: JSON.stringify({ published: value, ...(round ? { round: Number(round) } : {}) }) }, (j) => `${value ? "Published" : "Unpublished"} ${String(j.count ?? 0)} matches`);
  const btn = "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-[#06054e] transition hover:bg-slate-50 disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-bold text-slate-600">
        Competition: <strong className="uppercase">{status.replace("_", " ")}</strong> · Matches published: <strong>{published}</strong> of {total}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {status === "draft" && <button className={btn} disabled={busy} onClick={() => setStatus("published", "Competition published")}>Publish competition</button>}
        {status === "published" && <button className={btn} disabled={busy} onClick={() => setStatus("draft", "Competition unpublished")}>Unpublish competition</button>}
        <select aria-label="Round" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold" value={round} onChange={(e) => setRound(e.target.value)} disabled={busy}>
          <option value="">All rounds</option>
          {rounds.map((r) => <option key={r} value={r}>Round {r}</option>)}
        </select>
        <button className={btn} disabled={busy || total === 0} onClick={() => setMatches(true)}>Publish matches</button>
        <button className={btn} disabled={busy || published === 0} onClick={() => setMatches(false)}>Unpublish matches</button>
      </div>
      {msg && <p role="status" className={`w-full text-sm font-bold ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}
