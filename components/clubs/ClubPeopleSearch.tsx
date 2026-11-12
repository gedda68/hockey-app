// components/clubs/ClubPeopleSearch.tsx
// Type-ahead search for the club Players / Coaches lists. As you type, a
// dropdown suggests matching people (name + their teams). Picking one shows
// just that person; pressing Enter filters the list by the typed text
// (name or team). Keyboard: ↑/↓ to move, Enter to choose, Esc to close.

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { norm, matchPeople, type PeopleSearchOption } from "@/lib/clubs/peopleSearch";

function Highlight({ text, query }: { text: string; query: string }) {
  const i = norm(text).indexOf(norm(query.trim()));
  if (!query.trim() || i < 0) return <>{text}</>;
  const n = query.trim().length;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-yellow-200 text-inherit">{text.slice(i, i + n)}</mark>
      {text.slice(i + n)}
    </>
  );
}

export default function ClubPeopleSearch({
  basePath,
  options,
  initialQuery = "",
  placeholder = "Search players by name or team…",
}: {
  basePath: string;
  options: PeopleSearchOption[];
  initialQuery?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(initialQuery), [initialQuery]);

  const matches = useMemo(() => matchPeople(options, query), [options, query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (q: string) => {
    setOpen(false);
    setActive(-1);
    router.push(q.trim() ? `${basePath}?q=${encodeURIComponent(q.trim())}` : basePath);
  };
  const choose = (o: PeopleSearchOption) => {
    setQuery(o.name);
    go(o.name);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && matches[active]) choose(matches[active]);
      else go(query);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-blue-500">
        <Search size={18} className="shrink-0 text-slate-400" aria-hidden />
        <input
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {(query || initialQuery) && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              if (initialQuery) go("");
            }}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-auto rounded-2xl bg-white py-1 shadow-2xl ring-1 ring-slate-200"
        >
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm font-semibold text-slate-500">No matches for &ldquo;{query.trim()}&rdquo;</li>
          ) : (
            matches.map((o, i) => (
              <li
                key={o.memberId}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-4 py-2.5 ${i === active ? "bg-blue-50" : ""}`}
              >
                <p className="font-bold text-slate-900">
                  <Highlight text={o.name} query={query} />
                </p>
                {o.teams.length > 0 && (
                  <p className="truncate text-xs font-semibold text-slate-500">
                    <Highlight text={o.teams.join(" · ")} query={query} />
                  </p>
                )}
              </li>
            ))
          )}
          {matches.length > 0 && (
            <li className="border-t border-slate-100 px-4 py-2 text-xs font-semibold text-slate-400">
              Enter to show all matches · ↑↓ to choose
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
