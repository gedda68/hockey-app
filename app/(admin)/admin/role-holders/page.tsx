// app/(admin)/admin/role-holders/page.tsx
// Who holds which role in this organisation: change a role's teams / term, end it, and manage pending invitations.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
import { MATRIX_ROLES } from "@/lib/access/matrix";

interface Holder {
  memberId: string; name: string; roleKey: string; roleName: string; category: string; scope: string;
  state: string; stateLabel: string; teamIds: string[]; ageGroups: string[]; repSquadIds: string[]; fixtureIds: string[];
  season: string | null; expiresAt: string | null; canManage: boolean;
}
interface Invite { appointmentId: string; roleName: string; memberName?: string; sentByName?: string; season?: string; status: string; createdAt: string; guardianApproval?: { status: string } }
interface Opt { value: string; label: string }

const inputCls = "rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const STATE_STYLE: Record<string, string> = {
  active: "bg-teal-50 text-teal-700", "waiting-blue-card": "bg-amber-50 text-amber-700",
  expired: "bg-slate-100 text-slate-500", ended: "bg-slate-100 text-slate-400", pending: "bg-sky-50 text-sky-700",
};
const SCOPE_FIELD: Record<string, { key: "teamIds" | "ageGroups" | "repSquadIds" | "fixtureIds"; label: string } | undefined> = {
  team: { key: "teamIds", label: "Teams" }, ageGroup: { key: "ageGroups", label: "Age groups / programs" },
  repSquad: { key: "repSquadIds", label: "Rep squads" }, assignedMatches: { key: "fixtureIds", label: "Matches" },
};

function scopeText(h: Holder): string {
  const f = SCOPE_FIELD[h.scope];
  if (!f) return "Whole organisation";
  const v = h[f.key];
  return v.length ? v.join(", ") : "—";
}

export default function RoleHoldersPage() {
  const [tab, setTab] = useState<"holders" | "invites">("holders");
  const [holders, setHolders] = useState<Holder[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [state, setState] = useState("active");
  const [editing, setEditing] = useState<Holder | null>(null);
  const [ending, setEnding] = useState<Holder | null>(null);
  const [busy, setBusy] = useState(false);
  const [teamOpts, setTeamOpts] = useState<Opt[]>([]);
  const [ageOpts, setAgeOpts] = useState<Opt[]>([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim().length >= 2) params.set("q", q.trim());
    if (roleKey) params.set("roleKey", roleKey);
    if (state) params.set("state", state);
    const [h, i] = await Promise.all([
      fetch(`/api/admin/role-holders?${params}`, { credentials: "include" }),
      fetch("/api/member/role-appointments?box=org", { credentials: "include" }),
    ]);
    if (!h.ok) { setError((await h.json().catch(() => ({}))).error || "Couldn't load role holders"); setHolders([]); }
    else { setError(""); setHolders((await h.json()).holders ?? []); }
    if (i.ok) setInvites(((await i.json()).appointments ?? []).filter((a: Invite) => a.status === "pending"));
    setLoading(false);
  }, [q, roleKey, state]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => {
    fetch("/api/member/role-appointments/scope-options", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setTeamOpts(d.teams ?? []); setAgeOpts(d.ageGroups ?? []); } })
      .catch(() => undefined);
  }, []);

  const roleChoices = useMemo(() => [...new Map(MATRIX_ROLES.map((r) => [r.key, r])).values()].sort((a, b) => a.name.localeCompare(b.name)), []);

  const patch = async (h: Holder, action: "end" | "update", body?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/role-holders", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: h.memberId, roleKey: h.roleKey, action, patch: body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed");
      toast.success(action === "end" ? "Role ended" : "Role updated");
      setEditing(null); setEnding(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const withdraw = async (id: string) => {
    const r = await fetch(`/api/member/role-appointments/${id}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "withdraw" }) });
    if (r.ok) { toast.success("Withdrawn"); load(); } else toast.error((await r.json().catch(() => ({}))).error || "Failed");
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#06054e]">Role holders</h1>
          <p className="text-sm text-slate-500">Who holds which role here. Change what a role covers, end it, or withdraw an invitation.</p>
        </div>
        <Link href="/admin/role-appointments" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-black text-white hover:bg-teal-700">Appoint a role</Link>
      </div>

      <div className="flex gap-2">
        {([["holders", "Current holders"], ["invites", `Pending invitations${invites.length ? ` (${invites.length})` : ""}`]] as const).map(([k, t]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-full text-xs font-black border-2 ${tab === k ? "bg-[#06054e] border-[#06054e] text-white" : "bg-white border-slate-200 text-slate-500"}`}>{t}</button>
        ))}
      </div>

      {error && <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{error}</p>}

      {!error && tab === "holders" && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className={`${inputCls} pl-9 w-64`} placeholder="Search name or member id" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className={inputCls} value={roleKey} onChange={(e) => setRoleKey(e.target.value)}>
              <option value="">All roles</option>
              {roleChoices.map((r) => <option key={r.key} value={r.key}>{r.name} ({r.orgType})</option>)}
            </select>
            <select className={inputCls} value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Any status</option>
              <option value="active">Active</option><option value="waiting-blue-card">Waiting for Blue Card</option>
              <option value="expired">Expired</option><option value="ended">Ended</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            {loading ? <div className="p-10 text-center text-slate-400"><Loader2 className="inline h-5 w-5 animate-spin" /></div> : holders.length === 0 ? (
              <p className="p-8 text-sm text-slate-400 text-center">No role holders match.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs font-black uppercase text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3">Person</th><th>Role</th><th>Covers</th><th>Season</th><th>Ends</th><th>Status</th><th />
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {holders.map((h) => (
                    <tr key={`${h.memberId}|${h.roleKey}|${h.state}`}>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        <Link href={`/admin/members/${encodeURIComponent(h.memberId)}`} className="hover:underline">{h.name}</Link>
                      </td>
                      <td className="text-slate-600">{h.roleName}<div className="text-[10px] text-slate-400">{h.category}</div></td>
                      <td className="text-slate-600 max-w-xs truncate" title={scopeText(h)}>{scopeText(h)}</td>
                      <td className="text-slate-500">{h.season ?? "—"}</td>
                      <td className="text-slate-500">{h.expiresAt ? new Date(h.expiresAt).toLocaleDateString() : "—"}</td>
                      <td><span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${STATE_STYLE[h.state] ?? ""}`}>{h.stateLabel}</span></td>
                      <td className="px-4 text-right whitespace-nowrap">
                        {h.canManage && <>
                          <button onClick={() => setEditing(h)} className="text-xs font-bold text-teal-700 hover:underline mr-3">Change</button>
                          <button onClick={() => setEnding(h)} className="text-xs font-bold text-red-600 hover:underline">End role</button>
                        </>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!error && tab === "invites" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {invites.length === 0 ? <p className="text-sm text-slate-400">No pending invitations.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-black uppercase text-slate-400"><th className="py-2">Person</th><th>Role</th><th>Sent by</th><th>Status</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {invites.map((a) => (
                  <tr key={a.appointmentId}>
                    <td className="py-2 font-bold text-slate-700">{a.memberName ?? "—"}</td>
                    <td className="text-slate-600">{a.roleName}{a.season ? ` · ${a.season}` : ""}</td>
                    <td className="text-slate-500">{a.sentByName ?? "—"}</td>
                    <td className="font-semibold text-slate-500">{a.guardianApproval?.status === "pending" ? "Awaiting guardian" : "Awaiting reply"}</td>
                    <td className="text-right"><button onClick={() => withdraw(a.appointmentId)} className="text-xs font-bold text-red-600 hover:underline">Withdraw</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editing && <EditModal holder={editing} teamOpts={teamOpts} ageOpts={ageOpts} busy={busy} onClose={() => setEditing(null)} onSave={(b) => patch(editing, "update", b)} />}

      {ending && (
        <Modal onClose={() => setEnding(null)} title="End this role?">
          <p className="text-sm text-slate-600"><strong>{ending.name}</strong> will stop being <strong>{ending.roleName}</strong>. Their access changes straight away. They can be appointed again later.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setEnding(null)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600">Cancel</button>
            <button disabled={busy} onClick={() => patch(ending, "end")} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60">End role</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-[#06054e]">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditModal({ holder, teamOpts, ageOpts, busy, onClose, onSave }: {
  holder: Holder; teamOpts: Opt[]; ageOpts: Opt[]; busy: boolean; onClose: () => void; onSave: (patch: Record<string, unknown>) => void;
}) {
  const field = SCOPE_FIELD[holder.scope];
  const opts = holder.scope === "team" ? teamOpts : holder.scope === "ageGroup" ? ageOpts : [];
  const [picked, setPicked] = useState<string[]>(field ? holder[field.key] : []);
  const [typed, setTyped] = useState(field ? holder[field.key].join(", ") : "");
  const [season, setSeason] = useState(holder.season ?? "");
  const [ends, setEnds] = useState(holder.expiresAt ? holder.expiresAt.slice(0, 10) : "");
  // Offer the saved values too, so ids that aren't in the club's rosters any more can still be removed.
  const all = [...opts, ...picked.filter((p) => !opts.some((o) => o.value === p)).map((p) => ({ value: p, label: p }))];

  const save = () => {
    const body: Record<string, unknown> = { season, expiresAt: ends || null };
    if (field) body[field.key] = opts.length ? picked : typed.split(",").map((s) => s.trim()).filter(Boolean);
    onSave(body);
  };
  const toggle = (v: string) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  return (
    <Modal onClose={onClose} title={`${holder.name} · ${holder.roleName}`}>
      <div className="space-y-4">
        {field && (
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-1">{field.label}</label>
            {opts.length ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-slate-200 divide-y divide-slate-100">
                {all.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-teal-50">
                    <input type="checkbox" checked={picked.includes(o.value)} onChange={() => toggle(o.value)} /> {o.label}
                  </label>
                ))}
              </div>
            ) : <input className={`${inputCls} w-full`} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Comma-separated ids" />}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-black uppercase text-slate-400 mb-1">Season</label><input className={`${inputCls} w-full`} value={season} onChange={(e) => setSeason(e.target.value)} /></div>
          <div><label className="block text-xs font-black uppercase text-slate-400 mb-1">Ends on (optional)</label><input type="date" className={`${inputCls} w-full`} value={ends} onChange={(e) => setEnds(e.target.value)} /></div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600">Cancel</button>
        <button disabled={busy} onClick={save} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white disabled:opacity-60">Save</button>
      </div>
    </Modal>
  );
}
