"use client";

// components/admin/ComingUpPanel.tsx
// A right-hand panel of what's next for the signed-in member: matches they play, coach or manage, umpiring,
// training, events, nomination deadlines and unread notifications. Shown on wide screens only.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, ClipboardList, Flag, Loader2, Trophy, Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { dayLabel, type ComingUpItem, type ComingUpKind } from "@/lib/comingUp/build";

const ICON: Record<ComingUpKind, typeof Trophy> = {
  match: Trophy, umpire: Megaphone, training: ClipboardList, event: CalendarDays, nomination: Flag, notification: Bell,
};
const TONE: Record<ComingUpKind, string> = {
  match: "bg-indigo-100 text-indigo-700", umpire: "bg-amber-100 text-amber-700", training: "bg-teal-100 text-teal-700",
  event: "bg-sky-100 text-sky-700", nomination: "bg-rose-100 text-rose-700", notification: "bg-slate-200 text-slate-700",
};
const time = (at: string) => new Date(at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Brisbane" });

function Row({ i, showTime }: { i: ComingUpItem; showTime: boolean }) {
  const Icon = ICON[i.kind];
  return (
    <li>
      <Link href={i.link} className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-slate-100">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE[i.kind]}`}><Icon size={16} /></span>
        <span className="min-w-0">
          <span className="block text-sm font-black leading-tight text-slate-800">{i.title}</span>
          <span className="block text-xs font-semibold text-slate-600">
            {showTime ? `${time(i.at)}${i.detail ? " · " : ""}` : ""}{i.detail}
          </span>
          {i.tag && <span className="mt-1 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase text-slate-700">{i.tag}</span>}
        </span>
      </Link>
    </li>
  );
}

export default function ComingUpPanel() {
  const { user } = useAuth();
  const [data, setData] = useState<{ upcoming: ComingUpItem[]; notifications: ComingUpItem[]; unread: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    fetch("/api/member/coming-up", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setData(d); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (!user?.memberId) return;
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [user?.memberId, user?.activePersonaKey, load]);

  if (!user?.memberId) return null;

  const now = new Date();
  const groups: { label: string; items: ComingUpItem[] }[] = [];
  for (const i of data?.upcoming ?? []) {
    const label = dayLabel(i.at, now);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(i); else groups.push({ label, items: [i] });
  }

  return (
    <aside aria-label="Coming up" className="hidden w-72 shrink-0 border-l border-slate-200 bg-white xl:block">
      <div className="sticky top-[var(--admin-header-h,4rem)] max-h-[calc(100vh-var(--admin-header-h,4rem)-4rem)] space-y-5 overflow-y-auto p-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Coming up</h2>
        {data === null && !failed ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
        ) : failed && !data ? (
          <p className="text-sm font-semibold text-slate-600">Couldn't load this just now. <button onClick={load} className="font-black underline">Retry</button></p>
        ) : (
          <>
            {data && data.notifications.length > 0 && (
              <section>
                <h3 className="mb-1 flex items-center justify-between text-[11px] font-black uppercase text-slate-500">
                  <span>Unread notifications</span>
                  <Link href="/admin/notifications" className="text-teal-700 hover:underline">{data.unread > 5 ? `All ${data.unread}` : "Open"}</Link>
                </h3>
                <ul className="space-y-1">{data.notifications.map((n) => <Row key={n.id} i={n} showTime={false} />)}</ul>
              </section>
            )}
            {groups.length === 0 ? (
              <p className="rounded-xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">Nothing scheduled in the next two weeks.</p>
            ) : groups.map((g) => (
              <section key={g.label}>
                <h3 className="mb-1 text-[11px] font-black uppercase text-slate-500">{g.label}</h3>
                <ul className="space-y-1">{g.items.map((i) => <Row key={i.id} i={i} showTime />)}</ul>
              </section>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
