"use client";

// components/admin/SponsorBar.tsx
// Replaces the old page footer: a slim bar fixed to the bottom of the admin area showing the partners and sponsors of the member's club and of
// the associations above it. It can be tucked away to a small tab, and remembers that on this device.

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBrand } from "@/lib/contexts/BrandContext";
import { recordPartnerImpressions, recordPartnerStripClick } from "@/components/website/PartnerStripClickable";
import type { SponsorGroup } from "@/lib/sponsors/groups";

const KEY = "sponsor-bar-collapsed";

export default function SponsorBar() {
  const { user } = useAuth();
  const { brand } = useBrand();
  const [groups, setGroups] = useState<SponsorGroup[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(KEY) === "1"); } catch { /* storage unavailable: stay open */ }
  }, []);

  const scope = `${user?.clubId ?? ""}|${user?.associationId ?? ""}`;
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/member/sponsors", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { groups: [] }))
      .then((d) => { if (!cancelled) setGroups(Array.isArray(d.groups) ? d.groups : []); })
      .catch(() => { if (!cancelled) setGroups([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, !!user]);

  // Count the sponsors only while the bar is open and they can actually be seen.
  useEffect(() => {
    if (collapsed) return;
    for (const g of groups) recordPartnerImpressions(g.scopeType, g.scopeId, g.partners.map((_, i) => i), "portal");
  }, [groups, collapsed]);

  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(KEY, c ? "0" : "1"); } catch { /* ignore */ }
      return !c;
    });
  };

  return (
    <>
      {/* Keeps the end of the page clear of the fixed bar. */}
      <div aria-hidden className={collapsed ? "h-8" : "h-16"} />
      <div role="complementary" aria-label="Partners and sponsors" className="fixed bottom-0 left-0 right-0 z-[900] border-t border-slate-200 bg-white shadow-[0_-4px_12px_rgba(15,23,42,0.08)] md:left-64">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          className="absolute -top-6 right-4 flex items-center gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900"
        >
          {groups.length ? "Partners" : "Links"} {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {!collapsed && (
          <div className="flex h-16 items-center gap-6 px-4">
            <div className="shrink-0 text-[11px] leading-tight text-slate-600">
              <p className="font-black text-slate-800">© {new Date().getFullYear()} {brand?.name ?? "Hockey Management System"}</p>
              <nav className="mt-0.5 flex gap-3 font-bold">
                <Link href="/" className="hover:underline">Public site</Link>
                <Link href="/competitions" className="hover:underline">Competitions</Link>
                <Link href="/clubs" className="hover:underline">Clubs</Link>
              </nav>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto border-l border-slate-200 pl-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => (
              <div key={`${g.scopeType}:${g.scopeId}`} className="flex shrink-0 items-center gap-4 border-r border-slate-200 pr-6 last:border-r-0">
                <span className="max-w-[9rem] text-[10px] font-black uppercase leading-tight tracking-wide text-slate-600">{g.label}<br />partners</span>
                <ul className="flex items-center gap-5">
                  {g.partners.map((p, slot) => {
                    const inner = p.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote partner logos
                      <img src={p.logoUrl} alt={p.name} title={p.name} className="max-h-9 w-auto max-w-[120px] object-contain" />
                    ) : (
                      <span className="whitespace-nowrap text-xs font-black text-slate-700">{p.name}</span>
                    );
                    return (
                      <li key={`${p.name}-${slot}`} className="shrink-0">
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" onPointerDown={() => recordPartnerStripClick(g.scopeType, g.scopeId, slot, "portal")} className="block opacity-90 transition hover:opacity-100">
                            {inner}
                          </a>
                        ) : inner}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
