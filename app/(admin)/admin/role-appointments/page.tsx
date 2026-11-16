// app/(admin)/admin/role-appointments/page.tsx
// Invite a member to a role (Roles & Access Matrix). The role is created only when they accept.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, Send } from "lucide-react";

interface RoleOpt { key: string; name: string; category: string; level: number; scope: string; blueCardRequired: boolean }
interface Appt { guardianApproval?: { status: string }; appointmentId: string; roleName: string; memberName?: string; status: string; createdAt: string; season?: string }
interface Person { memberId: string; name: string }
interface ClubOpt { id: string; name: string; city: string }

const labelCls = "block text-xs font-black uppercase tracking-wide text-slate-400 mb-1";
const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";

const SCOPE_FIELD: Record<string, { key: "teamIds" | "ageGroups" | "repSquadIds" | "fixtureIds"; label: string; hint: string } | undefined> = {
  team: { key: "teamIds", label: "Team ID(s)", hint: "Comma-separated team ids" },
  ageGroup: { key: "ageGroups", label: "Age group(s) / program", hint: "e.g. U12, Women & Girls" },
  repSquad: { key: "repSquadIds", label: "Rep squad id(s)", hint: "Comma-separated" },
  assignedMatches: { key: "fixtureIds", label: "Match (fixture) id(s)", hint: "Comma-separated" },
};

export default function RoleAppointmentsPage() {
  const [roles, setRoles] = useState<RoleOpt[]>([]);
  const [orgLabel, setOrgLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState<Appt[]>([]);

  const [roleKey, setRoleKey] = useState("");
  const [scopeText, setScopeText] = useState("");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [message, setMessage] = useState("");

  const [otherClub, setOtherClub] = useState(false);
  const [club, setClub] = useState<ClubOpt | null>(null);
  const [cq, setCq] = useState("");
  const [clubResults, setClubResults] = useState<ClubOpt[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [person, setPerson] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSent = useCallback(async () => {
    const r = await fetch("/api/member/role-appointments?box=sent", { credentials: "include" });
    if (r.ok) setSent((await r.json()).appointments ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/member/role-appointments/options", { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        setRoles(d.roles ?? []);
        setOrgLabel(d.context?.kind === "org" ? `${d.context.orgType === "club" ? "Club" : "Association"} ${d.context.orgId}` : "");
      }
      await loadSent();
      setLoading(false);
    })();
  }, [loadSent]);

  useEffect(() => {
    if (cq.trim().length < 2) { setClubResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/member/club-options?q=${encodeURIComponent(cq.trim())}`, { credentials: "include" });
      setClubResults(r.ok ? (await r.json()).clubs ?? [] : []);
    }, 250);
    return () => clearTimeout(t);
  }, [cq]);

  useEffect(() => {
    if (q.trim().length < 3 || (otherClub && !club)) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/member/people-search?q=${encodeURIComponent(q.trim())}${otherClub && club ? `&clubId=${encodeURIComponent(club.id)}` : ""}`, { credentials: "include" });
      setResults(r.ok ? (await r.json()).people ?? [] : []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, otherClub, club]);

  const role = useMemo(() => roles.find((r) => r.key === roleKey), [roles, roleKey]);
  const grouped = useMemo(() => {
    const m = new Map<string, RoleOpt[]>();
    for (const r of roles) m.set(r.category, [...(m.get(r.category) ?? []), r]);
    return [...m.entries()];
  }, [roles]);
  const scopeField = role ? SCOPE_FIELD[role.scope] : undefined;

  const submit = async () => {
    if (!role || !person) { toast.error("Choose a role and a person"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = { roleKey: role.key, memberId: person.memberId, season, message };
      if (scopeField) body[scopeField.key] = scopeText.split(",").map((s) => s.trim()).filter(Boolean);
      const r = await fetch("/api/member/role-appointments", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to send");
      toast.success(`Invitation sent to ${person.name}`);
      setPerson(null); setQ(""); setMessage(""); setScopeText("");
      await loadSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async (id: string) => {
    const r = await fetch(`/api/member/role-appointments/${id}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "withdraw" }) });
    if (r.ok) { toast.success("Withdrawn"); loadSent(); } else toast.error((await r.json().catch(() => ({}))).error || "Failed");
  };

  if (loading) return <div className="p-10 text-center text-slate-400"><Loader2 className="inline h-5 w-5 animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#06054e]">Appoint a role</h1>
        <p className="text-sm text-slate-500">Invite a member to a role{orgLabel ? ` in ${orgLabel}` : ""}. They get the role only when they accept.</p>
      </div>

      {roles.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">You don&apos;t have permission to appoint roles in this organisation.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className={labelCls}>Role</label>
            <select className={inputCls} value={roleKey} onChange={(e) => { setRoleKey(e.target.value); setScopeText(""); }}>
              <option value="">Choose a role…</option>
              {grouped.map(([cat, rs]) => (
                <optgroup key={cat} label={cat}>{rs.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</optgroup>
              ))}
            </select>
            {role?.blueCardRequired && <p className="text-[11px] font-semibold text-amber-600 mt-1">This role needs a valid Blue Card before it becomes active.</p>}
          </div>

          {scopeField && (
            <div>
              <label className={labelCls}>{scopeField.label}</label>
              <input className={inputCls} value={scopeText} onChange={(e) => setScopeText(e.target.value)} placeholder={scopeField.hint} />
            </div>
          )}

          <div>
            <div className="flex gap-2 mb-2">
              {[{ k: false, t: "My club" }, { k: true, t: "Another club" }].map((o) => (
                <button key={String(o.k)} type="button" onClick={() => { setOtherClub(o.k); setPerson(null); setQ(""); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-black border-2 ${otherClub === o.k ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-500"}`}>{o.t}</button>
              ))}
            </div>
            {otherClub && (
              <div className="mb-2 relative">
                {club ? (
                  <div className="flex items-center justify-between rounded-xl border-2 border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold">
                    <span>{club.name}{club.city ? ` · ${club.city}` : ""}</span>
                    <button type="button" className="text-xs font-bold text-teal-700" onClick={() => { setClub(null); setCq(""); }}>Change</button>
                  </div>
                ) : (
                  <>
                    <input className={inputCls} value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Club name or city…" />
                    {clubResults.length > 0 && (
                      <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                        {clubResults.map((c) => <button key={c.id} type="button" onClick={() => { setClub(c); setClubResults([]); }} className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-teal-50">{c.name}{c.city && <span className="text-slate-400"> · {c.city}</span>}</button>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <label className={labelCls}>Person</label>
            {person ? (
              <div className="flex items-center justify-between rounded-xl border-2 border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold">
                <span>{person.name}</span>
                <button type="button" className="text-xs font-bold text-teal-700" onClick={() => setPerson(null)}>Change</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 3 letters of their name…" />
                {results.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {results.map((p) => <button key={p.memberId} type="button" onClick={() => { setPerson(p); setResults([]); }} className="w-full text-left px-3 py-2 text-sm font-semibold hover:bg-teal-50">{p.name}</button>)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-3">
            <div><label className={labelCls}>Season</label><input className={inputCls} value={season} onChange={(e) => setSeason(e.target.value)} /></div>
            <div><label className={labelCls}>Message (optional)</label><input className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} /></div>
          </div>

          <button type="button" disabled={saving || !role || !person} onClick={submit}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send invitation
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-black uppercase text-slate-500 mb-3">Invitations I&apos;ve sent</h2>
        {sent.length === 0 ? <p className="text-sm text-slate-400">None yet.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-black uppercase text-slate-400"><th className="py-2">Person</th><th>Role</th><th>Status</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {sent.map((a) => (
                <tr key={a.appointmentId}>
                  <td className="py-2 font-bold text-slate-700">{a.memberName ?? "—"}</td>
                  <td className="text-slate-600">{a.roleName}{a.season ? ` · ${a.season}` : ""}</td>
                  <td className="capitalize font-semibold text-slate-500">{a.status === "pending" && a.guardianApproval?.status === "pending" ? "Awaiting guardian" : a.status}</td>
                  <td className="text-right">{a.status === "pending" && <button onClick={() => withdraw(a.appointmentId)} className="text-xs font-bold text-red-600 hover:underline">Withdraw</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
