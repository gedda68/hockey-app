// components/member/MemberNameSearch.tsx
// A name box that searches the member's own club. Pick a result to LINK to that member, or just
// keep typing to enter a name manually. Used for emergency contacts.

"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, Search, X } from "lucide-react";

export interface FoundPerson {
  memberId: string;
  name: string;
  contact: { phone: string; mobile: string; email: string } | null;
  contactPrivate: boolean;
}

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400 disabled:bg-amber-50";

export default function MemberNameSearch({
  name, linkedMemberId, disabled, onTyped, onPick, onUnlink,
}: {
  name: string;
  linkedMemberId?: string;
  disabled?: boolean;
  onTyped: (name: string) => void;
  onPick: (p: FoundPerson) => void;
  onUnlink: () => void;
}) {
  const [results, setResults] = useState<FoundPerson[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (linkedMemberId || !open || name.trim().length < 3) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/member/people-search?q=${encodeURIComponent(name.trim())}`, { credentials: "include" });
        setResults(r.ok ? (await r.json()).people ?? [] : []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [name, open, linkedMemberId]);

  if (linkedMemberId) {
    return (
      <div className="flex items-center gap-2">
        <input className={inputCls} value={name} disabled readOnly />
        <span title="Linked to a member record" className="text-teal-600"><Link2 className="h-4 w-4" /></span>
        {!disabled && (
          <button type="button" onClick={onUnlink} title="Unlink and type manually" className="text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input className={`${inputCls} pl-9`} value={name} disabled={disabled} placeholder="Search club members or type a name"
        onChange={(e) => { onTyped(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && name.trim().length >= 3 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {searching && <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>}
          {!searching && results.map((p) => (
            <button key={p.memberId} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(p); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-teal-50">
              {p.name}
              {p.contactPrivate && <span className="ml-2 text-[10px] font-bold uppercase text-amber-700">private contact</span>}
            </button>
          ))}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">No club member found — keep typing to enter this person manually.</p>
          )}
        </div>
      )}
    </div>
  );
}
