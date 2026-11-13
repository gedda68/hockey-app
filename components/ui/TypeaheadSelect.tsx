"use client";
// Searchable dropdown: type to filter, arrow keys + Enter to pick, Esc to close.

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface TypeaheadOption { value: string; label: string }

export default function TypeaheadSelect({
  options, value, onChange, placeholder = "Select…", className = "", ariaLabel,
}: {
  options: TypeaheadOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const [query, setQuery] = useState<string | null>(null); // null = showing the selected label
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);

  const shown = query ?? selected?.label ?? "";
  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) { setOpen(false); setQuery(null); }
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const pick = (o: TypeaheadOption | null) => {
    onChange(o ? o.value : "");
    setQuery(null);
    setOpen(false);
  };

  return (
    <div ref={root} className="relative">
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        value={shown}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
        onFocus={(e) => { setOpen(true); e.currentTarget.select(); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); if (e.target.value === "") onChange(""); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && open) { e.preventDefault(); if (filtered[hi]) pick(filtered[hi]); }
          else if (e.key === "Escape") { setOpen(false); setQuery(null); }
        }}
      />
      {open && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
          ) : filtered.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setHi(i)}
              className={`cursor-pointer px-3 py-2 text-sm font-bold ${i === hi ? "bg-yellow-100" : ""} ${o.value === value ? "text-[#06054e]" : "text-slate-700"}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
