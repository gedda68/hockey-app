"use client";
// The filter row for the Matches page: year, division, round, club, team and status, all type-ahead, all on one line.
import { useRouter } from "next/navigation";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";

type Opt = { id: string; label: string };
export interface MatchDayFiltersProps {
  years: string[];
  year: string;
  divisions: { id: string; season: string; name: string }[];
  divisionId: string; // a season competition id, or "all"
  rounds: string[];
  round: string; // next | week | all | <n>
  clubs: Opt[];
  clubId: string;
  teams: Opt[];
  teamId: string;
  my: boolean;
  canMy: boolean;
  myClubId: string | null;
  status: string; // all | fixtures | results
}

const STATUS = [{ value: "all", label: "All matches" }, { value: "fixtures", label: "Fixtures" }, { value: "results", label: "Results" }];

export default function MatchDayFilters(p: MatchDayFiltersProps) {
  const router = useRouter();
  const go = (patch: Record<string, string>) => {
    const sp = new URLSearchParams({ seasonCompetitionId: p.divisionId, round: p.round, status: p.status, ...(p.clubId ? { clubId: p.clubId } : {}), ...(p.teamId ? { teamId: p.teamId } : {}), ...(p.my ? { my: "1" } : {}), ...patch });
    for (const k of [...sp.keys()]) if (!sp.get(k)) sp.delete(k);
    if (sp.get("seasonCompetitionId") !== "all") sp.delete("year");
    if (sp.get("round") === "next") sp.delete("round");
    if (sp.get("status") === "all") sp.delete("status");
    router.push(`/competitions/matches?${sp.toString()}`);
  };
  const cell = "min-w-0 basis-[calc(50%-0.25rem)] lg:basis-0 lg:flex-1 flex flex-col gap-1";
  const cap = "text-[10px] font-black uppercase tracking-widest text-slate-300";
  const inYear = p.divisions.filter((d) => d.season === p.year);
  const reset = { round: "next", clubId: "", teamId: "", my: "" };

  const changeYear = (year: string) => {
    if (p.divisionId === "all") return go({ ...reset, year, seasonCompetitionId: "all" });
    const name = inYear.find((x) => x.id === p.divisionId)?.name;
    const same = p.divisions.find((d) => d.season === year && d.name === name) ?? p.divisions.find((d) => d.season === year);
    go({ ...reset, seasonCompetitionId: same?.id ?? "" });
  };
  const roundOptions = [{ value: "next", label: "Next round" }, { value: "week", label: "This week" }, { value: "all", label: "All rounds" }, ...p.rounds.map((r) => ({ value: r, label: `Round ${r}` }))];
  const clubOptions = [{ value: "all", label: "All clubs" }, ...(p.canMy ? [{ value: "__my", label: "My teams" }] : []), ...p.clubs.map((c) => ({ value: c.id, label: `${c.label}${c.id === p.myClubId ? " (my club)" : ""}` }))];
  const only = (fn: (v: string) => void) => (v: string) => { if (v) fn(v); };
  const ts = { variant: "dark" as const, compact: true };

  return (
    <div className="flex flex-wrap gap-2 lg:flex-nowrap">
      <div className={cell}><span className={cap}>Year</span>
        <TypeaheadSelect {...ts} ariaLabel="Year" options={p.years.map((y) => ({ value: y, label: y }))} value={p.year} onChange={only(changeYear)} />
      </div>
      <div className={cell}><span className={cap}>Division</span>
        <TypeaheadSelect {...ts} ariaLabel="Division" options={[{ value: "all", label: "All divisions" }, ...inYear.map((d) => ({ value: d.id, label: d.name }))]} value={p.divisionId} onChange={only((v) => go({ ...reset, seasonCompetitionId: v, year: p.year }))} />
      </div>
      <div className={cell}><span className={cap}>Round</span>
        <TypeaheadSelect {...ts} ariaLabel="Round" options={roundOptions} value={p.round} onChange={only((v) => go({ round: v }))} />
      </div>
      <div className={`${cell} lg:flex-[1.6]`}><span className={cap}>Club</span>
        <TypeaheadSelect {...ts} ariaLabel="Club" options={clubOptions} value={p.my ? "__my" : p.clubId || "all"} onChange={(v) => (v === "__my" ? go({ my: "1", clubId: "", teamId: "" }) : go({ clubId: v === "all" ? "" : v, teamId: "", my: "" }))} placeholder="All clubs" />
      </div>
      {p.clubId && p.teams.length > 1 ? (
        <div className={cell}><span className={cap}>Team</span>
          <TypeaheadSelect {...ts} ariaLabel="Team" options={[{ value: "all", label: "All teams" }, ...p.teams.map((t) => ({ value: t.id, label: t.label }))]} value={p.teamId || "all"} onChange={(v) => go({ teamId: v === "all" ? "" : v })} placeholder="All teams" />
        </div>
      ) : null}
      <div className={cell}><span className={cap}>Show</span>
        <TypeaheadSelect {...ts} ariaLabel="Show" options={STATUS} value={p.status} onChange={only((v) => go({ status: v }))} />
      </div>
    </div>
  );
}
