// The roles you hold (current and past) and the invitations sent to you.

"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import RoleInvitations from "@/components/roles/RoleInvitations";

interface Holding {
  roleKey: string; roleName: string; orgType: string; orgId: string; orgName: string; teamIds: string[]; ageGroups: string[];
  season: string | null; expiresAt: string | null; endedAt: string | null; fromOlderRole: boolean; state: "active" | "pending" | "expired" | "ended";
}
interface Invite { appointmentId: string; roleName: string; status: string; season?: string; sentByName?: string; createdAt: string }

const BADGE: Record<Holding["state"], string> = {
  active: "bg-teal-100 text-teal-700",
  pending: "bg-amber-100 text-amber-700",
  expired: "bg-slate-100 text-slate-500",
  ended: "bg-slate-100 text-slate-500",
};
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU") : "");

export default function MyAppointmentsPage() {
  const [data, setData] = useState<{ holdings: Holding[]; invitations: Invite[] } | null>(null);
  useEffect(() => {
    fetch("/api/member/my-appointments", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { holdings: [], invitations: [] }))
      .then(setData)
      .catch(() => setData({ holdings: [], invitations: [] }));
  }, []);

  const past = (data?.invitations ?? []).filter((i) => i.status !== "pending");
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-[#06054e]">My appointments</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">The roles you hold at your clubs and associations.</p>
      </div>

      <RoleInvitations mode="mine" />

      {data === null ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : data.holdings.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">
          You don't hold any appointed roles yet.
        </div>
      ) : (
        <div className="space-y-3">
          {data.holdings.map((h, i) => (
            <div key={`${h.roleKey}-${h.orgId}-${i}`} className="flex flex-col gap-2 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-base font-black text-slate-800">{h.roleName}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {h.orgName}{h.season ? ` · ${h.season}` : ""}
                  {h.teamIds.length ? ` · ${h.teamIds.length} team${h.teamIds.length > 1 ? "s" : ""}` : ""}
                  {h.ageGroups.length ? ` · ${h.ageGroups.join(", ")}` : ""}
                </p>
                {(h.expiresAt || h.endedAt) && (
                  <p className="text-xs font-semibold text-slate-400">
                    {h.endedAt ? `Ended ${day(h.endedAt)}` : `${h.state === "expired" ? "Expired" : "Runs to"} ${day(h.expiresAt)}`}
                  </p>
                )}
              </div>
              <span className={`self-start rounded-lg px-2.5 py-1 text-xs font-black capitalize sm:self-center ${BADGE[h.state]}`}>{h.state}</span>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Past invitations</h2>
          {past.map((i) => (
            <div key={i.appointmentId} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm">
              <span className="font-bold text-slate-700">{i.roleName}{i.season ? ` · ${i.season}` : ""}</span>
              <span className="text-xs font-bold capitalize text-slate-400">{i.status} · {day(i.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
