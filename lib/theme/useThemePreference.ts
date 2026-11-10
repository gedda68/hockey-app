"use client";

// lib/theme/useThemePreference.ts
// The visitor's theme preference, kept in localStorage. useSyncExternalStore means the
// server render and first client render both use the default, then the stored value
// takes over after hydration (no mismatch warnings). If storage is blocked (private
// mode), the choice still works for the life of the page via an in-memory fallback.

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME_PREFERENCE,
  THEME_STORAGE_KEY,
  parseThemePreference,
  type ThemePreference,
} from "./theme";

const CHANGE_EVENT = "hockey-app:theme-changed";

let memoryPreference: ThemePreference | null = null;

function readSnapshot(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw !== null) return parseThemePreference(raw);
  } catch {
    // storage unavailable — fall through to the in-memory value
  }
  return memoryPreference ?? DEFAULT_THEME_PREFERENCE;
}

function getServerSnapshot(): ThemePreference {
  return DEFAULT_THEME_PREFERENCE;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);

  const setPreference = useCallback((next: ThemePreference) => {
    memoryPreference = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // keep the in-memory value only
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [preference, setPreference];
}
