import Link from "next/link";
import { cn } from "../../lib/utils";
import type { Team } from "../../types";
import TeamFavouriteStar from "../favourites/TeamFavouriteStar";

/**
 * Shared column layout for the compact ladder (header + rows use the same template,
 * so columns always line up): colour bar | # | team | P | GD | Pts
 */
export const STANDINGS_COMPACT_GRID =
  "grid grid-cols-[4px_1.75rem_minmax(0,1fr)_2.25rem_2.75rem_2.75rem] items-center gap-x-2";

interface StandingsRowProps {
  team: Team;
  /** Finals places — highlights qualifying positions */
  finalsPlaces?: number;
  /** Link to the team's matches */
  href?: string | null;
}

export default function StandingsRow({ team, finalsPlaces = 0, href }: StandingsRowProps) {
  const goalDiff = team.gd ?? team.goalDifference ?? 0;
  const played = team.p ?? team.played ?? 0;
  const inFinals = finalsPlaces > 0 && team.pos != null && team.pos <= finalsPlaces;

  const name = (
    <span className="flex min-w-0 items-center gap-2">
      {team.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.icon} alt="" className="h-6 w-6 shrink-0 rounded-full bg-white object-contain p-0.5" />
      )}
      <span className="truncate text-sm font-semibold text-white">{team.club}</span>
    </span>
  );

  return (
    <div className={cn(STANDINGS_COMPACT_GRID, "rounded-lg bg-white/5 px-2 py-2 transition-colors hover:bg-white/10")}>
      <span
        className="h-6 w-1 rounded-full"
        style={{ background: team.primaryColor || "transparent" }}
        aria-hidden
      />
      <span className={cn("text-sm font-bold tabular-nums", inFinals ? "text-emerald-400" : "text-slate-400")}>
        {team.pos ?? "—"}
      </span>
      <div className="flex min-w-0 items-center gap-1">
        {href ? (
          <Link href={href} className="min-w-0 hover:underline focus-visible:underline" title={`${team.club} matches`}>
            {name}
          </Link>
        ) : (
          name
        )}
        {team.teamId && <TeamFavouriteStar teamId={team.teamId} clubId={team.clubId} name={team.club} />}
      </div>
      <span className="text-center text-sm tabular-nums text-slate-300">{played}</span>
      <span
        className={cn(
          "text-center text-sm font-semibold tabular-nums",
          goalDiff > 0 ? "text-emerald-400" : goalDiff < 0 ? "text-rose-400" : "text-slate-400",
        )}
      >
        {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
      </span>
      <span className="text-right text-base font-black tabular-nums text-sky-300">{team.pts}</span>
    </div>
  );
}
