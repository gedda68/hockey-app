"use client";
// Shared registrations table: registration type, itemised cost, season/status/name filters, paged.

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Reg {
  registrationId: string;
  memberId: string;
  memberName: string;
  clubId: string;
  seasonYear: number;
  status: string;
  registrationType?: string;
  membershipType?: string;
  roleIds?: string[];
  registeredDate?: string;
  registrationCategory?: string;
  totalFee?: number;
  fees?: { name: string; amount: number }[];
}

const money = (n?: number) =>
  typeof n === "number" ? `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0 })}` : "—";

const pretty = (id: string) =>
  id.replace(/^role-/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function RegistrationsTable({
  title,
  subtitle,
  endpoint,
  hideRoles = false,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  /** Associations do not hold player roles, so their list omits the roles column. */
  hideRoles?: boolean;
}) {
  const [rows, setRows] = useState<Reg[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [season, setSeason] = useState<string>("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ page: String(page) });
      if (season) p.set("season", season);
      if (status) p.set("status", status);
      if (q.trim()) p.set("q", q.trim());
      const res = await fetch(`${endpoint}?${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(data.registrations);
      setTotal(data.total);
      setPageSize(data.pageSize);
      setSeasons([...new Set<number>((data.seasons as unknown[]).map(Number))]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, season, status, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const input = "rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold";

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-black text-[#06054e]">{title}</h1>
        <p className="text-sm text-slate-500">
          {subtitle} ({total.toLocaleString()} records)
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className={`${input} min-w-[16rem] flex-1`}
          placeholder="Search name or member number…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <select className={input} value={season} onChange={(e) => { setSeason(e.target.value); setPage(1); }} aria-label="Season">
          <option value="">All seasons</option>
          {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={input} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {error && <p className="font-bold text-red-600">{error}</p>}

      <p className="text-xs text-slate-400">Hover a cost to see the itemised fees (club and each association).</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Season</th>
              {!hideRoles && <th className="px-4 py-3">Roles</th>}
              <th className="px-4 py-3">Registration type</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Registered</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={hideRoles ? 6 : 7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={hideRoles ? 6 : 7} className="px-4 py-10 text-center text-slate-400">No registrations found</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.registrationId} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/admin/registrations/${r.memberId}`} className="font-bold text-blue-700 hover:underline">
                      {r.memberName || r.memberId}
                    </Link>
                    <div className="text-xs text-slate-400">{r.memberId}</div>
                  </td>
                  <td className="px-4 py-3 font-bold">{r.seasonYear}</td>
                  {!hideRoles && <td className="px-4 py-3">{(r.roleIds ?? []).map(pretty).join(", ") || "—"}</td>}
                  <td className="px-4 py-3">{r.registrationCategory ? pretty(r.registrationCategory) : r.membershipType ? pretty(r.membershipType) : "—"}</td>
                  <td className="px-4 py-3 text-right font-bold" title={(r.fees ?? []).map((f) => `${f.name}: $${f.amount}`).join("\n")}>{money(r.totalFee)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-black ${r.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.registeredDate ? new Date(r.registeredDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm font-bold text-slate-600">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border-2 px-3 py-1 disabled:opacity-40">Previous</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border-2 px-3 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
