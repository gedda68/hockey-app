"use client";
// Multi-select with type-ahead: chips for chosen items, type to filter, click / Enter to toggle.

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export interface MultiOption {
  value: string;
  label: string;
  hint?: string;
}

const prettyId = (v: string) =>
  v
    .replace(/^(role|type|gender)-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function TypeaheadMultiSelect({
  options,
  knownOptions,
  values,
  onChange,
  placeholder = "Search and select…",
  ariaLabel,
}: {
  options: MultiOption[];
  /** Extra items (e.g. inactive roles) used only to name values already selected. */
  knownOptions?: MultiOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

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
  }, [open, values.length]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!root.current?.contains(t) && !listRef.current?.contains(t)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const find = (v: string) =>
    options.find((o) => o.value === v) ??
    knownOptions?.find((o) => o.value === v);
  const labelOf = (v: string) => find(v)?.label ?? prettyId(v); // unknown saved ids still read as words, not raw ids
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, query]);

  const toggle = (v: string) => {
    onChange(
      values.includes(v) ? values.filter((x) => x !== v) : [...values, v],
    );
    // Clear the typed text so the next name can be typed straight away.
    setQuery("");
    setHi(0);
  };

  return (
    <div ref={root} className="relative">
      <div
        className="flex min-h-[3rem] w-full cursor-text flex-wrap items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-3 py-2 pr-10 hover:border-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200"
        onClick={() => {
          setOpen(true);
          root.current?.querySelector("input")?.focus();
        }}
      >
        {values.map((v) => (
          <span
            key={v}
            title={find(v)?.hint}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-900"
          >
            {labelOf(v)}
            <button
              type="button"
              aria-label={`Remove ${labelOf(v)}`}
              onClick={(e) => {
                e.stopPropagation();
                toggle(v);
              }}
              className="rounded-full px-1 text-blue-700 hover:bg-blue-200"
            >
              ×
            </button>
          </span>
        ))}
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          autoComplete="off"
          value={query}
          placeholder={values.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-sm font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHi(0);
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
              if (filtered[hi]) toggle(filtered[hi].value);
            } else if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
            } else if (e.key === "Backspace" && query === "" && values.length)
              onChange(values.slice(0, -1));
          }}
        />
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className={`pointer-events-none absolute right-3 top-6 h-4 w-4 -translate-y-1/2 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 8l5 5 5-5" />
      </svg>
      {open &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: "fixed",
              left: rect.left,
              top: rect.top,
              width: rect.width,
              zIndex: 10000,
            }}
            className="max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400">No matches</li>
            ) : (
              filtered.map((o, i) => {
                const on = values.includes(o.value);
                return (
                  <li
                    key={o.value}
                    role="option"
                    aria-selected={on}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(o.value);
                    }}
                    onMouseEnter={() => setHi(i)}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${i === hi ? "bg-yellow-100" : ""}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-black ${on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span className="flex-1">
                      <span className="block font-bold text-slate-800">
                        {o.label}
                      </span>
                      {o.hint && (
                        <span className="block text-xs text-slate-500">
                          {o.hint}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
