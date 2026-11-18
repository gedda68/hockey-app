"use client";
// Committee reports: registration trends, retention, participation by age and gender, officials, schools. Club or association level.

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import PageHeader from "@/components/admin/PageHeader";
import { DataTable, Lines, RateBars, StackedBars } from "@/components/reports/Charts";
import type { CommitteeReport } from "@/lib/reports/committee";

const ASSOC_ROLES = new Set(["association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar", "media-marketing"]);
const GENDERS = ["Female", "Male", "Other", "Unknown"] as const;
const GENDER_NAMES = ["Female", "Male", "Other", "Not stated"];

function Card({ title, note, children, table }: { title: string; note?: string; children: React.ReactNode; table?: React.ReactNode }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div><h2 className="text-base font-black text-slate-800">{title}</h2>{note && <p className="text-xs font-semibold text-slate-500 mt-0.5">{note}</p>}</div>
        {table && <button onClick={() => setAsTable((v) => !v)} className="text-xs font-black text-slate-500 hover:text-slate-800 shrink-0">{asTable ? "Show chart" : "Show table"}</button>}
      </div>
      {asTable && table ? table : children}
    </section>
  );
}
const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-400">{label}</p><p className="text-3xl font-black text-slate-800 leading-none mt-1">{value}</p></div>
);

export default function CommitteeReportsPage() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isSuper = role === "super-admin", isAssoc = ASSOC_ROLES.has(role);
  const year = new Date().getFullYear();
  const [scope, setScope] = useState<"club" | "association" | "global">(isSuper ? "global" : isAssoc ? "association" : "club");
  const [season, setSeason] = useState(String(year));
  const [assocId, setAssocId] = useState(user?.associationId ?? "");
  const [clubId, setClubId] = useState(user?.clubId ?? "");
  const [assocs, setAssocs] = useState<{ associationId: string; name: string }[]>([]);
  const [clubs, setClubs] = useState<{ id?: string; clubId?: string; name: string }[]>([]);
  const [r, setR] = useState<CommitteeReport | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (isSuper) fetch("/api/admin/associations?limit=200").then((x) => x.json()).then((d) => setAssocs(d.associations ?? [])).catch(() => {}); }, [isSuper]);
  useEffect(() => {
    if (!isSuper && !isAssoc) return;
    const a = isSuper ? assocId : user?.associationId ?? "";
    fetch(`/api/admin/clubs?limit=200${a ? `&associationId=${a}` : ""}`).then((x) => x.json()).then((d) => setClubs(d.clubs ?? [])).catch(() => {});
  }, [isSuper, isAssoc, assocId, user?.associationId]);

  const scopeId = scope === "association" ? (isSuper ? assocId : user?.associationId ?? "") : scope === "club" ? (isSuper || isAssoc ? clubId : user?.clubId ?? "") : "";
  const query = `scope=${scope}&season=${season}${scopeId ? `&scopeId=${encodeURIComponent(scopeId)}` : ""}`;
  const ready = scope === "global" || !!scopeId;

  useEffect(() => {
    if (!ready) { setR(null); return; }
    setBusy(true); setErr("");
    fetch(`/api/admin/committee-report?${query}`).then(async (x) => { const d = await x.json(); if (!x.ok) throw new Error(d.error || "Could not load the report"); setR(d); }).catch((e: Error) => setErr(e.message)).finally(() => setBusy(false));
  }, [query, ready]);

  const sel = "px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold";
  const genderSeries = (cells: CommitteeReport["players"]) => GENDERS.map((g) => cells.map((c) => c[g]));
  const cellRows = (cells: CommitteeReport["players"]) => cells.map((c) => [c.label, c.total, c.Female, c.Male, c.Other, c.Unknown]);
  const cellHead = ["Age group", "Total", "Female", "Male", "Other", "Not stated"];
  const cur = r?.retention.find((x) => x.season === season);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-5">
      <PageHeader eyebrow="Reports" title="Committee reports" subtitle="Registration trends, retention, participation by age and gender, officials and schools." />

      <div className="flex flex-wrap items-end gap-3">
        {(isSuper || isAssoc) && <select aria-label="Level" className={sel} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>{isSuper && <option value="global">Everything</option>}<option value="association">Association</option><option value="club">Club</option></select>}
        {isSuper && scope !== "global" && <select aria-label="Association" className={sel} value={assocId} onChange={(e) => setAssocId(e.target.value)}><option value="">Choose association</option>{assocs.map((a) => <option key={a.associationId} value={a.associationId}>{a.name}</option>)}</select>}
        {(isSuper || isAssoc) && scope === "club" && <select aria-label="Club" className={sel} value={clubId} onChange={(e) => setClubId(e.target.value)}><option value="">Choose club</option>{clubs.map((c) => { const id = c.id ?? c.clubId ?? ""; return <option key={id} value={id}>{c.name}</option>; })}</select>}
        <select aria-label="Season" className={sel} value={season} onChange={(e) => setSeason(e.target.value)}>{Array.from({ length: 8 }, (_, i) => year + 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}</select>
        {ready && <a className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-black" href={`/api/admin/committee-report?${query}&format=csv`}>Download spreadsheet</a>}
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-black">Print</button>
      </div>

      {!ready && <p className="text-sm font-bold text-slate-500">Choose a {scope} to see its report.</p>}
      {err && <p className="text-sm font-bold text-red-600">{err}</p>}
      {busy && <p className="text-sm font-bold text-slate-500">Loading…</p>}

      {r && !busy && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Registered people" value={r.totals.members} />
            <Stat label="Players" value={r.totals.players} />
            <Stat label="Coaches" value={r.totals.coaches} />
            <Stat label="Umpires" value={r.totals.umpires} />
            <Stat label="Technical officials" value={r.totals.technical} />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Card title="Registrations by season" note="Everyone registered each season." table={<DataTable head={["Season", "People", "Players", "Coaches", "Umpires", "Technical"]} rows={r.trend.map((t) => [t.season, t.people, t.players, t.coaches, t.umpires, t.technical])} />}>
              <Lines labels={r.trend.map((t) => t.season)} names={["People", "Players", "Coaches", "Umpires"]} series={[r.trend.map((t) => t.people), r.trend.map((t) => t.players), r.trend.map((t) => t.coaches), r.trend.map((t) => t.umpires)]} />
            </Card>
            <Card title="When people registered" note={`${season} against ${Number(season) - 1}, by month of first registration.`} table={<DataTable head={["Month", season, String(Number(season) - 1)]} rows={r.monthly.map((m) => [m.month, m.current, m.previous])} />}>
              <Lines labels={r.monthly.map((m) => m.month)} names={[season, String(Number(season) - 1)]} series={[r.monthly.map((m) => m.current), r.monthly.map((m) => m.previous)]} />
            </Card>
          </div>

          <Card title="Retention year on year" note={cur ? `${cur.retained} of ${cur.previous} people registered in ${Number(season) - 1} registered again in ${season} (${cur.rate}%). ${cur.returning} came back after a break and ${cur.brandNew} are new.` : "Needs the previous season's registrations."} table={<DataTable head={["Season", "Last season", "Registered again", "Did not return", "Returning after a break", "New", "Retention %"]} rows={r.retention.map((t) => [t.season, t.previous, t.retained, t.lapsed, t.returning, t.brandNew, `${t.rate}%`])} />}>
            <RateBars rows={r.retention.map((t) => ({ label: t.season, rate: t.rate, note: `${t.retained} of ${t.previous}` }))} />
          </Card>

          <div className="grid md:grid-cols-2 gap-5">
            <Card title="Retention by age group" note={`Where people were last season, and how many came back in ${season}.`} table={<DataTable head={["Age group", "Last season", "Registered again", "Retention %"]} rows={r.retentionByAge.map((t) => [t.label, t.cohort, t.retained, `${t.rate}%`])} />}>
              <RateBars rows={r.retentionByAge.map((t) => ({ label: t.label, rate: t.rate, note: `${t.retained} of ${t.cohort}` }))} />
            </Card>
            <Card title="Retention by gender" table={<DataTable head={["Gender", "Last season", "Registered again", "Retention %"]} rows={r.retentionByGender.map((t) => [t.label, t.cohort, t.retained, `${t.rate}%`])} />}>
              <RateBars rows={r.retentionByGender.map((t) => ({ label: t.label === "Unknown" ? "Not stated" : t.label, rate: t.rate, note: `${t.retained} of ${t.cohort}` }))} />
            </Card>
          </div>

          <Card title="Player participation by age group and gender" note={`Age is ${season} minus year of birth.`} table={<DataTable head={cellHead} rows={cellRows(r.players)} />}>
            <StackedBars labels={r.players.map((c) => c.label)} names={GENDER_NAMES} series={genderSeries(r.players)} />
          </Card>
          <Card title="All members by age group and gender" note="Players, coaches, umpires, technical officials and everyone else registered." table={<DataTable head={cellHead} rows={cellRows(r.members)} />}>
            <StackedBars labels={r.members.map((c) => c.label)} names={GENDER_NAMES} series={genderSeries(r.members)} />
          </Card>

          <Card title="Registered coaches, umpires and technical officials">
            <div className="grid md:grid-cols-3 gap-5">
              {([["Coaches", r.officials.coaches], ["Umpires", r.officials.umpires], ["Technical officials", r.officials.technical]] as const).map(([t, list]) => (
                <div key={t}><h3 className="text-sm font-black text-slate-700 mb-1">{t} ({list.length})</h3>
                  <ul className="text-sm font-semibold text-slate-700 max-h-64 overflow-auto space-y-0.5">{list.map((o) => <li key={o.memberId}>{o.name}{o.clubs.length > 0 && <span className="text-slate-400"> · {o.clubs.join(", ")}</span>}</li>)}{!list.length && <li className="text-slate-400">None registered</li>}</ul>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Schools and districts" note={`${r.school.atSchool} at school, ${r.school.notAtSchool} not at school, ${r.school.notRecorded} not recorded. Recorded for ${r.school.youngCoverage}% of members aged 18 and under.`} table={<DataTable head={["School", "District", "Members"]} rows={r.school.schools.map((s) => [s.label, s.district, s.count])} />}>
            <div className="grid md:grid-cols-2 gap-5">
              <div><h3 className="text-sm font-black text-slate-700 mb-2">Districts</h3><RateBars unit="" rows={r.school.districts.map((d) => ({ label: d.label, rate: Math.round((d.count / Math.max(1, r.school.districts[0].count)) * 100), note: "", shown: `${d.count}` }))} /></div>
              <div><h3 className="text-sm font-black text-slate-700 mb-2">Schools</h3><RateBars unit="" rows={r.school.schools.slice(0, 10).map((d) => ({ label: d.label, rate: Math.round((d.count / Math.max(1, r.school.schools[0].count)) * 100), note: "", shown: `${d.count}` }))} /></div>
            </div>
          </Card>

          {r.clubs.length > 1 && (
            <Card title="Clubs">
              <DataTable head={["Club", "People", "Players", "Last season", "Registered again", "Retention %"]} rows={r.clubs.map((c) => [c.name, c.people, c.players, c.previous, c.retained, `${c.rate}%`])} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
