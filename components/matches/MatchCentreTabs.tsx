"use client";

import { useMemo, useState } from "react";
import type { Match, FixtureMatchEventPublic, FixtureUmpireSlot } from "@/types";

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
}: {
  match: Match;
  teamNameById: Record<string, string>;
  venue: { name: string | null; addressLine: string | null };
  umpires: FixtureUmpireSlot[] | null;
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
            <ul className="mt-4 space-y-2">
              {events.map((e, i) => (
                <li
                  key={`${e.eventId ?? "evt"}-${e.kind ?? ""}-${i}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-bold">
                      {teamNameById[String(e.teamId ?? "")] ??
                        String(e.teamId ?? "Team")}
                    </div>
                    <div className="text-xs text-white/60">
                      {typeof e.minute === "number" ? `${e.minute}'` : ""}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-white/80">
                    {String(e.kind ?? "Event")}
                  </div>
                </li>
              ))}
            </ul>
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

