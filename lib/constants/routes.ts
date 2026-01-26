/**
 * Application Routes
 *
 * Centralized route definitions for type-safe navigation.
 * Update here when routes change to avoid broken links.
 */

export const ROUTES = {
  // Main pages
  HOME: "/",
  ABOUT: "/about",
  CONTACT: "/contact",

  // Clubs
  CLUBS: "/clubs",
  CLUB_DETAIL: (slug: string) => `/clubs/${slug}`,
  CLUB_CONTACT: (slug: string) => `/clubs/${slug}/contact`,

  // Competitions
  COMPETITIONS: "/competitions",
  EVENTS: "/competitions/events",
  FIXTURES: "/competitions/fixtures",
  MATCHES: "/competitions/matches",
  STANDINGS: "/competitions/standings",
  STATISTICS: "/competitions/statistics",

  // Officials
  OFFICIALS: "/competitions/officials", // ✅ Fixed - added leading slash
  UMPIRE_ALLOCATIONS: "/competitions/officials/umpire-allocations",

  // Other
  PLAY: "/play",
  REPRESENTATIVE: "/representative",
  SHOP: "/shop",
} as const;

// Navigation groups for header/footer
export const NAV_GROUPS = {
  PRIMARY: [
    { label: "About", href: ROUTES.ABOUT },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Clubs", href: ROUTES.CLUBS },
    { label: "Play", href: ROUTES.PLAY },
  ],

  COMPETITIONS: [
    { label: "Matches", href: ROUTES.MATCHES },
    { label: "Standings", href: ROUTES.STANDINGS },
    { label: "Statistics", href: ROUTES.STATISTICS },
    { label: "Events", href: ROUTES.EVENTS },
    { label: "Fixtures", href: ROUTES.FIXTURES },
    { label: "Officials", href: ROUTES.OFFICIALS },
    { label: "Umpire Allocations", href: ROUTES.UMPIRE_ALLOCATIONS },
  ],

  SECONDARY: [
    { label: "Officials", href: ROUTES.OFFICIALS },
    { label: "Representative", href: ROUTES.REPRESENTATIVE },
    { label: "Shop", href: ROUTES.SHOP },
    { label: "Contact", href: ROUTES.CONTACT },
  ],
} as const;

// Breadcrumb configurations
export const BREADCRUMBS = {
  [ROUTES.COMPETITIONS]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
  ],
  [ROUTES.MATCHES]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Matches", href: ROUTES.MATCHES },
  ],
  [ROUTES.STANDINGS]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Standings", href: ROUTES.STANDINGS },
  ],
  [ROUTES.STATISTICS]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Statistics", href: ROUTES.STATISTICS },
  ],
} as const;

// Page metadata
export const PAGE_METADATA = {
  [ROUTES.HOME]: {
    title: "Brisbane Hockey League",
    description: "Official website of the Brisbane Hockey League",
  },
  [ROUTES.MATCHES]: {
    title: "Match Results & Fixtures",
    description: "View match results and upcoming fixtures",
  },
  [ROUTES.STANDINGS]: {
    title: "League Standings",
    description: "Current standings for all divisions",
  },
  [ROUTES.STATISTICS]: {
    title: "Player & Team Statistics",
    description: "Comprehensive statistics for players and teams",
  },
} as const;

// Check if route is active
export function isActiveRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + "/");
}

// Get parent route
export function getParentRoute(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/");
}

// Type definitions
export type Routes = typeof ROUTES;
export type RouteKey = keyof typeof ROUTES;
export type RouteString = RouteValue<Routes>;

type RouteValue<T> = T extends Record<string, infer V>
  ? V extends (arg: any) => string
    ? string
    : V extends string
    ? V
    : never
  : never;
