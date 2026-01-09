/**
 * Application Configuration
 *
 * Centralized configuration values.
 * Keep all magic numbers and strings here.
 */

export const APP_CONFIG = {
  // App Info
  NAME: "Brisbane Hockey League",
  SHORT_NAME: "BHL",
  DESCRIPTION: "Official Brisbane Hockey League Website",
  VERSION: "1.0.0",

  // Contact
  EMAIL: "info@brisbanehockey.com.au",
  PHONE: "+61 7 XXXX XXXX",

  // Social Media
  SOCIAL: {
    FACEBOOK: "https://facebook.com/brisbanehockey",
    INSTAGRAM: "https://instagram.com/brisbanehockey",
    TWITTER: "https://twitter.com/brisbanehockey",
  },

  // Current Season
  CURRENT_SEASON: new Date().getFullYear(),

  // Divisions
  DIVISIONS: ["BHL1", "BHL2", "PLM", "PL1", "PL2"] as const,

  // Match Statuses
  MATCH_STATUSES: [
    "Scheduled",
    "Live",
    "Final",
    "Postponed",
    "Cancelled",
  ] as const,

  // Pagination
  ITEMS_PER_PAGE: {
    MATCHES: 20,
    PLAYERS: 50,
    CLUBS: 12,
  },

  // Date Formats
  DATE_FORMATS: {
    SHORT: "dd/MM/yyyy",
    LONG: "EEEE, MMMM do, yyyy",
    TIME: "h:mm a",
    DATETIME: "dd/MM/yyyy h:mm a",
  },

  // File Limits
  FILE_LIMITS: {
    MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  },

  // Cache Settings
  CACHE: {
    REVALIDATE_INTERVAL: 60, // seconds
    STALE_TIME: 5 * 60 * 1000, // 5 minutes
  },
} as const;

// Filter Options
export const FILTER_OPTIONS = {
  DIVISIONS: [
    { value: "All", label: "All Divisions" },
    { value: "BHL1", label: "BHL1" },
    { value: "BHL2", label: "BHL2" },
    { value: "PLM", label: "PLM" },
    { value: "PL1", label: "PL1" },
    { value: "PL2", label: "PL2" },
  ],

  MATCH_STATUSES: [
    { value: "All", label: "All Statuses" },
    { value: "Scheduled", label: "Scheduled" },
    { value: "Live", label: "Live" },
    { value: "Final", label: "Final" },
  ],

  ROUNDS: Array.from({ length: 18 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `Round ${i + 1}`,
  })),

  STATISTICS_CATEGORIES: [
    { value: "players", label: "Player Stats" },
    { value: "teams", label: "Team Stats" },
    { value: "matches", label: "Match Stats" },
  ],
} as const;

// Zone Configuration (for standings)
export const ZONE_CONFIG = {
  PROMOTION: 3, // Top 3 positions
  RELEGATION: 2, // Bottom 2 positions
} as const;

// Validation Rules
export const VALIDATION = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^(\+61|0)[2-478]( ?\d){8}$/,
  POSTAL_CODE: /^\d{4}$/,

  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 1000,
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_LIVE_SCORES: true,
  ENABLE_PLAYER_PROFILES: true,
  ENABLE_SHOP: false,
  ENABLE_MEMBERSHIPS: false,
  ENABLE_NOTIFICATIONS: false,
} as const;

export type Division = (typeof APP_CONFIG.DIVISIONS)[number];
export type MatchStatus = (typeof APP_CONFIG.MATCH_STATUSES)[number];
