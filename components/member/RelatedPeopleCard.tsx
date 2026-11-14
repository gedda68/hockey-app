// components/member/RelatedPeopleCard.tsx
// "Related people": family and other people linked to you. Add by searching your club's members
// (linked) or by typing a name (unlinked) — or pick another club first to add someone from there. Also shows people who have listed YOU as related.

"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Search, Link2, Users, Lock } from "lucide-react";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";
import { resolveSelection, type PickOption } from "@/lib/members/profileOptions";

export interface Related { id?: string; memberId?: string; name: string; relationshipType: string; clubId?: string; clubName?: string; city?: string }
interface ClubOpt { id: string; name: string; city: string }
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
  const [otherClub, setOtherClub] = useState(false);
  const [club, setClub] = useState<ClubOpt | null>(null);
  const [cq, setCq] = useState("");
  const [clubResults, setClubResults] = useState<ClubOpt[]>([]);
  const ctimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ctimer.current) clearTimeout(ctimer.current);
    if (cq.trim().length < 2) { setClubResults([]); return; }
    ctimer.current = setTimeout(async () => {
      const r = await fetch(`/api/member/club-options?q=${encodeURIComponent(cq.trim())}`, { credentials: "include" });
      const d = r.ok ? await r.json() : { clubs: [] };
      setClubResults(d.clubs ?? []);
    }, 250);
    return () => { if (ctimer.current) clearTimeout(ctimer.current); };
  }, [cq]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3 || (otherClub && !club)) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/member/people-search?q=${encodeURIComponent(q.trim())}${otherClub && club ? `&clubId=${encodeURIComponent(club.id)}` : ""}`, { credentials: "include" });
        const d = r.ok ? await r.json() : { people: [] };
        setResults(d.people ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, otherClub, club]);

  const relLabel = (v: string) => {
    const r = resolveSelection(relationships, v);
    return r.options.find((o) => o.value === r.value)?.label ?? v;
  };
  const set = (i: number, patch: Partial<Related>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addLinked = (p: { memberId: string; name: string }) => {
    if (value.some((r) => r.memberId === p.memberId)) return;
    onChange([...value, { memberId: p.memberId, name: p.name, relationshipType: "", ...(otherClub && club ? { clubId: club.id, clubName: club.name, city: club.city } : {}) }]);
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
              {r.clubName && <p className="text-[11px] font-semibold text-slate-500 mt-1">{r.clubName}{r.city ? ` · ${r.city}` : ""}</p>}
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
          <div className="space-y-3">
            <div className="flex gap-2">
              {[{ k: false, t: "My club" }, { k: true, t: "Another club" }].map((o) => (
                <button key={String(o.k)} type="button" onClick={() => { setOtherClub(o.k); setQ(""); setResults([]); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-black border-2 ${otherClub === o.k ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-200 text-slate-500"}`}>{o.t}</button>
              ))}
            </div>

            {otherClub && (
              <div className="relative">
                <label className={labelCls}>Club</label>
                {club ? (
                  <div className="flex items-center justify-between rounded-xl border-2 border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-slate-800">
                    <span>{club.name}{club.city ? ` · ${club.city}` : ""}</span>
                    <button type="button" onClick={() => { setClub(null); setCq(""); setQ(""); }} className="text-xs font-bold text-teal-700 hover:underline">Change</button>
                  </div>
                ) : (
                  <>
                    <input className={inputCls} value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Type the club name or city…" />
                    {cq.trim().length >= 2 && (
                      <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                        {clubResults.map((c) => (
                          <button key={c.id} type="button" onClick={() => { setClub(c); setCq(""); setClubResults([]); }} className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-50">
                            {c.name}{c.city && <span className="text-slate-400 font-medium"> · {c.city}</span>}
                          </button>
                        ))}
                        {clubResults.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No clubs found.</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {(!otherClub || club) && (
              <div>
                <label className={labelCls}>{otherClub && club ? `Add a person from ${club.name}` : "Add a person from your club"}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least 3 letters of their name…" />
                  {q.trim().length >= 3 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {searching && <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>}
                      {!searching && results.map((p) => (
                        <button key={p.memberId} type="button" onClick={() => addLinked(p)} className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-50">{p.name}</button>
                      ))}
                      {!searching && results.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No members found.</p>}
                    </div>
                  )}
                </div>
                {q.trim().length >= 2 && (
                  <button type="button" onClick={() => { onChange([...value, { name: q.trim(), relationshipType: "", ...(otherClub && club ? { clubId: club.id, clubName: club.name, city: club.city } : {}) }]); setQ(""); setResults([]); }}
                    className="mt-2 inline-flex items-center gap-1 rounded-xl border-2 border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-100">
                    <Plus className="h-3.5 w-3.5" /> Add &ldquo;{q.trim()}&rdquo; without linking
                  </button>
                )}
                <p className="text-[11px] text-slate-400 mt-1">Pick a match to link them, or add the name as typed. You can add as many people as you like.</p>
              </div>
            )}
            {otherClub && !club && <p className="text-[11px] text-slate-400">Choose the club first, then add the person.</p>}
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
