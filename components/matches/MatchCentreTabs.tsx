"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Match, FixtureMatchEventPublic, FixtureUmpireSlot } from "@/types";
import type { PublicMatchPlayer } from "@/lib/data/matchPlayers";

type TabKey = "summary" | "timeline" | "umpires" | "stats";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-colors ${
        active
          ? "bg-yellow-400/20 text-yellow-100 border border-yellow-400/30"
          : "bg-white/5 text-white/70 hover:text-white border border-white/10 hover:border-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export default function MatchCentreTabs({
  match,
  teamNameById,
  venue,
  umpires,
  players = {},
  teamColorById = {},
}: {
  match: Match;
  teamNameById: Record<string, string>;
  venue: { name: string | null; addressLine: string | null };
  umpires: FixtureUmpireSlot[] | null;
  players?: Record<string, PublicMatchPlayer>;
  teamColorById?: Record<string, { primary: string; secondary: string }>;
}) {
  const [tab, setTab] = useState<TabKey>("summary");

  const events = useMemo(() => {
    const raw = (match.matchEvents ?? []) as FixtureMatchEventPublic[];
    return [...raw].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
  }, [match.matchEvents]);

  const mapHref = useMemo(() => {
    const parts = [venue.name, venue.addressLine].filter(Boolean).join(" ");
    if (!parts) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
  }, [venue.addressLine, venue.name]);

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>
          Summary
        </TabButton>
        <TabButton
          active={tab === "timeline"}
          onClick={() => setTab("timeline")}
        >
          Timeline
        </TabButton>
        <TabButton
          active={tab === "umpires"}
          onClick={() => setTab("umpires")}
        >
          Umpires
        </TabButton>
        <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
          Stats
        </TabButton>
      </div>

      {tab === "summary" ? (
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
              Venue
            </p>
            <p className="mt-2 font-bold">{venue.name ?? match.location ?? "—"}</p>
            {venue.addressLine ? (
              <p className="mt-1 text-sm text-white/70">{venue.addressLine}</p>
            ) : null}
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-[11px] font-black uppercase tracking-widest text-sky-200 hover:text-white"
              >
                Open map ↗
              </a>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
              Competition
            </p>
            <p className="mt-2 font-bold">{match.division}</p>
            <p className="mt-1 text-sm text-white/70">Round {String(match.round)}</p>
          </div>
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className="mt-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
            Timeline
          </h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">No match events available yet.</p>
          ) : (
            <ol className="mt-4 space-y-2">
              {events.map((e, i) => (
                <TimelineEvent
                  key={`${e.eventId ?? "evt"}-${e.kind ?? ""}-${i}`}
                  event={e}
                  player={players[e.memberId]}
                  teamName={teamNameById[String(e.teamId ?? "")] ?? String(e.teamId ?? "Team")}
                  teamColor={teamColorById[String(e.teamId ?? "")]}
                  isHome={e.teamId === match.homeTeamId}
                />
              ))}
            </ol>
          )}
        </section>
      ) : null}

      {tab === "umpires" ? (
        <section className="mt-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
            Umpires
          </h2>
          {umpires && umpires.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {umpires.map((u, i) => (
                <li
                  key={`${u.umpireType}-${u.umpireId}-${i}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-bold">{u.umpireId}</div>
                    <div className="text-xs text-white/60">
                      {u.qualificationTier ?? ""}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    {u.umpireType}
                    {u.allocationStatus ? ` · ${u.allocationStatus}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/60">No umpires listed yet.</p>
          )}
        </section>
      ) : null}

      {tab === "stats" ? (
        <section className="mt-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-200">
            Stats
          </h2>
          <p className="mt-3 text-sm text-white/60">
            Coming next: team stats, scorers, cards, and player summaries.
          </p>
        </section>
      ) : null}
    </div>
  );
}



// ── Timeline row ──────────────────────────────────────────────────────────────

const EVENT_LABEL: Record<string, string> = {
  goal: "Goal",
  penalty_stroke_goal: "Penalty stroke goal",
  penalty_stroke_miss: "Penalty stroke missed",
  shootout_goal: "Shootout goal",
  shootout_miss: "Shootout miss",
  green_card: "Green card",
  yellow_card: "Yellow card",
  red_card: "Red card",
  gk_save: "Goalkeeper save",
};

function eventDetail(e: FixtureMatchEventPublic): string | null {
  const notes = (e.notes ?? "").trim();
  if (!notes) return null;
  if (e.kind === "goal") {
    if (/penalty corner/i.test(notes)) return "Penalty corner";
    if (/field goal/i.test(notes)) return "Field goal";
    return null;
  }
  if (e.kind.endsWith("_card")) {
    const mins = notes.match(/\((\d+)'\)/);
    return mins ? `${mins[1]} min suspension` : null;
  }
  return null;
}

function EventIcon({ kind }: { kind: string }) {
  if (kind.endsWith("_card")) {
    const colour = kind === "red_card" ? "bg-red-500" : kind === "yellow_card" ? "bg-yellow-400" : "bg-emerald-500";
    return <span className={`inline-block h-4 w-3 rounded-[3px] ${colour} shadow`} aria-hidden />;
  }
  if (kind.includes("goal")) {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-slate-900" aria-hidden>
        ●
      </span>
    );
  }
  return <span className="inline-block h-2 w-2 rounded-full bg-white/60" aria-hidden />;
}

function PlayerAvatar({ player, colour }: { player?: PublicMatchPlayer; colour?: { primary: string; secondary: string } }) {
  const initials = (player?.name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="relative shrink-0">
      {player?.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={player.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white/20" />
      ) : (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-black text-white ring-2 ring-white/20"
          style={{ background: colour ? `linear-gradient(135deg, ${colour.primary}, ${colour.secondary})` : "#334155" }}
          aria-hidden
        >
          {initials}
        </span>
      )}
      {player?.shirtNumber != null && (
        <span className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-yellow-300 px-1 text-[11px] font-black tabular-nums text-slate-900 ring-2 ring-slate-900">
          {player.shirtNumber}
        </span>
      )}
    </span>
  );
}

export function TimelineEvent({
  event: e,
  player,
  teamName,
  teamColor,
  isHome,
}: {
  event: FixtureMatchEventPublic;
  player?: PublicMatchPlayer;
  teamName: string;
  teamColor?: { primary: string; secondary: string };
  isHome: boolean;
}) {
  const label = EVENT_LABEL[e.kind] ?? String(e.kind).replace(/_/g, " ");
  const detail = eventDetail(e);
  const isGoal = e.kind.includes("goal") && !e.kind.includes("miss");
  return (
    <li
      className={`flex items-center gap-4 rounded-2xl border px-4 py-3 text-white ${
        isGoal ? "border-yellow-300/30 bg-yellow-300/10" : "border-white/10 bg-white/5"
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: teamColor?.primary ?? (isHome ? "#38bdf8" : "#f472b6") }}
    >
      <span className="w-12 shrink-0 text-center text-lg font-black tabular-nums text-white/90">
        {typeof e.minute === "number" ? `${e.minute}'` : "–"}
      </span>

      <PlayerAvatar player={player} colour={teamColor} />

      <div className="min-w-0 flex-1">
        {player ? (
          <Link
            href={player.href}
            className="block truncate text-base font-bold text-white underline-offset-4 hover:underline focus-visible:underline"
          >
            {player.name}
            {player.isCaptain ? <span className="ml-1 text-xs font-semibold text-white/60">(C)</span> : null}
            {player.isGoalkeeper ? <span className="ml-1 text-xs font-semibold text-white/60">(GK)</span> : null}
          </Link>
        ) : (
          <span className="block truncate text-base font-bold text-white/80">Unknown player</span>
        )}
        <span className="block truncate text-sm text-white/60">{teamName}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-right">
        <EventIcon kind={e.kind} />
        <div>
          <p className={`text-sm font-bold ${isGoal ? "text-yellow-200" : "text-white"}`}>{label}</p>
          {detail ? <p className="text-xs text-white/60">{detail}</p> : null}
        </div>
      </div>
    </li>
  );
}
