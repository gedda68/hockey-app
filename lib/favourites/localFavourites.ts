// lib/favourites/localFavourites.ts
// Anonymous (no login) favourites kept in the visitor's browser localStorage.
// Pure helpers only — no React, no direct DOM access except the guarded
// read/write functions — so the logic is unit-testable in a node environment.
//
// Signed-in members can still follow teams / favourite clubs server-side via
// /api/member/fan-preferences; this is the lightweight device-local layer.

export const FAVOURITES_STORAGE_KEY = "hockey-app:favourites:v1";
export const FAVOURITES_CHANGED_EVENT = "hockey-app:favourites-changed";

export const MAX_FAVOURITE_TEAMS = 20;
export const MAX_FAVOURITE_LEAGUES = 10;

export type FavouriteTeam = {
  teamId: string;
  /** Needed to build /clubs/[clubId]/teams/[teamId]; optional if unknown. */
  clubId?: string;
  name: string;
};

export type FavouriteLeague = {
  seasonCompetitionId: string;
  name: string;
};

export type LocalFavourites = {
  teams: FavouriteTeam[];
  leagues: FavouriteLeague[];
};

export const EMPTY_FAVOURITES: LocalFavourites = Object.freeze({
  teams: [] as FavouriteTeam[],
  leagues: [] as FavouriteLeague[],
}) as LocalFavourites;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Parse whatever is in storage, dropping anything malformed. Never throws. */
export function parseFavourites(raw: string | null | undefined): LocalFavourites {
  if (!raw) return EMPTY_FAVOURITES;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return EMPTY_FAVOURITES;
    const obj = data as Record<string, unknown>;

    const teams: FavouriteTeam[] = [];
    if (Array.isArray(obj.teams)) {
      for (const t of obj.teams) {
        if (!t || typeof t !== "object") continue;
        const r = t as Record<string, unknown>;
        if (!isNonEmptyString(r.teamId) || !isNonEmptyString(r.name)) continue;
        teams.push({
          teamId: r.teamId,
          name: r.name,
          ...(isNonEmptyString(r.clubId) ? { clubId: r.clubId } : {}),
        });
      }
    }

    const leagues: FavouriteLeague[] = [];
    if (Array.isArray(obj.leagues)) {
      for (const l of obj.leagues) {
        if (!l || typeof l !== "object") continue;
        const r = l as Record<string, unknown>;
        if (!isNonEmptyString(r.seasonCompetitionId) || !isNonEmptyString(r.name)) {
          continue;
        }
        leagues.push({ seasonCompetitionId: r.seasonCompetitionId, name: r.name });
      }
    }

    if (teams.length === 0 && leagues.length === 0) return EMPTY_FAVOURITES;
    return {
      teams: teams.slice(0, MAX_FAVOURITE_TEAMS),
      leagues: leagues.slice(0, MAX_FAVOURITE_LEAGUES),
    };
  } catch {
    return EMPTY_FAVOURITES;
  }
}

/**
 * Add `item` if its id is not present, remove it if it is.
 * New items go to the front; the list is capped at `max` (oldest dropped).
 */
export function toggleById<T>(
  list: readonly T[],
  item: T,
  idOf: (x: T) => string,
  max: number,
): T[] {
  const id = idOf(item);
  if (list.some((x) => idOf(x) === id)) {
    return list.filter((x) => idOf(x) !== id);
  }
  return [item, ...list].slice(0, max);
}

export function toggleTeam(
  favs: LocalFavourites,
  team: FavouriteTeam,
): LocalFavourites {
  return {
    ...favs,
    teams: toggleById(favs.teams, team, (t) => t.teamId, MAX_FAVOURITE_TEAMS),
  };
}

export function toggleLeague(
  favs: LocalFavourites,
  league: FavouriteLeague,
): LocalFavourites {
  return {
    ...favs,
    leagues: toggleById(
      favs.leagues,
      league,
      (l) => l.seasonCompetitionId,
      MAX_FAVOURITE_LEAGUES,
    ),
  };
}

export function isFavouriteTeam(favs: LocalFavourites, teamId: string): boolean {
  return favs.teams.some((t) => t.teamId === teamId);
}

export function isFavouriteLeague(
  favs: LocalFavourites,
  seasonCompetitionId: string,
): boolean {
  return favs.leagues.some((l) => l.seasonCompetitionId === seasonCompetitionId);
}

/** Raw storage read — returns null when storage is unavailable or blocked. */
export function readRawFavourites(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(FAVOURITES_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist and notify same-tab listeners (the `storage` event only fires cross-tab). */
export function writeFavourites(next: LocalFavourites): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked (private mode) — favourites just won't persist.
    return;
  }
  window.dispatchEvent(new Event(FAVOURITES_CHANGED_EVENT));
}
