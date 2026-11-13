"use client";
// Searchable dropdown: type to filter, arrow keys + Enter to pick, Esc to close.

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export interface TypeaheadOption {
  value: string;
  label: string;
}

// Used when the caller passes no className: a visible, full-width box with a chevron so it
// is obvious the field can be edited, and room for long names.
const DEFAULT_INPUT =
  "w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-bold text-slate-900 " +
  "placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function TypeaheadSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className,
  ariaLabel,
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
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // The list is drawn in a portal with fixed position so parent cards (overflow-hidden) cannot clip it.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = root.current?.getBoundingClientRect();
      if (r) setRect({ left: r.left, top: r.bottom + 4, width: r.width });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const shown = query ?? selected?.label ?? value ?? ""; // unknown saved values stay visible
  const filtered = useMemo(() => {
    const q = (query ?? "").trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !listRef.current?.contains(t)) {
        setOpen(false);
        setQuery(null);
      }
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
        title={shown}
        className={className ?? DEFAULT_INPUT}
        onFocus={(e) => {
          setOpen(true);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHi(0);
          if (e.target.value === "") onChange("");
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
            if (filtered[hi]) pick(filtered[hi]);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery(null);
          }
        }}
      />
      {className === undefined && (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      )}
      {open &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            style={{
              position: "fixed",
              left: rect.left,
              top: rect.top,
              width: rect.width,
              zIndex: 10000,
            }}
            className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                  onMouseEnter={() => setHi(i)}
                  className={`cursor-pointer px-3 py-2 text-sm font-bold ${i === hi ? "bg-yellow-100" : ""} ${o.value === value ? "text-[#06054e]" : "text-slate-700"}`}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
