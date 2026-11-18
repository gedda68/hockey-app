"use client";
// The Match Day filter row: year, division, round, club and team. Changing one resets the ones after it.
import { useRouter } from "next/navigation";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";

type Opt = { id: string; label: string };
export interface MatchDayFiltersProps {
  years: string[];
  year: string;
  divisions: { id: string; season: string; name: string }[];
  divisionId: string;
  rounds: string[];
  round: string; // next | week | all | <n>
  clubs: Opt[];
  clubId: string;
  teams: Opt[];
  teamId: string;
  my: boolean;
  canMy: boolean;
  myClubId: string | null;
}

export default function MatchDayFilters(p: MatchDayFiltersProps) {
  const router = useRouter();
  const go = (patch: Record<string, string>) => {
    const sp = new URLSearchParams({ seasonCompetitionId: p.divisionId, round: p.round, ...(p.clubId ? { clubId: p.clubId } : {}), ...(p.teamId ? { teamId: p.teamId } : {}), ...(p.my ? { my: "1" } : {}), ...patch });
    for (const k of [...sp.keys()]) if (!sp.get(k)) sp.delete(k);
    if (sp.get("round") === "next") sp.delete("round");
    router.push(`/competitions/this-round?${sp.toString()}`);
  };
  const cell = "flex min-w-0 flex-col gap-1";
  const cap = "text-[10px] font-black uppercase tracking-widest text-slate-400";
  const inYear = p.divisions.filter((d) => d.season === p.year);

  const changeYear = (year: string) => {
    const same = p.divisions.find((d) => d.season === year && d.name === inYear.find((x) => x.id === p.divisionId)?.name) ?? p.divisions.find((d) => d.season === year);
    go({ seasonCompetitionId: same?.id ?? "", round: "next", clubId: "", teamId: "", my: "" });
  };

  // Every filter is the same type-ahead box: type to narrow the list, arrows and Enter to pick.
  const roundOptions = [{ value: "next", label: "Next round" }, { value: "week", label: "This week" }, { value: "all", label: "All rounds" }, ...p.rounds.map((r) => ({ value: r, label: `Round ${r}` }))];
  const clubOptions = [{ value: "all", label: "All clubs" }, ...(p.canMy ? [{ value: "__my", label: "My teams" }] : []), ...p.clubs.map((c) => ({ value: c.id, label: `${c.label}${c.id === p.myClubId ? " (my club)" : ""}` }))];
  // Clearing the text while typing must not change a required filter.
  const only = (fn: (v: string) => void) => (v: string) => { if (v) fn(v); };

  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/95 p-4 shadow-lg md:grid-cols-3 xl:grid-cols-5">
      <div className={cell}><span className={cap}>Year</span>
        <TypeaheadSelect ariaLabel="Year" options={p.years.map((y) => ({ value: y, label: y }))} value={p.year} onChange={only(changeYear)} />
      </div>
      <div className={cell}><span className={cap}>Division</span>
        <TypeaheadSelect ariaLabel="Division" options={inYear.map((d) => ({ value: d.id, label: d.name }))} value={p.divisionId} onChange={only((v) => go({ seasonCompetitionId: v, round: "next", clubId: "", teamId: "", my: "" }))} />
      </div>
      <div className={cell}><span className={cap}>Round</span>
        <TypeaheadSelect ariaLabel="Round" options={roundOptions} value={p.round} onChange={only((v) => go({ round: v }))} />
      </div>
      <div className={cell}><span className={cap}>Club</span>
        <TypeaheadSelect ariaLabel="Club" options={clubOptions} value={p.my ? "__my" : p.clubId || "all"} onChange={(v) => (v === "__my" ? go({ my: "1", clubId: "", teamId: "" }) : go({ clubId: v === "all" ? "" : v, teamId: "", my: "" }))} placeholder="All clubs" />
      </div>
      {p.clubId && p.teams.length > 1 ? (
        <div className={cell}><span className={cap}>Team</span>
          <TypeaheadSelect ariaLabel="Team" options={[{ value: "all", label: "All teams" }, ...p.teams.map((t) => ({ value: t.id, label: t.label }))]} value={p.teamId || "all"} onChange={(v) => go({ teamId: v === "all" ? "" : v })} placeholder="All teams" />
        </div>
      ) : null}
    </div>
  );
}
