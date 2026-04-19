import type { PublicLeagueRow } from "@/lib/public/publicLeagues";

function leagueIcalHref(
  seasonCompetitionId: string,
  opts: { portalHint?: string | null; attachPortalHint: boolean },
): string {
  const sp = new URLSearchParams({ seasonCompetitionId });
  if (opts.attachPortalHint && opts.portalHint?.trim()) {
    sp.set("portal", opts.portalHint.trim());
  }
  return `/api/calendar/league?${sp.toString()}`;
}

type LeaguePick = Pick<
  PublicLeagueRow,
  "seasonCompetitionId" | "season" | "competitionName"
>;

/**
 * Public hub: subscribe / download published league fixtures as iCal (Epic J2 / O5).
 */
export default function LeagueIcalSubscribePanel({
  leagues,
  portalHint,
  attachPortalHint,
  variant = "dark",
}: {
  leagues: LeaguePick[];
  portalHint?: string | null;
  attachPortalHint: boolean;
  variant?: "dark" | "light";
}) {
  if (!leagues.length) return null;

  const border =
    variant === "dark" ? "border-white/10 bg-white/5" : "border-slate-200 bg-white";
  const title =
    variant === "dark" ? "text-white/50" : "text-slate-500";
  const body =
    variant === "dark" ? "text-white/65" : "text-slate-600";
  const link =
    variant === "dark"
      ? "text-sky-300 hover:text-white underline decoration-sky-400/40"
      : "text-sky-700 hover:text-sky-900 underline decoration-sky-300";

  return (
    <div className={`mt-6 rounded-2xl border px-4 py-4 ${border}`}>
      <h3 className={`text-[10px] font-black uppercase tracking-widest ${title}`}>
        League calendar (iCal)
      </h3>
      <p className={`mt-2 text-xs leading-relaxed ${body}`}>
        Download for this season, or paste the URL into Google Calendar / Outlook as
        &quot;subscribe by URL&quot;. Only published fixtures the portal may show are included.
      </p>
      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        {leagues.map((l) => {
          const label =
            [l.competitionName ?? l.seasonCompetitionId, l.season]
              .filter(Boolean)
              .join(" · ") || l.seasonCompetitionId;
          const href = leagueIcalHref(l.seasonCompetitionId, {
            portalHint,
            attachPortalHint,
          });
          return (
            <li
              key={l.seasonCompetitionId}
              className={`flex flex-col gap-1 rounded-xl border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
                variant === "dark" ? "border-white/10 bg-black/15" : "border-slate-100 bg-slate-50"
              }`}
            >
              <span
                className={`text-sm font-bold ${variant === "dark" ? "text-white" : "text-slate-900"}`}
              >
                {label}
              </span>
              <a
                href={href}
                className={`text-[11px] font-black uppercase tracking-widest ${link}`}
                download
              >
                Download .ics
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
