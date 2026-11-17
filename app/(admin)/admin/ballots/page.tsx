"use client";

/**
 * /admin/ballots
 *
 * Ballots you can vote in, and ballots you manage. Each opens the ballot page.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Vote, Loader2, ChevronRight, AlertCircle } from "lucide-react";

interface BallotRow {
  ballotId: string;
  title: string;
  ballotNumber: 1 | 2;
  status: "open" | "closed" | "deadlock" | "completed";
  openAt: string;
  closeAt: string;
  totalEligibleVoters: number;
  totalVotesCast: number;
  seasonYear?: string;
  isVoter: boolean;
  isAdmin: boolean;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS: Record<BallotRow["status"], { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-green-100 text-green-800" },
  closed: { label: "Closed", cls: "bg-slate-100 text-slate-700" },
  deadlock: { label: "Deadlock", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", cls: "bg-blue-100 text-blue-800" },
};

export default function BallotsListPage() {
  const [rows, setRows] = useState<BallotRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/ballots/mine")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Could not load ballots");
        return d;
      })
      .then((d) => !cancelled && setRows(d.ballots ?? []))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load ballots"));
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (rows ?? []).filter((b) => b.status === "open");
  const past = (rows ?? []).filter((b) => b.status !== "open");

  const Card = ({ b }: { b: BallotRow }) => (
    <Link
      href={`/admin/ballots/${b.ballotId}`}
      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{b.title}</span>
          {b.ballotNumber === 2 && <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-800">Second ballot</span>}
          <span className={`rounded px-2 py-0.5 text-xs ${STATUS[b.status].cls}`}>{STATUS[b.status].label}</span>
          {b.isAdmin && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">You manage this</span>}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {b.status === "open" ? `Closes ${fmt(b.closeAt)}` : `Closed ${fmt(b.closeAt)}`} · {b.totalVotesCast} of {b.totalEligibleVoters} voted
          {b.seasonYear ? ` · ${b.seasonYear}` : ""}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </Link>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <Vote className="h-7 w-7 text-slate-700" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ballots</h1>
          <p className="text-sm text-slate-600">Vote in open ballots and see results.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {!rows && !error && (
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}
      {rows && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          There are no ballots for you right now.
        </p>
      )}
      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Open</h2>
          {open.map((b) => <Card key={b.ballotId} b={b} />)}
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Past</h2>
          {past.map((b) => <Card key={b.ballotId} b={b} />)}
        </section>
      )}
    </div>
  );
}
