"use client";

import Link from "next/link";
import { useLocalFavourites } from "@/lib/favourites/useLocalFavourites";
import FavouriteStar from "./FavouriteStar";

/**
 * "My favourites" strip for the competitions landing page.
 * Reads the visitor's localStorage favourites after hydration and renders
 * nothing at all when there are none, so first-time visitors see no change.
 */
export default function FavouritesPanel() {
  const { favourites, toggleFavouriteTeam, toggleFavouriteLeague } =
    useLocalFavourites();

  if (favourites.teams.length === 0 && favourites.leagues.length === 0) {
    return null;
  }

  const chip =
    "inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 pl-3 pr-1 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-200";

  return (
    <section
      aria-label="My favourites"
      className="w-full mb-8 rounded-3xl border border-white/10 bg-[#06054e]/60 p-5 shadow-xl"
    >
      <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
        My favourites
      </h2>

      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {favourites.leagues.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Leagues
            </span>
            <div className="flex flex-wrap gap-2">
              {favourites.leagues.map((l) => (
                <span key={l.seasonCompetitionId} className={chip}>
                  <Link
                    href={`/competitions/standings?seasonCompetitionId=${encodeURIComponent(l.seasonCompetitionId)}`}
                    className="hover:underline"
                  >
                    {l.name}
                  </Link>
                  <FavouriteStar
                    active
                    label={l.name}
                    onToggle={() => toggleFavouriteLeague(l)}
                  />
                </span>
              ))}
            </div>
          </div>
        )}

        {favourites.teams.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Teams
            </span>
            <div className="flex flex-wrap gap-2">
              {favourites.teams.map((t) => (
                <span key={t.teamId} className={chip}>
                  {t.clubId ? (
                    <Link
                      href={`/clubs/${encodeURIComponent(t.clubId)}/teams/${encodeURIComponent(t.teamId)}`}
                      className="hover:underline"
                    >
                      {t.name}
                    </Link>
                  ) : (
                    <span>{t.name}</span>
                  )}
                  <FavouriteStar
                    active
                    label={t.name}
                    onToggle={() => toggleFavouriteTeam(t)}
                  />
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
