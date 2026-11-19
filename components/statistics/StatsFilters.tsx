"use client";
// Statistics filter row — same dark type-ahead look as the Matches page: Year, Division, Club, Player, Show.
import { useRouter } from "next/navigation";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";

type Opt = { id: string; label: string };
export interface StatsFiltersProps {
  years: string[]; year: string;
  divisions: { id: string; season: string; name: string }[]; divisionId: string; // season competition id or "all"
  clubs: Opt[]; clubId: string;
  players: Opt[]; memberId: string;
  category: string;
}
const CATEGORIES = [{ value: "players", label: "Players" }, { value: "teams", label: "Teams" }, { value: "discipline", label: "Discipline" }];

export default function StatsFilters(p: StatsFiltersProps) {
  const router = useRouter();
  const go = (patch: Record<string, string>) => {
    const sp = new URLSearchParams({ year: p.year, ...(p.divisionId !== "all" ? { seasonCompetitionId: p.divisionId } : {}), ...(p.clubId ? { clubId: p.clubId } : {}), ...(p.memberId ? { memberId: p.memberId } : {}), category: p.category, ...patch });
    for (const [k, v] of [...sp.entries()]) if (!v || v === "all") sp.delete(k);
    if (sp.get("category") === "players") sp.delete("category");
    router.push(`/competitions/statistics?${sp.toString()}`);
  };
  const cell = "min-w-0 basis-[calc(50%-0.25rem)] lg:basis-0 lg:flex-1 flex flex-col gap-1";
  const cap = "text-[10px] font-black uppercase tracking-widest text-slate-300";
  const ts = { variant: "dark" as const, compact: true };
  const only = (fn: (v: string) => void) => (v: string) => { if (v) fn(v); };
  const inYear = p.divisions.filter((d) => d.season === p.year);
  const changeYear = (year: string) => {
    const name = inYear.find((d) => d.id === p.divisionId)?.name;
    const same = p.divisions.find((d) => d.season === year && d.name === name);
    go({ year, seasonCompetitionId: same?.id ?? "", memberId: "" });
  };
  return (
    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
      <div className={cell}><span className={cap}>Year</span>
        <TypeaheadSelect {...ts} ariaLabel="Year" options={p.years.map((y) => ({ value: y, label: y }))} value={p.year} onChange={only(changeYear)} /></div>
      <div className={cell}><span className={cap}>Division</span>
        <TypeaheadSelect {...ts} ariaLabel="Division" options={[{ value: "all", label: "All divisions" }, ...inYear.map((d) => ({ value: d.id, label: d.name }))]} value={p.divisionId} onChange={only((v) => go({ seasonCompetitionId: v, clubId: "", memberId: "" }))} /></div>
      <div className={`${cell} lg:flex-[1.6]`}><span className={cap}>Club</span>
        <TypeaheadSelect {...ts} ariaLabel="Club" placeholder="All clubs" options={[{ value: "all", label: "All clubs" }, ...p.clubs.map((c) => ({ value: c.id, label: c.label }))]} value={p.clubId || "all"} onChange={only((v) => go({ clubId: v, memberId: "" }))} /></div>
      <div className={`${cell} lg:flex-[1.6]`}><span className={cap}>Player</span>
        <TypeaheadSelect {...ts} ariaLabel="Player" placeholder="All players" options={[{ value: "all", label: "All players" }, ...p.players.map((x) => ({ value: x.id, label: x.label }))]} value={p.memberId || "all"} onChange={only((v) => go({ memberId: v }))} /></div>
      <div className={cell}><span className={cap}>Show</span>
        <TypeaheadSelect {...ts} ariaLabel="Show" options={CATEGORIES} value={p.category} onChange={only((v) => go({ category: v }))} /></div>
    </div>
  );
}
