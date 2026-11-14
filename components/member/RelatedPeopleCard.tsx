// components/member/RelatedPeopleCard.tsx
// "Related people": family and other people linked to you. Add by searching your club's members
// (linked) or by typing a name (unlinked). Also shows people who have listed YOU as related.

"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Search, Link2, Users, Lock } from "lucide-react";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";
import { resolveSelection, type PickOption } from "@/lib/members/profileOptions";

export interface Related { id?: string; memberId?: string; name: string; relationshipType: string }
export interface RelatedToMe { memberId: string; name: string; relationshipType: string }

const labelCls = "block text-xs font-black uppercase tracking-wide text-slate-400 mb-1";
const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 disabled:bg-amber-50";

export default function RelatedPeopleCard({
  value, onChange, relationships, relatedToMe, locked,
}: {
  value: Related[];
  onChange: (v: Related[]) => void;
  relationships: PickOption[];
  relatedToMe: RelatedToMe[];
  locked?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ memberId: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/member/people-search?q=${encodeURIComponent(q.trim())}`, { credentials: "include" });
        const d = r.ok ? await r.json() : { people: [] };
        setResults(d.people ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const relLabel = (v: string) => {
    const r = resolveSelection(relationships, v);
    return r.options.find((o) => o.value === r.value)?.label ?? v;
  };
  const set = (i: number, patch: Partial<Related>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addLinked = (p: { memberId: string; name: string }) => {
    if (value.some((r) => r.memberId === p.memberId)) return;
    onChange([...value, { memberId: p.memberId, name: p.name, relationshipType: "" }]);
    setQ(""); setResults([]);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Users className="h-4 w-4 text-teal-600" />
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">Related people</h2>
        {locked && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5"><Lock className="h-2.5 w-2.5" /> Locked</span>}
      </div>
      <div className="p-5 space-y-5">
        {value.length === 0 && <p className="text-sm text-slate-400">No related people yet — add a parent, child, partner or sibling.</p>}

        {value.map((r, i) => (
          <div key={r.id ?? r.memberId ?? i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-100 rounded-xl p-4">
            <div>
              <label className={labelCls}>Person {r.memberId && <Link2 className="inline h-3 w-3 text-teal-600" aria-label="Linked member" />}</label>
              <input className={inputCls} value={r.name} disabled={locked || !!r.memberId} onChange={(e) => set(i, { name: e.target.value })} />
              {r.memberId && <p className="text-[11px] text-slate-400 mt-1">Linked member record {r.memberId}</p>}
            </div>
            <div>
              <label className={labelCls}>Relationship</label>
              {locked ? (
                <input className={inputCls} disabled value={relLabel(r.relationshipType)} readOnly />
              ) : (() => {
                const sel = resolveSelection(relationships, r.relationshipType);
                return (
                  <TypeaheadSelect options={sel.options} value={sel.value} onChange={(v) => set(i, { relationshipType: v })} placeholder="Type to search…"
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400" />
                );
              })()}
            </div>
            {!locked && (
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="sm:col-span-2 justify-self-start inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
        ))}

        {!locked && (
          <div>
            <label className={labelCls}>Add a person from your club</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 3 letters of their name…" />
              {q.trim().length >= 3 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {searching && <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>}
                  {!searching && results.map((p) => (
                    <button key={p.memberId} type="button" onClick={() => addLinked(p)} className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-50">{p.name}</button>
                  ))}
                  {!searching && results.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No club members found.</p>}
                  <button type="button" onClick={() => { onChange([...value, { name: q.trim(), relationshipType: "" }]); setQ(""); setResults([]); }}
                    className="w-full text-left px-3 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50 border-t border-slate-100">
                    <Plus className="inline h-3.5 w-3.5 mr-1" /> Add &ldquo;{q.trim()}&rdquo; without linking
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {relatedToMe.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <p className={labelCls}>People who list you as related</p>
            <ul className="space-y-1">
              {relatedToMe.map((p) => (
                <li key={p.memberId} className="text-sm font-semibold text-slate-700">
                  {p.name} <span className="text-slate-400 font-medium">— {p.relationshipType ? relLabel(p.relationshipType) : "related"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
