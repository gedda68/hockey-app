// components/roles/RoleInvitations.tsx
// Pending role invitations for the signed-in member, with Accept / Decline. Renders nothing when there are none.

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";

interface Invite { appointmentId: string; roleName: string; orgType: string; orgId: string; sentByName?: string; message?: string; season?: string; status: string; blueCardRequired?: boolean; memberName?: string; guardianApproval?: { status: string } }

interface ChildRequest { requestId: string; memberName: string; requestedRole: string; scopeName?: string; seasonYear?: string; requestedByName?: string; notes?: string }

export default function RoleInvitations({ mode = "all", showEmpty = false }: { mode?: "all" | "mine" | "guardian"; showEmpty?: boolean }) {
  const [childRequests, setChildRequests] = useState<ChildRequest[]>([]);
  const [items, setItems] = useState<Invite[]>([]);
  const [forChildren, setForChildren] = useState<Invite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, g, cr] = await Promise.all([
      fetch("/api/member/role-appointments?box=inbox", { credentials: "include" }).catch(() => null),
      fetch("/api/member/role-appointments?box=guardian", { credentials: "include" }).catch(() => null),
      fetch("/api/role-requests?box=guardian", { credentials: "include" }).catch(() => null),
    ]);
    if (cr?.ok) setChildRequests((await cr.json()).requests ?? []);
    if (r?.ok) setItems(((await r.json()).appointments ?? []).filter((a: Invite) => a.status === "pending"));
    if (g?.ok) setForChildren((await g.json()).appointments ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, action: "accept" | "decline" | "guardian-approve" | "guardian-refuse") => {
    setBusy(id);
    try {
      const r = await fetch(`/api/member/role-appointments/${id}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(action === "accept" ? (d.note || "Role accepted") : action === "guardian-approve" ? "Approved. They can now accept." : "Declined");
      await load();
      // A new role changes the menu and access: refresh the session view.
      if (action === "accept") setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const decideRequest = async (id: string, action: "approve" | "refuse") => {
    setBusy(id);
    try {
      const r = await fetch(`/api/role-requests/${id}/guardian`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(action === "approve" ? "Approved. An administrator can now approve it." : "Declined");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const mine = mode !== "guardian" ? items : [];
  const kidAppts = mode !== "mine" ? forChildren : [];
  const kidReqs = mode !== "mine" ? childRequests : [];
  if (mine.length === 0 && kidAppts.length === 0 && kidReqs.length === 0) {
    return showEmpty ? (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400">
        {mode === "guardian" ? "Nothing is waiting for your approval." : "No invitations right now."}
      </div>
    ) : null;
  }
  return (
    <div className="space-y-3">
      {mode === "all" && <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Role invitations</h2>}
      {kidReqs.map((c) => (
        <div key={c.requestId} className="bg-white rounded-2xl border-2 border-sky-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <BadgeCheck className="h-6 w-6 text-sky-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800">{c.memberName || "Your child"} has asked for: {c.requestedRole}{c.scopeName ? ` · ${c.scopeName}` : ""}{c.seasonYear ? ` · ${c.seasonYear}` : ""}</p>
            <p className="text-xs font-semibold text-slate-500">Requested by {c.requestedByName || "them"}. As their parent/guardian, your approval is needed before an administrator can approve it.</p>
            {c.notes && <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{c.notes}&rdquo;</p>}
          </div>
          <div className="flex gap-2">
            <button disabled={busy === c.requestId} onClick={() => decideRequest(c.requestId, "approve")} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-60">Approve</button>
            <button disabled={busy === c.requestId} onClick={() => decideRequest(c.requestId, "refuse")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-60">Refuse</button>
          </div>
        </div>
      ))}
      {kidAppts.map((i) => (
        <div key={i.appointmentId} className="bg-white rounded-2xl border-2 border-sky-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <BadgeCheck className="h-6 w-6 text-sky-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800">{i.memberName || "Your child"} has been invited to: {i.roleName}{i.season ? ` · ${i.season}` : ""}</p>
            <p className="text-xs font-semibold text-slate-500">Invited by {i.sentByName || "an administrator"}. As their parent/guardian, your approval is needed before they can accept.</p>
            {i.message && <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{i.message}&rdquo;</p>}
          </div>
          <div className="flex gap-2">
            <button disabled={busy === i.appointmentId} onClick={() => respond(i.appointmentId, "guardian-approve")} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-60">Approve</button>
            <button disabled={busy === i.appointmentId} onClick={() => respond(i.appointmentId, "guardian-refuse")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-60">Refuse</button>
          </div>
        </div>
      ))}
      {mine.map((i) => (
        <div key={i.appointmentId} className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <BadgeCheck className="h-6 w-6 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-800">{i.roleName}{i.season ? ` · ${i.season}` : ""}</p>
            <p className="text-xs font-semibold text-slate-500">Invited by {i.sentByName || "an administrator"}{i.blueCardRequired ? " · needs a valid Blue Card" : ""}</p>
            {i.message && <p className="text-xs text-slate-500 mt-1 italic">&ldquo;{i.message}&rdquo;</p>}
          </div>
          <div className="flex gap-2">
            {i.guardianApproval && i.guardianApproval.status !== "approved" ? (
              <span className="self-center text-xs font-bold text-amber-600">Waiting for a parent/guardian to approve</span>
            ) : (
              <button disabled={busy === i.appointmentId} onClick={() => respond(i.appointmentId, "accept")} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-60">Accept</button>
            )}
            <button disabled={busy === i.appointmentId} onClick={() => respond(i.appointmentId, "decline")} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 disabled:opacity-60">Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}
