"use client";
// Member registration page: details, registrations and itemised fees by level, teams (selected /
// shadow), nominations, stats and history. Styled in the member's club colours.
// Used by /admin/my-registration (the member) and /admin/registrations/[memberId] (limited admin view).

import { useEffect, useState } from "react";
import type { RegistrationSummary } from "@/lib/members/registrationSummary";

const pretty = (id: string) => id.replace(/^role-/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const $ = (n: number) => `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function Card({ title, children, color }: { title: string; children: React.ReactNode; color: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wider" style={{ color }}>{title}</h2>
      {children}
    </section>
  );
}
const Empty = ({ text }: { text: string }) => <p className="text-sm text-slate-400">{text}</p>;

export default function MemberRegistrationView({ memberId }: { memberId?: string }) {
  const [data, setData] = useState<{ view: "self" | "admin"; summary: RegistrationSummary; editable?: string[] } | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const q = memberId ? `?memberId=${encodeURIComponent(memberId)}` : "";
    fetch(`/api/member/registration-summary${q}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [memberId, tick]);

  async function changeFee(body: Record<string, unknown>) {
    setBusy(true); setNote("");
    try {
      const res = await fetch(`/api/admin/registrations/${encodeURIComponent(data!.summary.member.memberId)}/fees`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setTick((t) => t + 1);
    } catch (e) { setNote(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }

  if (error) return <p className="p-8 font-bold text-red-600">{error}</p>;
  if (!data) return <p className="p-8 text-slate-400">Loading…</p>;

  const { view, summary: s } = data;
  const club = s.levels.find((l) => l.kind === "club");
  const primary = club?.primary ?? "#06054e";
  const secondary = club?.secondary ?? "#1a1870";
  const years = Object.keys(s.fees.bySeason).sort().reverse();
  const stats = s.stats;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header className="rounded-3xl p-6 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">
          {view === "self" ? "My Registration" : "Member registration (limited view)"}
        </p>
        <h1 className="text-3xl font-black">{s.member.name}</h1>
        <p className="mt-1 text-sm opacity-90">
          #{s.member.memberNumber} · Born {s.member.dateOfBirth || "—"}
          {s.member.age !== null && ` · Age ${s.member.age}`} · {s.member.status || "—"}
        </p>
        <p className="mt-2 text-sm font-bold opacity-95">{s.levels.map((l) => l.name).join("  ›  ") || "No club"}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[["Fees sent", s.fees.total.sent], ["Paid", s.fees.total.paid], ["Outstanding", s.fees.total.outstanding]].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-black" style={{ color: k === "Outstanding" && (v as number) > 0 ? "#dc2626" : primary }}>{$(v as number)}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{k as string}</div>
          </div>
        ))}
      </div>

      {note && <p className="font-bold text-red-600">{note}</p>}
      <Card title="Registrations & fees by season" color={primary}>
        {s.registrations.length === 0 ? <Empty text="No registrations yet." /> : (
          <div className="space-y-4">
            {years.map((y) => {
              const f = s.fees.bySeason[y];
              const regs = s.registrations.filter((r) => String(r.season) === y);
              return (
                <div key={y}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-black">{y}</h3>
                    <span className="text-xs text-slate-500">Sent {$(f.sent)} · Paid {$(f.paid)} · Outstanding {$(f.outstanding)}</span>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-400"><tr><th className="py-1">Level</th><th>Type</th><th>Roles</th><th>Status</th><th className="text-right">Fee</th></tr></thead>
                    <tbody>
                      {regs.map((r) => (
                        <tr key={`${r.levelKind}-${r.levelId}`} className="border-t border-slate-100" title={r.fees.map((x) => `${x.name}: ${$(x.amount)}`).join("\n")}>
                          <td className="py-1.5 font-bold">{r.level}</td>
                          <td>{pretty(r.category || "—")}</td>
                          <td>{r.roles.map(pretty).join(", ") || "—"}</td>
                          <td>{r.status}</td>
                          <td className="text-right font-bold">{$(r.fee)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <FeeLines
                    season={Number(y)}
                    regs={regs}
                    editable={new Set(data.editable ?? [])}
                    levels={s.levels}
                    busy={busy}
                    onChange={changeFee}
                  />
                  {Object.keys(f.byLevel).length > 0 && (
                    <ul className="mt-1 text-xs text-slate-500">
                      {Object.entries(f.byLevel).map(([lvl, v]) => (
                        <li key={lvl}>{lvl}: sent {$(v.sent)}, paid {$(v.paid)}, outstanding {$(v.outstanding)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Teams (selected, shadow)" color={primary}>
          {s.teams.length === 0 ? <Empty text="Not in any team yet." /> : (
            <ul className="space-y-1.5 text-sm">
              {s.teams.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2">
                  <span><b>{t.season}</b> · {t.team} <span className="text-slate-400">({t.club})</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-black ${t.status === "selected" ? "bg-green-100 text-green-700" : t.status === "shadow" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {t.status === "selected" ? `Selected${t.number ? ` #${t.number}` : ""}${t.position ? ` · ${t.position}` : ""}` : t.status === "shadow" ? "Shadow" : "Unavailable"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Teams nominated for" color={primary}>
          {s.nominations.length === 0 ? <Empty text="No nominations." /> : (
            <ul className="space-y-1.5 text-sm">
              {s.nominations.map((n) => (
                <li key={n.nominationId} className="flex items-center justify-between gap-2">
                  <span>{n.window}{n.date && <span className="text-slate-400"> · {new Date(n.date).toLocaleDateString()}</span>}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">{pretty(n.status)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {stats && stats.gamesTotal > 0 && (
        <Card title="Stats" color={primary}>
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[["Games this season", stats.gamesSeason], ["Games total", stats.gamesTotal], ["Goals this season", stats.goalsSeason], ["Goals total", stats.goalsTotal]].map(([k, v]) => (
              <div key={k as string}><div className="text-2xl font-black" style={{ color: primary }}>{v as number}</div><div className="text-xs font-bold uppercase text-slate-500">{k as string}</div></div>
            ))}
          </div>
        </Card>
      )}

      <Card title="History" color={primary}>
        {s.history.length === 0 ? <Empty text="No team history yet." /> : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr><th className="py-1">Year</th><th>Team</th><th>Role</th><th className="text-right">Games</th><th className="text-right">Goals</th></tr></thead>
            <tbody>
              {s.history.map((h, i) => (
                <tr key={i} className="border-t border-slate-100"><td className="py-1.5 font-bold">{h.year}</td><td>{h.team}</td><td>{h.roles.join(", ")}</td><td className="text-right">{h.games}</td><td className="text-right">{h.goals}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

type Reg = RegistrationSummary["registrations"][number];

/** Itemised fee lines for one season, with add / edit / remove for the levels the viewer administers. */
function FeeLines({ season, regs, editable, levels, busy, onChange }: {
  season: number; regs: Reg[]; editable: Set<string>; levels: RegistrationSummary["levels"]; busy: boolean;
  onChange: (b: Record<string, unknown>) => Promise<void>;
}) {
  const [edit, setEdit] = useState<{ itemId: string; name: string; amount: string } | null>(null);
  const [add, setAdd] = useState<{ level: string; name: string; amount: string } | null>(null);
  const lines = new Map<string, Reg["fees"][number]>();
  for (const r of regs) for (const f of r.fees) if (f.itemId) lines.set(f.itemId, f);
  const levelOf = (f: Reg["fees"][number]) => (f.associationId ? { kind: "association", id: f.associationId } : { kind: "club", id: f.clubId ?? "" });
  const mine = levels.filter((l) => editable.has(`${l.kind}:${l.id}`));
  if (lines.size === 0 && mine.length === 0) return null;
  const input = "rounded-lg border-2 border-slate-300 px-2 py-1 text-sm";

  return (
    <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
      <div className="mb-1 text-xs font-black uppercase tracking-wider text-slate-400">Fee lines</div>
      <ul className="space-y-1">
        {[...lines.values()].map((f) => {
          const lv = levelOf(f);
          const can = editable.has(`${lv.kind}:${lv.id}`);
          return (
            <li key={f.itemId} className="flex flex-wrap items-center justify-between gap-2">
              {edit?.itemId === f.itemId ? (
                <span className="flex flex-wrap items-center gap-2">
                  <input className={input} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Fee name" />
                  <input className={`${input} w-24`} inputMode="decimal" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })} aria-label="Amount" />
                  <button disabled={busy} className="font-bold text-green-700" onClick={async () => { await onChange({ season, action: "edit", levelKind: lv.kind, levelId: lv.id, itemId: f.itemId, name: edit.name, amount: Number(edit.amount) }); setEdit(null); }}>Save</button>
                  <button className="text-slate-500" onClick={() => setEdit(null)}>Cancel</button>
                </span>
              ) : (
                <>
                  <span>{f.name}</span>
                  <span className="flex items-center gap-3">
                    <b>{$(f.amount)}</b>
                    {can && <button className="text-blue-700 hover:underline" onClick={() => setEdit({ itemId: f.itemId, name: f.name, amount: String(f.amount) })}>Edit</button>}
                    {can && <button disabled={busy} className="text-red-600 hover:underline" onClick={() => { if (confirm(`Remove "${f.name}"?`)) void onChange({ season, action: "remove", levelKind: lv.kind, levelId: lv.id, itemId: f.itemId }); }}>Remove</button>}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {mine.length > 0 && (add ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className={input} value={add.level} onChange={(e) => setAdd({ ...add, level: e.target.value })} aria-label="Level">
            {mine.map((l) => <option key={`${l.kind}:${l.id}`} value={`${l.kind}:${l.id}`}>{l.name}</option>)}
          </select>
          <input className={input} placeholder="Fee name" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
          <input className={`${input} w-24`} placeholder="Amount" inputMode="decimal" value={add.amount} onChange={(e) => setAdd({ ...add, amount: e.target.value })} />
          <button disabled={busy} className="font-bold text-green-700" onClick={async () => { const [k, ...id] = add.level.split(":"); await onChange({ season, action: "add", levelKind: k, levelId: id.join(":"), name: add.name, amount: Number(add.amount) }); setAdd(null); }}>Add</button>
          <button className="text-slate-500" onClick={() => setAdd(null)}>Cancel</button>
        </div>
      ) : (
        <button className="mt-2 font-bold text-blue-700 hover:underline" onClick={() => setAdd({ level: `${mine[0].kind}:${mine[0].id}`, name: "", amount: "" })}>+ Add fee</button>
      ))}
    </div>
  );
}
