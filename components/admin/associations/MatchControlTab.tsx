"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Search, X } from "lucide-react";
import MatchShootoutPanel from "@/components/admin/associations/MatchShootoutPanel";

interface Fixture {
  fixtureId: string; round: number; homeTeamId: string; awayTeamId: string;
  scheduledStart?: string | null; venueName?: string | null; status?: string;
  published?: boolean;
  result?: { resultType?: string; homeScore?: number | null; awayScore?: number | null;
    shootoutHomeScore?: number | null; shootoutAwayScore?: number | null;
    forfeitingTeamId?: string | null; notes?: string | null } | null;
  resultStatus?: string | null;
}
interface Team { teamId: string; name: string }

const api = (sc: string) => `/api/admin/season-competitions/${encodeURIComponent(sc)}`;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "No date");
const toLocalInput = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const pill: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700", in_progress: "bg-sky-50 text-sky-700",
  scheduled: "bg-slate-100 text-slate-600", postponed: "bg-amber-50 text-amber-700", cancelled: "bg-red-50 text-red-700",
};

async function send(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
}

export default function MatchControlTab({ seasonCompetitionId }: { seasonCompetitionId: string }) {
  const [fixtures, setFixtures] = useState<Fixture[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "attention" | "toplay" | "played">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [f, t] = await Promise.all([
        fetch(`${api(seasonCompetitionId)}/fixtures`).then((r) => r.json()),
        fetch(`${api(seasonCompetitionId)}/squad`).then((r) => r.json()),
      ]);
      if (!Array.isArray(f.fixtures)) throw new Error(f.error || "Failed to load fixtures");
      setFixtures(f.fixtures);
      setTeams(t.teams ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }, [seasonCompetitionId]);
  useEffect(() => { void load(); }, [load]);

  const name = useCallback((id: string) => teams.find((t) => t.teamId === id)?.name ?? id, [teams]);
  const attention = (f: Fixture) =>
    f.resultStatus === "submitted" ||
    (f.status === "scheduled" && (!f.scheduledStart || Date.parse(f.scheduledStart) < Date.now()));

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (fixtures ?? [])
      .filter((f) => !n || `${name(f.homeTeamId)} ${name(f.awayTeamId)} ${f.round}`.toLowerCase().includes(n))
      .filter((f) =>
        filter === "attention" ? attention(f)
        : filter === "played" ? f.status === "completed"
        : filter === "toplay" ? f.status !== "completed" && f.status !== "cancelled"
        : true)
      .sort((a, b) => a.round - b.round || (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""));
  }, [fixtures, q, filter, name]);

  if (error) return <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>;
  if (!fixtures) return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />;
  const open = fixtures.find((f) => f.fixtureId === openId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {([["all", `All (${fixtures.length})`], ["attention", `Needs attention (${fixtures.filter(attention).length})`], ["toplay", "To play"], ["played", "Played"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${filter === k ? "bg-[#06054e] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{l}</button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team or round…" aria-label="Search matches"
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-[#06054e] focus:outline-none focus:ring-2 focus:ring-[#06054e]/20" />
        </div>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {rows.map((f) => (
          <li key={f.fixtureId}>
            <button onClick={() => setOpenId(f.fixtureId)} className="grid w-full grid-cols-[3rem_1fr_auto] items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:grid-cols-[3.5rem_1fr_9rem_auto]">
              <span className="text-xs font-extrabold text-slate-400">R{f.round}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-[#06054e]">{name(f.homeTeamId)} <span className="font-normal text-slate-400">v</span> {name(f.awayTeamId)}</span>
                <span className="block truncate text-xs text-slate-500">{fmt(f.scheduledStart)}{f.venueName ? ` · ${f.venueName}` : ""}</span>
              </span>
              <span className="hidden text-center text-lg font-black tabular-nums text-[#06054e] sm:block">
                {f.result?.homeScore != null ? `${f.result.homeScore} – ${f.result.awayScore ?? 0}` : "–"}
                {f.result?.resultType && f.result.resultType !== "normal" && <span className="block text-[10px] font-bold uppercase text-amber-600">{f.result.resultType}</span>}
              </span>
              <span className="flex items-center gap-2">
                {attention(f) && <AlertTriangle size={14} className="text-amber-500" aria-label="Needs attention" />}
                {f.resultStatus === "submitted" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">to approve</span>}
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${pill[f.status ?? "scheduled"] ?? pill.scheduled}`}>{(f.status ?? "scheduled").replace("_", " ")}</span>
              </span>
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="p-8 text-center text-sm text-slate-500">No matches.</li>}
      </ul>

      {open && (
        <MatchDrawer key={open.fixtureId} sc={seasonCompetitionId} fixture={open} teams={teams} name={name}
          onClose={() => setOpenId(null)} onChanged={load} />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-[#06054e]">{title}</h3>
      {children}
    </section>
  );
}
const inputCls = "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
const btn = "rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40";

function MatchDrawer({ sc, fixture: f, teams, name, onClose, onChanged }: {
  sc: string; fixture: Fixture; teams: Team[]; name: (id: string) => string; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const base = `${api(sc)}/fixtures/${encodeURIComponent(f.fixtureId)}`;
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [start, setStart] = useState(toLocalInput(f.scheduledStart));
  const [venue, setVenue] = useState(f.venueName ?? "");
  const [status, setStatus] = useState(f.status ?? "scheduled");

  const [home, setHome] = useState(f.homeTeamId);
  const [away, setAway] = useState(f.awayTeamId);
  const [teamReason, setTeamReason] = useState("");

  const r = f.result ?? {};
  const [type, setType] = useState(r.resultType ?? "normal");
  const [hs, setHs] = useState(r.homeScore == null ? "" : String(r.homeScore));
  const [as, setAs] = useState(r.awayScore == null ? "" : String(r.awayScore));
  const [sh, setSh] = useState(r.shootoutHomeScore == null ? "" : String(r.shootoutHomeScore));
  const [sa, setSa] = useState(r.shootoutAwayScore == null ? "" : String(r.shootoutAwayScore));
  const [forfeiter, setForfeiter] = useState(r.forfeitingTeamId ?? "");
  const [notes, setNotes] = useState(r.notes ?? "");
  const [corr, setCorr] = useState("");
  const [voidReason, setVoidReason] = useState("");

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ ok: true, text: `${label} done.` }); await onChanged(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); }
    finally { setBusy(false); }
  };
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const resultBody = (status: "submitted" | "approved" | "rejected") => ({
    result: {
      resultType: type, homeScore: num(hs), awayScore: num(as),
      shootoutHomeScore: num(sh), shootoutAwayScore: num(sa),
      forfeitingTeamId: type === "forfeit" ? forfeiter || null : null, notes: notes || null,
    },
    status,
    setMatchStatusCompleted: status === "approved" || status === "submitted",
    correctionReason: corr || undefined,
  });
  const matchTeams = [home, away].map((id) => ({ teamId: id, name: name(id) }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="Match control" onClick={onClose}>
      <div className="h-full w-full max-w-xl space-y-4 overflow-y-auto bg-slate-50 p-4 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold text-slate-400">Round {f.round}</p>
            <h2 className="text-xl font-black text-[#06054e]">{name(f.homeTeamId)} v {name(f.awayTeamId)}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-200"><X size={18} /></button>
        </div>

        {msg && (
          <p role="status" className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {msg.ok ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {msg.text}
          </p>
        )}

        <Section title="Schedule, venue & status">
          <label className="block text-xs font-bold text-slate-500">Date & time
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputCls} mt-1`} /></label>
          <label className="block text-xs font-bold text-slate-500">Venue
            <input value={venue} onChange={(e) => setVenue(e.target.value)} className={`${inputCls} mt-1`} /></label>
          <label className="block text-xs font-bold text-slate-500">Match status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} mt-1`}>
              {["scheduled", "in_progress", "completed", "postponed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select></label>
          <button disabled={busy} className={`${btn} bg-[#06054e] text-white`} onClick={() => run("Match details saved", () =>
            send(base, "PATCH", {
              scheduledStart: start ? new Date(start).toISOString() : null,
              venueName: venue.trim() || null, status,
            }))}>Save details</button>
        </Section>

        <Section title="Teams">
          <div className="grid grid-cols-2 gap-3">
            {([["Home", home, setHome], ["Away", away, setAway]] as const).map(([l, v, set]) => (
              <label key={l} className="block text-xs font-bold text-slate-500">{l}
                <select value={v} onChange={(e) => set(e.target.value)} className={`${inputCls} mt-1`}>
                  {teams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
                </select></label>
            ))}
          </div>
          <input value={teamReason} onChange={(e) => setTeamReason(e.target.value)} placeholder="Reason for change (required)" aria-label="Reason for team change" className={inputCls} />
          <button disabled={busy || (home === f.homeTeamId && away === f.awayTeamId)} className={`${btn} bg-[#06054e] text-white`}
            onClick={() => run("Teams changed", () => send(`${base}/control`, "POST", { action: "change_teams", homeTeamId: home, awayTeamId: away, reason: teamReason }))}>
            Change teams</button>
          <p className="text-xs text-slate-500">Rosters for a team no longer playing are cleared. Not allowed once the match has started or the result is approved — void it first.</p>
        </Section>

        <Section title="Result">
          <p className="text-xs text-slate-500">Current: {f.resultStatus ? <b className="uppercase">{f.resultStatus}</b> : "no result"}</p>
          <label className="block text-xs font-bold text-slate-500">Result type
            <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} mt-1`}>
              <option value="normal">Normal</option><option value="forfeit">Forfeit</option><option value="abandoned">Abandoned</option>
            </select></label>
          {type === "forfeit" && (
            <label className="block text-xs font-bold text-slate-500">Forfeiting team
              <select value={forfeiter} onChange={(e) => setForfeiter(e.target.value)} className={`${inputCls} mt-1`}>
                <option value="">Select…</option>
                {matchTeams.map((t) => <option key={t.teamId} value={t.teamId}>{t.name}</option>)}
              </select></label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-slate-500">{name(f.homeTeamId)}
              <input type="number" min={0} value={hs} onChange={(e) => setHs(e.target.value)} className={`${inputCls} mt-1`} /></label>
            <label className="block text-xs font-bold text-slate-500">{name(f.awayTeamId)}
              <input type="number" min={0} value={as} onChange={(e) => setAs(e.target.value)} className={`${inputCls} mt-1`} /></label>
            <label className="block text-xs font-bold text-slate-500">Shootout (home)
              <input type="number" min={0} value={sh} onChange={(e) => setSh(e.target.value)} className={`${inputCls} mt-1`} /></label>
            <label className="block text-xs font-bold text-slate-500">Shootout (away)
              <input type="number" min={0} value={sa} onChange={(e) => setSa(e.target.value)} className={`${inputCls} mt-1`} /></label>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" aria-label="Result notes" rows={2} className={inputCls} />
          {f.resultStatus && <input value={corr} onChange={(e) => setCorr(e.target.value)} placeholder="Reason for correcting an existing result" aria-label="Correction reason" className={inputCls} />}
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className={`${btn} bg-[#06054e] text-white`} onClick={() => run("Result saved", () => send(`${base}/result`, "PATCH", resultBody("submitted")))}>Save / submit</button>
            <button disabled={busy} className={`${btn} bg-emerald-600 text-white`} onClick={() => run("Result approved", () => send(`${base}/result`, "PATCH", resultBody("approved")))}>Approve</button>
            <button disabled={busy || !f.resultStatus} className={`${btn} bg-amber-500 text-white`} onClick={() => run("Result rejected", () => send(`${base}/result`, "PATCH", resultBody("rejected")))}>Reject</button>
          </div>
        </Section>

        <Section title="Shootout">
          <MatchShootoutPanel
            seasonCompetitionId={sc}
            fixtureId={f.fixtureId}
            recordedHome={sh}
            recordedAway={sa}
            onUseTotals={(h, a) => { setSh(String(h)); setSa(String(a)); }}
            onSaved={onChanged}
          />
          <p className="text-xs text-slate-400">Attempts are saved here. The shootout score above is saved with the result.</p>
        </Section>

        <Section title="Void match">
          <p className="text-xs text-slate-500">Cancels the match and clears its result so it no longer counts on the ladder.</p>
          <input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Reason (required)" aria-label="Reason for voiding" className={inputCls} />
          <button disabled={busy || voidReason.trim().length < 3} className={`${btn} bg-red-600 text-white`}
            onClick={() => { if (window.confirm("Void this match and clear its result?")) void run("Match voided", () => send(`${base}/control`, "POST", { action: "void", reason: voidReason })); }}>
            Void match</button>
        </Section>
      </div>
    </div>
  );
}
