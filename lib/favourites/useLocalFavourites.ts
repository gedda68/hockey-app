"use client";

// lib/favourites/useLocalFavourites.ts
// React hook over the localStorage favourites store. Uses useSyncExternalStore
// so server render and first client render both see "no favourites" (no
// hydration mismatch), then the saved list appears right after hydration.

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_FAVOURITES,
  FAVOURITES_CHANGED_EVENT,
  FAVOURITES_STORAGE_KEY,
  isFavouriteLeague,
  isFavouriteTeam,
  parseFavourites,
  readRawFavourites,
  toggleLeague,
  toggleTeam,
  writeFavourites,
  type FavouriteLeague,
  type FavouriteTeam,
  type LocalFavourites,
} from "./localFavourites";

// useSyncExternalStore needs a referentially stable snapshot between changes,
// so cache the parsed value against the raw string it came from.
let cachedRaw: string | null | undefined;
let cachedValue: LocalFavourites = EMPTY_FAVOURITES;

function getSnapshot(): LocalFavourites {
  const raw = readRawFavourites();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseFavourites(raw);
  }
  return cachedValue;
}

function getServerSnapshot(): LocalFavourites {
  return EMPTY_FAVOURITES;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === FAVOURITES_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(FAVOURITES_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FAVOURITES_CHANGED_EVENT, onChange);
  };
}

export function useLocalFavourites() {
  const favourites = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const toggleFavouriteTeam = useCallback((team: FavouriteTeam) => {
    writeFavourites(toggleTeam(getSnapshot(), team));
  }, []);

  const toggleFavouriteLeague = useCallback((league: FavouriteLeague) => {
    writeFavourites(toggleLeague(getSnapshot(), league));
  }, []);

  return {
    favourites,
    isTeamFavourite: (teamId: string) => isFavouriteTeam(favourites, teamId),
    isLeagueFavourite: (id: string) => isFavouriteLeague(favourites, id),
    toggleFavouriteTeam,
    toggleFavouriteLeague,
  };
}
