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
  const [data, setData] = useState<{ view: "self" | "admin"; summary: RegistrationSummary } | null>(null);
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
  }, [memberId]);

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
