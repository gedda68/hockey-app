"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SearchResult = {
  kind: "news" | "club" | "team";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

function groupLabel(kind: SearchResult["kind"]): string {
  if (kind === "news") return "News";
  if (kind === "club") return "Clubs";
  return "Teams";
}

export default function SearchClient() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { results?: SearchResult[] };
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (e) {
        if ((e as any)?.name === "AbortError") return;
        setError("Search failed. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  const grouped = useMemo(() => {
    const m = new Map<SearchResult["kind"], SearchResult[]>();
    for (const r of results) {
      const arr = m.get(r.kind) ?? [];
      arr.push(r);
      m.set(r.kind, arr);
    }
    return m;
  }, [results]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-xs font-black uppercase text-slate-500 hover:text-[#06054e]"
        >
          ← Home
        </Link>
        <h1 className="mt-4 text-4xl font-black uppercase text-[#06054e] tracking-tight">
          Search
        </h1>
        <p className="mt-2 text-slate-600">
          Search news, clubs, and teams within this portal.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500">
            Search
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type at least 2 characters…"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-[#06054e]/40 focus:ring-4 focus:ring-[#06054e]/10"
          />
          <div className="mt-2 text-xs text-slate-500">
            {loading ? "Searching…" : q.trim().length < 2 ? " " : `${results.length} result(s)`}
          </div>
        </div>

        {error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : null}

        {q.trim().length >= 2 && !loading && results.length === 0 && !error ? (
          <p className="mt-6 text-sm text-slate-500">No results found.</p>
        ) : null}

        <div className="mt-8 space-y-10">
          {(["news", "club", "team"] as const).map((kind) => {
            const rows = grouped.get(kind) ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={kind}>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  {groupLabel(kind)}
                </h2>
                <ul className="mt-3 space-y-2">
                  {rows.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <Link
                        href={r.href}
                        className="block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-[#06054e]/30"
                      >
                        <div className="font-black text-slate-900">{r.title}</div>
                        {r.subtitle ? (
                          <div className="mt-1 text-xs text-slate-500">{r.subtitle}</div>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

