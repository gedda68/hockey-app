import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DARK_SUPPORTED_PATHS,
  DEFAULT_THEME_PREFERENCE,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  isDarkSupportedPath,
  parseThemePreference,
  resolveTheme,
  themeForPath,
  type ThemePreference,
} from "@/lib/theme/theme";

describe("parseThemePreference", () => {
  it("accepts the three valid values", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });

  it("falls back to the default for anything else", () => {
    for (const bad of [null, undefined, "", "DARK", "auto", "1", "{}"]) {
      expect(parseThemePreference(bad as string | null | undefined)).toBe(
        DEFAULT_THEME_PREFERENCE,
      );
    }
  });
});

describe("resolveTheme", () => {
  it("honours explicit choices regardless of the OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the OS only for 'system'", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("isDarkSupportedPath", () => {
  it("accepts the verified routes, ignoring trailing slash, query and hash", () => {
    expect(isDarkSupportedPath("/")).toBe(true);
    expect(isDarkSupportedPath("/search")).toBe(true);
    expect(isDarkSupportedPath("/search/")).toBe(true);
    expect(isDarkSupportedPath("/search?q=abc")).toBe(true);
    expect(isDarkSupportedPath("/competitions#top")).toBe(true);
    expect(isDarkSupportedPath(null)).toBe(true); // null is treated as "/"
  });

  it("matches exactly, not by prefix", () => {
    expect(isDarkSupportedPath("/competitions/events")).toBe(false);
    expect(isDarkSupportedPath("/competitions/leagues/abc")).toBe(false);
    expect(isDarkSupportedPath("/about/team")).toBe(false);
  });

  it("never enables admin, member or form routes", () => {
    for (const p of [
      "/admin",
      "/admin/members",
      "/login",
      "/change-password",
      "/clubs/c1/register",
      "/nominate",
    ]) {
      expect(isDarkSupportedPath(p)).toBe(false);
    }
  });
});

describe("themeForPath", () => {
  it("applies the visitor's choice on a supported route", () => {
    expect(themeForPath("dark", false, "/search")).toBe("dark");
    expect(themeForPath("system", true, "/")).toBe("dark");
  });

  it("forces light on unsupported routes whatever was chosen", () => {
    expect(themeForPath("dark", true, "/admin/members")).toBe("light");
    expect(themeForPath("system", true, "/clubs/c1/register")).toBe("light");
  });
});

/**
 * Run the real inline script in the test DOM and compare it to themeForPath, so the
 * hand-written browser copy of the logic can't silently drift from the tested one.
 */
describe("THEME_INIT_SCRIPT", () => {
  const root = document.documentElement;

  function runScript(opts: {
    stored: string | null;
    systemDark: boolean;
    pathname: string;
  }) {
    window.localStorage.clear();
    if (opts.stored !== null) window.localStorage.setItem(THEME_STORAGE_KEY, opts.stored);
    root.removeAttribute("data-theme");
    root.style.colorScheme = "";

    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("dark") ? opts.systemDark : false,
    }));
    window.history.replaceState({}, "", opts.pathname);

    new Function(THEME_INIT_SCRIPT)();
    return root.getAttribute("data-theme");
  }

  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("agrees with themeForPath across every preference, OS setting and route", () => {
    const prefs: ThemePreference[] = ["light", "dark", "system"];
    const paths = [...DARK_SUPPORTED_PATHS, "/competitions/events", "/admin/members", "/search/"];
    for (const stored of prefs) {
      for (const systemDark of [true, false]) {
        for (const pathname of paths) {
          const got = runScript({ stored, systemDark, pathname });
          expect(got, `${stored} sys=${systemDark} ${pathname}`).toBe(
            themeForPath(stored, systemDark, pathname),
          );
        }
      }
    }
  });

  it("uses the default preference when nothing, or something invalid, is stored", () => {
    expect(runScript({ stored: null, systemDark: true, pathname: "/" })).toBe(
      themeForPath(DEFAULT_THEME_PREFERENCE, true, "/"),
    );
    expect(runScript({ stored: "banana", systemDark: true, pathname: "/" })).toBe(
      themeForPath(DEFAULT_THEME_PREFERENCE, true, "/"),
    );
  });

  it("sets color-scheme to match", () => {
    runScript({ stored: "dark", systemDark: false, pathname: "/search" });
    expect(root.style.colorScheme).toBe("dark");
    runScript({ stored: "dark", systemDark: false, pathname: "/admin" });
    expect(root.style.colorScheme).toBe("light");
  });

  it("does not throw when storage or matchMedia are unavailable", () => {
    window.localStorage.clear();
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.stubGlobal("matchMedia", undefined);
    root.removeAttribute("data-theme");

    expect(() => new Function(THEME_INIT_SCRIPT)()).not.toThrow();
    expect(root.getAttribute("data-theme")).toBe("light");
    vi.restoreAllMocks();
  });
});
