// Your notifications, and what you want to be told about.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import type { InboxNotification } from "@/app/api/member/notifications/route";
import {
  CATEGORIES, CATEGORY_LABELS, CHANNELS, CHANNEL_LABELS, LEVELS, LEVEL_LABELS,
  type Channel, type Level, type NotificationPrefs,
} from "@/lib/notifications/prefs";

type Tab = "all" | Level | "settings";
const TAB_LABEL: Record<Tab, string> = { all: "All", global: "Everyone", association: "Association", club: "Club", personal: "Personal", settings: "Settings" };

function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${on ? "bg-teal-600" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

const when = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }) : "");

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<InboxNotification[] | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [live, setLive] = useState<Channel[]>(["inApp"]);
  const [noProfile, setNoProfile] = useState(false);

  const loadItems = useCallback(async () => {
    const r = await fetch("/api/member/notifications?inbox=1", { credentials: "include" }).catch(() => null);
    setItems(r?.ok ? (await r.json()).notifications ?? [] : []);
  }, []);
  const loadPrefs = useCallback(async () => {
    const r = await fetch("/api/member/notification-preferences", { credentials: "include" }).catch(() => null);
    if (r?.ok) { const d = await r.json(); setPrefs(d.prefs); setLive(d.live ?? ["inApp"]); }
    else setNoProfile(true);
  }, []);
  useEffect(() => { loadItems(); loadPrefs(); }, [loadItems, loadPrefs]);

  const patch = async (body: Record<string, unknown>) => {
    const r = await fetch("/api/member/notification-preferences", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { toast.error("Couldn't save that"); return; }
    setPrefs((await r.json()).prefs);
    loadItems();
  };

  const act = async (body: Record<string, string>) => {
    await fetch("/api/member/notifications", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    loadItems();
  };

  const shown = (items ?? []).filter((n) => tab === "all" || n.level === tab);
  const unread = (items ?? []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[#06054e]">Notifications</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Upcoming matches, nomination deadlines, events and things waiting on you.</p>
        </div>
        {unread > 0 && tab !== "settings" && (
          <button onClick={() => act({ action: "read-all" })} className="text-xs font-black text-teal-600 hover:underline">Mark all read</button>
        )}
      </div>

      {prefs && !prefs.enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Notifications are switched off. Turn them back on in <button className="underline" onClick={() => setTab("settings")}>Settings</button>.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-xs font-black transition-colors ${tab === t ? "bg-[#06054e] text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab !== "settings" ? (
        items === null ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">Nothing here. You're all caught up.</div>
        ) : (
          <div className="space-y-2">
            {shown.map((n) => (
              <div key={n.notificationId} className={`flex items-start gap-3 rounded-2xl border-2 bg-white p-4 shadow-sm ${n.read ? "border-slate-100" : "border-teal-200"}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{LEVEL_LABELS[n.level].label}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{CATEGORY_LABELS[n.category].label}</span>
                    {n.eventAt && <span className="text-[10px] font-bold text-slate-400">{when(n.eventAt)}</span>}
                  </div>
                  <p className={`mt-1 text-sm ${n.read ? "font-semibold text-slate-600" : "font-black text-slate-800"}`}>{n.title}</p>
                  {n.message && <p className="text-xs font-semibold text-slate-500">{n.message}</p>}
                  {n.link && (
                    <Link href={n.link} onClick={() => !n.read && act({ action: "read", notificationId: n.notificationId })} className="mt-1 inline-block text-xs font-black text-teal-600 hover:underline">Open</Link>
                  )}
                </div>
                <button aria-label="Dismiss" onClick={() => act({ action: "dismiss", notificationId: n.notificationId })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={16} /></button>
              </div>
            ))}
          </div>
        )
      ) : noProfile ? (
        <p className="rounded-2xl border-2 border-slate-100 bg-white p-5 text-sm font-semibold text-slate-600">Notification settings belong to a member profile, and this login isn't linked to one yet. Ask your administrator to link it, then you can choose what you get and how.</p>
      ) : !prefs ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-black text-slate-800">All notifications</p>
              <p className="text-xs font-semibold text-slate-500">Switch everything off or on in one go.</p>
            </div>
            <Switch label="All notifications" on={prefs.enabled} onChange={(v) => patch({ enabled: v })} />
          </div>

          <div className="space-y-2 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Where from</p>
            {LEVELS.map((l) => (
              <div key={l} className="flex items-center justify-between gap-4 py-1.5">
                <div>
                  <p className="text-sm font-bold text-slate-700">{LEVEL_LABELS[l].label}</p>
                  <p className="text-xs font-semibold text-slate-400">{LEVEL_LABELS[l].hint}</p>
                </div>
                <Switch label={LEVEL_LABELS[l].label} on={prefs.levels[l]} disabled={!prefs.enabled} onChange={(v) => patch({ levels: { [l]: v } })} />
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">What about, and how</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 text-left font-black">Topic</th>
                  {CHANNELS.map((ch) => (
                    <th key={ch} className="px-2 pb-2 text-center font-black">
                      {CHANNEL_LABELS[ch]}
                      {!live.includes(ch) && <span className="block text-[9px] font-bold normal-case text-slate-300">coming soon</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => (
                  <tr key={c} className="border-t border-slate-50">
                    <td className="py-2 pr-3">
                      <p className="font-bold text-slate-700">{CATEGORY_LABELS[c].label}</p>
                      <p className="text-xs font-semibold text-slate-400">{CATEGORY_LABELS[c].hint}</p>
                    </td>
                    {CHANNELS.map((ch) => (
                      <td key={ch} className="px-2 text-center">
                        <div className="flex justify-center">
                          <Switch label={`${CATEGORY_LABELS[c].label} ${CHANNEL_LABELS[ch]}`} on={prefs.categories[c][ch]} disabled={!prefs.enabled || !live.includes(ch)} onChange={(v) => patch({ categories: { [c]: { [ch]: v } } })} />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs font-semibold text-slate-400">Email, SMS and WhatsApp aren't switched on yet. Your choices there will be remembered for when they are.</p>
          </div>
        </div>
      )}
    </div>
  );
}
