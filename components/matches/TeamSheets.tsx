import Link from "next/link";
import type { Match } from "@/types";
import type { PublicMatchPlayer, PublicMatchStaff } from "@/lib/data/matchPlayers";
import { computeMatchStats, entryLabel, roleTag, type MatchLineupEntry } from "@/lib/competitions/matchStats";

type Colour = { primary: string; secondary: string };

interface TeamSheetsProps {
  match: Match;
  players: Record<string, PublicMatchPlayer>;
  teamColorById: Record<string, Colour>;
  staffByTeam: Record<string, PublicMatchStaff[]>;
}

const FALLBACK: Record<"home" | "away", Colour> = {
  home: { primary: "#0369a1", secondary: "#0284c7" },
  away: { primary: "#be185d", secondary: "#db2777" },
};

export default function TeamSheets({ match, players, teamColorById, staffByTeam }: TeamSheetsProps) {
  const { lineups, hasLineups } = computeMatchStats(match.matchEvents ?? [], match.homeTeamId, match.awayTeamId, players);
  if (!hasLineups) {
    return <p className="mt-4 text-base text-white/70">Team sheets haven&rsquo;t been published for this match yet.</p>;
  }
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Sheet
        team={match.homeTeam}
        icon={match.homeTeamIcon}
        colour={(match.homeTeamId && teamColorById[match.homeTeamId]) || FALLBACK.home}
        entries={lineups.home}
        staff={(match.homeTeamId && staffByTeam[match.homeTeamId]) || []}
      />
      <Sheet
        team={match.awayTeam}
        icon={match.awayTeamIcon}
        colour={(match.awayTeamId && teamColorById[match.awayTeamId]) || FALLBACK.away}
        entries={lineups.away}
        staff={(match.awayTeamId && staffByTeam[match.awayTeamId]) || []}
      />
    </div>
  );
}

function Sheet({
  team,
  icon,
  colour,
  entries,
  staff,
}: {
  team: string;
  icon?: string;
  colour: Colour;
  entries: MatchLineupEntry[];
  staff: PublicMatchStaff[];
}) {
  const started = entries.filter((p) => p.started);
  const subs = entries.filter((p) => !p.started && !p.didNotPlay);
  const dnp = entries.filter((p) => p.didNotPlay);
  const sections: [string, MatchLineupEntry[]][] = [
    ["Starting line-up", started],
    ["Substitutes", subs],
    ["Did not play", dnp],
  ];
  // Older fixtures without start/entry data: one list
  const noEntryData = started.length === 0 && dnp.length === 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/20" aria-label={`${team} team sheet`}>
      <header
        className="flex items-center gap-3 px-4 py-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
        style={{ background: `linear-gradient(100deg, ${colour.primary}, ${colour.secondary} 60%, rgba(15,23,42,0.9))` }}
      >
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-base font-black">{team}</p>
          <p className="text-xs font-semibold text-white/80">
            {noEntryData
              ? `${entries.length} players`
              : `${started.length} started · ${subs.length} sub${subs.length === 1 ? "" : "s"} used${dnp.length ? ` · ${dnp.length} DNP` : ""}`}
          </p>
        </div>
      </header>

      {noEntryData ? (
        <PlayerList entries={entries} colour={colour} />
      ) : (
        sections
          .filter(([, list]) => list.length > 0)
          .map(([title, list]) => (
            <div key={title}>
              <p className="border-t border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white/60">
                {title}
              </p>
              <PlayerList entries={list} colour={colour} />
            </div>
          ))
      )}

      {staff.length > 0 && (
        <p className="border-t border-white/10 px-4 py-3 text-sm text-white/70">
          {staff.map((s) => `${s.role}: ${s.name}`).join(" · ")}
        </p>
      )}
    </section>
  );
}

function PlayerList({ entries, colour }: { entries: MatchLineupEntry[]; colour: Colour }) {
  return (
    <ul className="divide-y divide-white/5">
      {entries.map((p) => {
        const tag = roleTag(p);
        const status = entryLabel(p);
        return (
          <li key={p.memberId} className={`flex items-center gap-3 px-4 py-2 text-base ${p.didNotPlay ? "opacity-60" : ""}`}>
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums text-white ring-1 ring-white/30"
              style={{ background: colour.primary }}
            >
              {p.shirtNumber ?? "–"}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {p.href ? (
                <Link href={p.href} className="font-semibold text-white underline-offset-4 hover:underline focus-visible:underline">
                  {p.name}
                </Link>
              ) : (
                <span className="font-semibold text-white">{p.name}</span>
              )}
              {tag && <span className="ml-1.5 text-xs font-bold text-yellow-200">{tag}</span>}
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
            {status && (
              <span
                className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums ${
                  p.started
                    ? "bg-emerald-400/20 text-emerald-200"
                    : p.didNotPlay
                      ? "bg-white/10 text-white/60"
                      : "bg-sky-400/20 text-sky-200"
                }`}
              >
                {status}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
