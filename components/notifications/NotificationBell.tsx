// components/notifications/NotificationBell.tsx
// Bell in the admin header: unread count and the next few notifications. Members only.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { InboxNotification } from "@/app/api/member/notifications/route";

const POLL_MS = 5 * 60_000;

export default function NotificationBell({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const isMember = Boolean(user?.memberId);

  const load = useCallback(async () => {
    if (!isMember) return;
    try {
      const r = await fetch("/api/member/notifications?inbox=1", { credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.notifications ?? []);
      setUnread(d.unread ?? 0);
    } catch { /* the bell never blocks the page */ }
  }, [isMember]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const act = (body: Record<string, string>) =>
    fetch("/api/member/notifications", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

  const openItem = async (n: InboxNotification) => {
    setOpen(false);
    if (!n.read) {
      setItems((l) => l.map((x) => (x.notificationId === n.notificationId ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      await act({ action: "read", notificationId: n.notificationId });
    }
    if (n.link) router.push(n.link);
  };

  if (!isMember) return null;
  const ring = tone === "light" ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-slate-700";
  return (
    <div className="relative" ref={box}>
      <button type="button" aria-label={unread ? `${unread} unread notifications` : "Notifications"} onClick={() => setOpen((o) => !o)} className={`relative rounded-xl p-2.5 transition-colors ${ring}`}>
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-slate-800">Notifications</p>
            {unread > 0 && (
              <button className="text-xs font-bold text-teal-600 hover:underline" onClick={async () => { setItems((l) => l.map((x) => ({ ...x, read: true }))); setUnread(0); await act({ action: "read-all" }); }}>
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm font-semibold text-slate-400">You're all caught up.</p>
            ) : (
              items.slice(0, 8).map((n) => (
                <button key={n.notificationId} onClick={() => openItem(n)} className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${n.read ? "" : "bg-teal-50/40"}`}>
                  <p className={`text-sm ${n.read ? "font-semibold text-slate-600" : "font-black text-slate-800"}`}>{n.title}</p>
                  {n.message && <p className="mt-0.5 text-xs font-semibold text-slate-500">{n.message}</p>}
                </button>
              ))
            )}
          </div>
          <Link href="/admin/notifications" onClick={() => setOpen(false)} className="block bg-slate-50 px-4 py-2.5 text-center text-xs font-black text-[#06054e] hover:bg-slate-100">
            See all and settings
          </Link>
        </div>
      )}
    </div>
  );
}
