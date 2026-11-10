import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_FAVOURITES,
  FAVOURITES_CHANGED_EVENT,
  FAVOURITES_STORAGE_KEY,
  MAX_FAVOURITE_LEAGUES,
  MAX_FAVOURITE_TEAMS,
  isFavouriteLeague,
  isFavouriteTeam,
  parseFavourites,
  readRawFavourites,
  toggleById,
  toggleLeague,
  toggleTeam,
  writeFavourites,
} from "@/lib/favourites/localFavourites";

const team = (n: number, clubId: string | undefined = `c${n}`) => ({
  teamId: `t${n}`,
  clubId,
  name: `Team ${n}`,
});

describe("parseFavourites", () => {
  it("returns empty for null, empty and invalid JSON", () => {
    expect(parseFavourites(null)).toBe(EMPTY_FAVOURITES);
    expect(parseFavourites("")).toBe(EMPTY_FAVOURITES);
    expect(parseFavourites("{not json")).toBe(EMPTY_FAVOURITES);
    expect(parseFavourites("42")).toBe(EMPTY_FAVOURITES);
  });

  it("keeps valid entries and drops malformed ones", () => {
    const raw = JSON.stringify({
      teams: [
        { teamId: "t1", clubId: "c1", name: "Alpha" },
        { teamId: "", name: "No id" },
        { teamId: "t3" },
        null,
        "junk",
        { teamId: "t4", name: "No club" },
      ],
      leagues: [
        { seasonCompetitionId: "sc1", name: "Premier 2026" },
        { seasonCompetitionId: "sc2" },
      ],
    });
    const out = parseFavourites(raw);
    expect(out.teams).toEqual([
      { teamId: "t1", clubId: "c1", name: "Alpha" },
      { teamId: "t4", name: "No club" },
    ]);
    expect(out.leagues).toEqual([{ seasonCompetitionId: "sc1", name: "Premier 2026" }]);
  });

  it("caps the lists at their maximums", () => {
    const raw = JSON.stringify({
      teams: Array.from({ length: MAX_FAVOURITE_TEAMS + 5 }, (_, i) => team(i)),
      leagues: Array.from({ length: MAX_FAVOURITE_LEAGUES + 5 }, (_, i) => ({
        seasonCompetitionId: `sc${i}`,
        name: `L${i}`,
      })),
    });
    const out = parseFavourites(raw);
    expect(out.teams).toHaveLength(MAX_FAVOURITE_TEAMS);
    expect(out.leagues).toHaveLength(MAX_FAVOURITE_LEAGUES);
  });
});

describe("toggleById", () => {
  const idOf = (x: { id: string }) => x.id;

  it("adds new items to the front", () => {
    expect(toggleById([{ id: "a" }], { id: "b" }, idOf, 5)).toEqual([
      { id: "b" },
      { id: "a" },
    ]);
  });

  it("removes an item that is already present", () => {
    expect(toggleById([{ id: "a" }, { id: "b" }], { id: "a" }, idOf, 5)).toEqual([
      { id: "b" },
    ]);
  });

  it("drops the oldest item when over the cap", () => {
    const out = toggleById([{ id: "a" }, { id: "b" }], { id: "c" }, idOf, 2);
    expect(out).toEqual([{ id: "c" }, { id: "a" }]);
  });
});

describe("toggleTeam / toggleLeague", () => {
  it("toggles a team on and off without touching leagues", () => {
    const withLeague = toggleLeague(EMPTY_FAVOURITES, {
      seasonCompetitionId: "sc1",
      name: "Premier 2026",
    });
    const on = toggleTeam(withLeague, team(1));
    expect(isFavouriteTeam(on, "t1")).toBe(true);
    expect(isFavouriteLeague(on, "sc1")).toBe(true);

    const off = toggleTeam(on, team(1));
    expect(isFavouriteTeam(off, "t1")).toBe(false);
    expect(isFavouriteLeague(off, "sc1")).toBe(true);
  });

  it("does not mutate the input", () => {
    const before = toggleTeam(EMPTY_FAVOURITES, team(1));
    const snapshot = JSON.stringify(before);
    toggleTeam(before, team(2));
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(EMPTY_FAVOURITES.teams).toHaveLength(0);
  });
});

describe("read/write storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("round-trips through localStorage and fires the change event", () => {
    const listener = vi.fn();
    window.addEventListener(FAVOURITES_CHANGED_EVENT, listener);

    const next = toggleTeam(EMPTY_FAVOURITES, team(7));
    writeFavourites(next);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(FAVOURITES_STORAGE_KEY)).toBe(
      JSON.stringify(next),
    );
    expect(parseFavourites(readRawFavourites())).toEqual(next);

    window.removeEventListener(FAVOURITES_CHANGED_EVENT, listener);
  });

  it("does not throw or fire the event when storage is blocked", () => {
    const listener = vi.fn();
    window.addEventListener(FAVOURITES_CHANGED_EVENT, listener);
    const spy = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

    expect(() => writeFavourites(toggleTeam(EMPTY_FAVOURITES, team(1)))).not.toThrow();
    expect(listener).not.toHaveBeenCalled();

    spy.mockRestore();
    window.removeEventListener(FAVOURITES_CHANGED_EVENT, listener);
  });

  it("returns null from readRawFavourites when getItem throws", () => {
    // Seed a real value first so a null result can only come from the catch path.
    window.localStorage.setItem(FAVOURITES_STORAGE_KEY, '{"teams":[],"leagues":[]}');
    expect(readRawFavourites()).not.toBeNull();

    const spy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(readRawFavourites()).toBeNull();
    spy.mockRestore();
  });
});
