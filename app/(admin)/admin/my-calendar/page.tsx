"use client";

// Calendar sync: a private link that puts matches and training into Google, Apple or Outlook calendar and keeps them up to date.

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";

interface Inc { matches: boolean; training: boolean; duties: boolean; shifts: boolean; events: boolean }
interface Person { memberId: string; name: string; isMe: boolean; feed: { url: string; webcalUrl: string; includes: Inc; lastFetchedAt: string | null } | null }
const LABELS: [keyof Inc, string][] = [["matches", "Matches"], ["training", "Training"], ["duties", "Umpiring and officiating"], ["shifts", "Volunteer shifts"], ["events", "Club and association events"]];

export default function MyCalendarPage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/member/calendar", { credentials: "include" }).catch(() => null);
    setPeople(r?.ok ? (await r.json()).people : []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const act = async (p: Person, action: string, includes?: Inc, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(p.memberId + action);
    try {
      const r = await fetch("/api/member/calendar", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, subjectId: p.memberId, includes }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(""); await load(); }
  };
  const copy = async (url: string) => { try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Couldn't copy. Select the link and copy it."); } };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader eyebrow="Calendar" title="Calendar sync" subtitle="Put matches and training in Google, Apple or Outlook calendar. Changes and cancellations update by themselves." />
      {!people ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div> : people.length === 0 ? <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-slate-500">No member profile is linked to this account.</p> : people.map((p) => (
        <section key={p.memberId} className="space-y-3 rounded-2xl border-2 border-slate-100 bg-white p-4">
          <h2 className="text-lg font-black text-slate-800">{p.isMe ? "My calendar" : `${p.name}'s calendar`}</h2>
          {!p.feed ? (
            <button type="button" disabled={!!busy} onClick={() => act(p, "create")} className="rounded-xl bg-[#06054e] px-5 py-2 text-sm font-black text-white disabled:opacity-40">{busy === p.memberId + "create" ? "Creating…" : "Create calendar link"}</button>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {LABELS.map(([k, label]) => <label key={k} className="flex items-center gap-2 rounded-lg border-2 border-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700"><input type="checkbox" checked={p.feed!.includes[k]} disabled={!!busy} onChange={(e) => act(p, "choose", { ...p.feed!.includes, [k]: e.target.checked })} />{label}</label>)}
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={p.feed.webcalUrl} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white">Apple Calendar</a>
                <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(p.feed.webcalUrl)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white">Google Calendar</a>
                <a href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(p.feed.url)}&name=${encodeURIComponent(p.isMe ? "My hockey" : `${p.name.split(" ")[0]}'s hockey`)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">Outlook</a>
                <button type="button" onClick={() => copy(p.feed!.url)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Copy link</button>
              </div>
              <input readOnly value={p.feed.url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border-2 border-slate-100 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600" />
              <p className="text-xs font-semibold text-slate-500">{p.feed.lastFetchedAt ? `Last read by a calendar ${new Date(p.feed.lastFetchedAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" })}.` : "Not added to a calendar yet."} Anyone with this link can see the calendar, so keep it private.</p>
              <div className="flex gap-4 text-xs font-black">
                <button type="button" disabled={!!busy} onClick={() => act(p, "replace", undefined, "Make a new link? The old one stops working and you'll need to add the new one to your calendar.")} className="text-slate-600">Make a new link</button>
                <button type="button" disabled={!!busy} onClick={() => act(p, "stop", undefined, "Stop sharing this calendar? Calendars using the link will stop updating.")} className="text-red-600">Stop sharing</button>
              </div>
            </>
          )}
        </section>
      ))}
      <p className="text-xs font-semibold text-slate-400">Google can take several hours to show changes, Apple and Outlook usually refresh within a few hours. Matches are listed 90 minutes long unless the fixture says otherwise.</p>
    </div>
  );
}
