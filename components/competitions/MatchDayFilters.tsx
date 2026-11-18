"use client";
// The Match Day filter row: year, division, round, club and team. Changing one resets the ones after it.
import { useRouter } from "next/navigation";

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
  const sel = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:border-[#06054e] focus:outline-none";
  const lab = "flex min-w-0 flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400";
  const inYear = p.divisions.filter((d) => d.season === p.year);

  const changeYear = (year: string) => {
    const same = p.divisions.find((d) => d.season === year && d.name === inYear.find((x) => x.id === p.divisionId)?.name) ?? p.divisions.find((d) => d.season === year);
    go({ seasonCompetitionId: same?.id ?? "", round: "next", clubId: "", teamId: "", my: "" });
  };

  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-white/95 p-4 shadow-lg md:grid-cols-3 xl:grid-cols-5">
      <label className={lab}>Year
        <select className={sel} value={p.year} onChange={(e) => changeYear(e.target.value)}>{p.years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
      </label>
      <label className={lab}>Division
        <select className={sel} value={p.divisionId} onChange={(e) => go({ seasonCompetitionId: e.target.value, round: "next", clubId: "", teamId: "", my: "" })}>{inYear.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      </label>
      <label className={lab}>Round
        <select className={sel} value={p.round} onChange={(e) => go({ round: e.target.value })}>
          <option value="next">Next round</option><option value="week">This week</option><option value="all">All rounds</option>
          {p.rounds.map((r) => <option key={r} value={r}>Round {r}</option>)}
        </select>
      </label>
      <label className={lab}>Club
        <select className={sel} value={p.my ? "__my" : p.clubId} onChange={(e) => (e.target.value === "__my" ? go({ my: "1", clubId: "", teamId: "" }) : go({ clubId: e.target.value, teamId: "", my: "" }))}>
          <option value="">All clubs</option>
          {p.canMy && <option value="__my">My teams</option>}
          {p.clubs.map((c) => <option key={c.id} value={c.id}>{c.label}{c.id === p.myClubId ? " (my club)" : ""}</option>)}
        </select>
      </label>
      {p.clubId && p.teams.length > 1 ? (
        <label className={lab}>Team
          <select className={sel} value={p.teamId} onChange={(e) => go({ teamId: e.target.value })}>
            <option value="">All teams</option>{p.teams.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
      ) : null}
    </div>
  );
}
