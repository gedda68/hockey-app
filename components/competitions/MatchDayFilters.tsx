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
  /** The round on show, when it is a single round (for the previous / next buttons). */
  currentRound: string | null;
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
  const cap = "text-[10px] font-black uppercase tracking-widest text-slate-300";
  const idx = p.currentRound ? p.rounds.indexOf(p.currentRound) : -1;
  const step = "h-[46px] w-11 shrink-0 rounded-xl border border-white/15 bg-white/10 text-lg font-black text-white transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/10";
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
    <div className="flex flex-wrap items-end gap-4">
      <div className={`${cell} w-full sm:w-auto sm:min-w-[11rem]`}><span className={cap}>Year</span>
        <TypeaheadSelect variant="dark" ariaLabel="Year" options={p.years.map((y) => ({ value: y, label: y }))} value={p.year} onChange={only(changeYear)} />
      </div>
      <div className={`${cell} w-full sm:w-auto sm:min-w-[11rem]`}><span className={cap}>Division</span>
        <TypeaheadSelect variant="dark" ariaLabel="Division" options={inYear.map((d) => ({ value: d.id, label: d.name }))} value={p.divisionId} onChange={only((v) => go({ seasonCompetitionId: v, round: "next", clubId: "", teamId: "", my: "" }))} />
      </div>
      <div className={cell}><span className={cap}>Round</span>
        <div className="flex items-center gap-2">
          <div className="min-w-[11rem] flex-1"><TypeaheadSelect variant="dark" ariaLabel="Round" options={roundOptions} value={p.round} onChange={only((v) => go({ round: v }))} /></div>
          <button type="button" aria-label="Previous round" className={step} disabled={idx <= 0} onClick={() => go({ round: p.rounds[idx - 1] })}>‹</button>
          <button type="button" aria-label="Next round" className={step} disabled={idx < 0 || idx >= p.rounds.length - 1} onClick={() => go({ round: p.rounds[idx + 1] })}>›</button>
        </div>
      </div>
      <div className={`${cell} w-full sm:w-auto sm:min-w-[11rem]`}><span className={cap}>Club</span>
        <TypeaheadSelect variant="dark" ariaLabel="Club" options={clubOptions} value={p.my ? "__my" : p.clubId || "all"} onChange={(v) => (v === "__my" ? go({ my: "1", clubId: "", teamId: "" }) : go({ clubId: v === "all" ? "" : v, teamId: "", my: "" }))} placeholder="All clubs" />
      </div>
      {p.clubId && p.teams.length > 1 ? (
        <div className={`${cell} w-full sm:w-auto sm:min-w-[11rem]`}><span className={cap}>Team</span>
          <TypeaheadSelect variant="dark" ariaLabel="Team" options={[{ value: "all", label: "All teams" }, ...p.teams.map((t) => ({ value: t.id, label: t.label }))]} value={p.teamId || "all"} onChange={(v) => go({ teamId: v === "all" ? "" : v })} placeholder="All teams" />
        </div>
      ) : null}
    </div>
  );
}
