"use client";
// Year + competition type-ahead row for a league hub: jumps straight to another year or competition.
import { useRouter } from "next/navigation";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";

export interface SwitcherLeague { id: string; season: string; name: string }

export default function LeagueSwitcher({ leagues, currentId }: { leagues: SwitcherLeague[]; currentId: string }) {
  const router = useRouter();
  const cur = leagues.find((l) => l.id === currentId);
  const year = cur?.season ?? "";
  const years = [...new Set(leagues.map((l) => l.season))].sort((a, b) => b.localeCompare(a));
  const inYear = leagues.filter((l) => l.season === year).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const open = (id: string) => router.push(`/competitions/leagues/${encodeURIComponent(id)}`);

  const changeYear = (y: string) => {
    const same = leagues.find((l) => l.season === y && l.name === cur?.name);
    const first = leagues.filter((l) => l.season === y).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))[0];
    const target = same ?? first;
    if (target) open(target.id);
  };

  const field = (label: string, node: React.ReactNode) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{label}</span>
      {node}
    </div>
  );
  return (
    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
      {field("Year", <TypeaheadSelect variant="dark" compact ariaLabel="Year" placeholder="Year"
        options={years.map((y) => ({ value: y, label: y }))} value={year} onChange={changeYear} />)}
      {field("Competition", <TypeaheadSelect variant="dark" compact ariaLabel="Competition" placeholder="Competition"
        options={inYear.map((l) => ({ value: l.id, label: l.name }))} value={currentId} onChange={open} />)}
    </div>
  );
}
