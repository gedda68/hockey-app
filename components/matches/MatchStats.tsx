import Link from "next/link";
import type { Match } from "@/types";
import type { PublicMatchPlayer, PublicMatchStaff } from "@/lib/data/matchPlayers";
import { computeMatchStats, type MatchLineupEntry, type MatchScorer } from "@/lib/competitions/matchStats";

type Colour = { primary: string; secondary: string };

interface MatchStatsProps {
  match: Match;
  players: Record<string, PublicMatchPlayer>;
  teamColorById: Record<string, Colour>;
  staffByTeam: Record<string, PublicMatchStaff[]>;
}

const FALLBACK: Record<"home" | "away", Colour> = {
  home: { primary: "#38bdf8", secondary: "#0284c7" },
  away: { primary: "#f472b6", secondary: "#db2777" },
};

export default function MatchStats({ match, players, teamColorById, staffByTeam }: MatchStatsProps) {
  const stats = computeMatchStats(match.matchEvents ?? [], match.homeTeamId, match.awayTeamId, players);
  const homeColour = (match.homeTeamId && teamColorById[match.homeTeamId]) || FALLBACK.home;
  const awayColour = (match.awayTeamId && teamColorById[match.awayTeamId]) || FALLBACK.away;
  const hasShootout = match.homeShootOutScore != null && match.awayShootOutScore != null;

  if (!stats.hasEvents && !stats.hasLineups) {
    return <p className="mt-4 text-base text-white/70">Stats will appear once the result and team sheets are published.</p>;
  }

  return (
    <div className="mt-4 space-y-8">
      {/* Team comparison */}
      <section aria-labelledby="stats-compare">
        <h3 id="stats-compare" className="sr-only">Team comparison</h3>
        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-bold text-white">
          <TeamLabel name={match.homeTeam} icon={match.homeTeamIcon} colour={homeColour} />
          <span className="text-xs uppercase tracking-widest text-white/50">vs</span>
          <TeamLabel name={match.awayTeam} icon={match.awayTeamIcon} colour={awayColour} align="right" />
        </div>
        <ul className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          {stats.rows.map((r) => (
            <CompareRow key={r.key} label={r.label} home={r.home} away={r.away} homeColour={homeColour} awayColour={awayColour} />
          ))}
          {hasShootout && (
            <CompareRow
              label="Shootout"
              home={match.homeShootOutScore!}
              away={match.awayShootOutScore!}
              homeColour={homeColour}
              awayColour={awayColour}
            />
          )}
        </ul>
      </section>

      {/* Goal scorers */}
      {(stats.scorers.home.length > 0 || stats.scorers.away.length > 0) && (
        <section aria-labelledby="stats-scorers">
          <SectionTitle id="stats-scorers">Goal scorers</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <ScorerList scorers={stats.scorers.home} team={match.homeTeam} colour={homeColour} />
            <ScorerList scorers={stats.scorers.away} team={match.awayTeam} colour={awayColour} />
          </div>
        </section>
      )}

      {/* Team sheets */}
      {stats.hasLineups && (
        <section aria-labelledby="stats-lineups">
          <SectionTitle id="stats-lineups">Team sheets</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <Lineup
              team={match.homeTeam}
              colour={homeColour}
              entries={stats.lineups.home}
              staff={(match.homeTeamId && staffByTeam[match.homeTeamId]) || []}
            />
            <Lineup
              team={match.awayTeam}
              colour={awayColour}
              entries={stats.lineups.away}
              staff={(match.awayTeamId && staffByTeam[match.awayTeamId]) || []}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
      {children}
    </h3>
  );
}

function TeamLabel({ name, icon, colour, align = "left" }: { name: string; icon?: string; colour: Colour; align?: "left" | "right" }) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt="" className="h-8 w-8 shrink-0 rounded-full bg-white object-contain p-0.5" />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: colour.primary }} aria-hidden />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

function CompareRow({
  label,
  home,
  away,
  homeColour,
  awayColour,
}: {
  label: string;
  home: number;
  away: number;
  homeColour: Colour;
  awayColour: Colour;
}) {
  const total = home + away;
  const homePct = total ? (home / total) * 100 : 50;
  return (
    <li>
      <div className="flex items-baseline justify-between text-white">
        <span className={`w-10 text-left text-xl font-black tabular-nums ${home > away ? "text-white" : "text-white/70"}`}>{home}</span>
        <span className="text-sm font-semibold text-white/80">{label}</span>
        <span className={`w-10 text-right text-xl font-black tabular-nums ${away > home ? "text-white" : "text-white/70"}`}>{away}</span>
      </div>
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        {total > 0 && (
          <>
            <span
              className="h-full"
              style={{ width: `${homePct}%`, background: `linear-gradient(90deg, ${homeColour.secondary}, ${homeColour.primary})` }}
            />
            <span
              className="h-full border-l-2 border-slate-900"
              style={{ width: `${100 - homePct}%`, background: `linear-gradient(90deg, ${awayColour.primary}, ${awayColour.secondary})` }}
            />
          </>
        )}
      </div>
    </li>
  );
}

function PlayerName({ p }: { p: { name: string; href: string | null; isCaptain: boolean; isGoalkeeper: boolean } }) {
  const extras = (
    <>
      {p.isCaptain && <span className="ml-1 text-xs font-semibold text-white/60">(C)</span>}
      {p.isGoalkeeper && <span className="ml-1 text-xs font-semibold text-white/60">(GK)</span>}
    </>
  );
  return p.href ? (
    <Link href={p.href} className="truncate font-semibold text-white underline-offset-4 hover:underline focus-visible:underline">
      {p.name}
      {extras}
    </Link>
  ) : (
    <span className="truncate font-semibold text-white">
      {p.name}
      {extras}
    </span>
  );
}

function ShirtBadge({ n, colour }: { n: number | null; colour: Colour }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums text-white ring-1 ring-white/30"
      style={{ background: colour.primary }}
    >
      {n ?? "–"}
    </span>
  );
}

function ScorerList({ scorers, team, colour }: { scorers: MatchScorer[]; team: string; colour: Colour }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4" style={{ borderTopColor: colour.primary, borderTopWidth: 4 }}>
      <p className="mb-2 truncate text-sm font-bold text-white/80">{team}</p>
      {scorers.length === 0 ? (
        <p className="text-sm text-white/50">No goals</p>
      ) : (
        <ul className="space-y-2">
          {scorers.map((s) => (
            <li key={s.memberId} className="flex items-center gap-3 text-base">
              <ShirtBadge n={s.shirtNumber} colour={colour} />
              <span className="min-w-0 flex-1">
                <PlayerName p={s} />
              </span>
              <span className="shrink-0 text-right text-sm text-white/80">
                {s.goals
                  .map((g) => `${g.minute != null ? `${g.minute}'` : "–"}${g.type === "Field goal" ? "" : ` (${g.type === "Penalty corner" ? "PC" : "PS"})`}`)
                  .join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Lineup({
  team,
  colour,
  entries,
  staff,
}: {
  team: string;
  colour: Colour;
  entries: MatchLineupEntry[];
  staff: PublicMatchStaff[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <p
        className="px-4 py-3 text-sm font-black text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
        style={{ background: `linear-gradient(100deg, ${colour.primary}, ${colour.secondary} 60%, rgba(15,23,42,0.9))` }}
      >
        {team} <span className="font-semibold text-white/80">· {entries.length} players</span>
      </p>
      <ul className="divide-y divide-white/5">
        {entries.map((p) => (
          <li key={p.memberId} className="flex items-center gap-3 px-4 py-2 text-base">
            <ShirtBadge n={p.shirtNumber} colour={colour} />
            <span className="min-w-0 flex-1">
              <PlayerName p={p} />
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {Array.from({ length: p.goals }).map((_, i) => (
                <span key={`g${i}`} className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[8px] text-slate-900" title="Goal">
                  ●
                </span>
              ))}
              {p.cards.map((c, i) => (
                <span
                  key={`c${i}`}
                  className={`inline-block h-4 w-3 rounded-[3px] ${c === "red" ? "bg-red-500" : c === "yellow" ? "bg-yellow-400" : "bg-emerald-500"}`}
                  title={`${c} card`}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
      {staff.length > 0 && (
        <p className="border-t border-white/10 px-4 py-3 text-sm text-white/70">
          {staff.map((s) => `${s.role}: ${s.name}`).join(" · ")}
        </p>
      )}
    </div>
  );
}
