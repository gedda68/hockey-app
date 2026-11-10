// lib/theme/theme.ts
// Colour-theme model for the public site. Pure (no React / DOM access) except for
// THEME_INIT_SCRIPT, a string that runs in the browser before first paint.
//
// Preference  = what the visitor chose: "light" | "dark" | "system".
// Resolved    = what is actually applied to <html data-theme>: "light" | "dark".
//
// Dark styling is opt-in per route (see DARK_SUPPORTED_PATHS). The site's pages use
// hard-coded light colours, so a route only gets the dark theme once it has been
// checked in both modes; every other route stays light whatever the visitor picked.

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["light", "system", "dark"];

export const THEME_STORAGE_KEY = "hockey-app:theme:v1";

/**
 * Used when nothing is stored. "light" keeps the site looking exactly as designed for
 * visitors who never touch the toggle. Switch to "system" to follow the OS by default.
 */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "light";

/**
 * Routes verified in both light and dark. Matched exactly (a trailing slash is
 * ignored), NOT by prefix: /competitions is listed, /competitions/events is not.
 * To extend: check the page in both themes, then add its path here.
 */
export const DARK_SUPPORTED_PATHS: readonly string[] = [
  "/",
  "/search",
  "/about",
  "/contact",
  "/competitions",
];

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  return raw === "light" || raw === "dark" || raw === "system"
    ? raw
    : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "dark") return "dark";
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return "light";
}

function normalisePath(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const p = pathname.split(/[?#]/)[0];
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p || "/";
}

/** True when `pathname` has been verified for the dark theme. */
export function isDarkSupportedPath(pathname: string | null | undefined): boolean {
  return DARK_SUPPORTED_PATHS.includes(normalisePath(pathname));
}

/** The theme to apply on a given route. Unsupported routes are always light. */
export function themeForPath(
  preference: ThemePreference,
  systemPrefersDark: boolean,
  pathname: string | null | undefined,
): ResolvedTheme {
  if (!isDarkSupportedPath(pathname)) return "light";
  return resolveTheme(preference, systemPrefersDark);
}

/**
 * Inline script for <head>: applies the theme before first paint so there is no flash
 * of the wrong theme. Mirrors themeForPath / parseThemePreference — the constants are
 * injected from this file, and theme.test.ts runs the script against the real functions.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var d=document.documentElement,p=null;
try{p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}
if(p!=="light"&&p!=="dark"&&p!=="system")p=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};
var path=location.pathname.split(/[?#]/)[0];
if(path.length>1&&path.charAt(path.length-1)==="/")path=path.slice(0,-1);
var ok=${JSON.stringify(DARK_SUPPORTED_PATHS)}.indexOf(path||"/")!==-1;
var sys=false;try{sys=!!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){}
var t=(ok&&(p==="dark"||(p==="system"&&sys)))?"dark":"light";
d.setAttribute("data-theme",t);d.style.colorScheme=t;
}catch(e){}})();`;
