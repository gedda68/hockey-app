/**
 * Centralized Color System
 *
 * All colors used throughout the hockey app.
 * Reference this file instead of hardcoding colors.
 *
 * Usage:
 * import { colors } from '@/lib/design-system/colors';
 * className={`bg-[${colors.brand.primary}]`}
 *
 * Or better, extend Tailwind config to use these colors.
 */

export const colors = {
  // ===== BRAND COLORS =====
  brand: {
    primary: "#06054e", // Navy blue - Headers, primary actions
    secondary: "#dc2626", // Red 600 - Accent, active states, goals
    accent: "#2563eb", // Blue 600 - Secondary actions, assists
  },

  // ===== FUNCTIONAL COLORS =====
  success: {
    light: "#4ade80", // Green 400 - Promotion zone
    DEFAULT: "#22c55e", // Green 500 - Positive trends
    dark: "#16a34a", // Green 600 - Goals for
  },

  error: {
    light: "#f87171", // Red 400 - Relegation zone
    DEFAULT: "#ef4444", // Red 500 - Negative trends
    dark: "#dc2626", // Red 600 - Goals against
  },

  warning: {
    DEFAULT: "#eab308", // Yellow 500 - First place
    dark: "#d97706", // Amber 600 - Third place
  },

  info: {
    light: "#60a5fa", // Blue 400 - Points display
    DEFAULT: "#2563eb", // Blue 600 - Information
  },

  // ===== NEUTRAL COLORS =====
  neutral: {
    50: "#f8fafc", // Page background
    100: "#f1f5f9", // Subtle background
    200: "#e2e8f0", // Borders, disabled
    300: "#cbd5e1", // Dividers
    400: "#94a3b8", // Labels, tertiary text
    500: "#64748b", // Secondary text
    600: "#475569", // Body text
    700: "#334155", // Strong text
    800: "#1e293b", // Very strong text
    900: "#0f172a", // Headers, darkest
  },

  // ===== STANDINGS ZONES =====
  zones: {
    promotion: "#4ade80", // Green 400 - Top positions
    safe: "#94a3b8", // Slate 400 - Mid-table
    relegation: "#f87171", // Red 400 - Bottom positions
  },

  // ===== STATISTICS =====
  stats: {
    goals: "#dc2626", // Red 600
    assists: "#2563eb", // Blue 600
    points: "#60a5fa", // Blue 400
    cleanSheets: "#16a34a", // Green 600
    yellowCard: "#eab308", // Yellow 500
    redCard: "#dc2626", // Red 600
  },

  // ===== RANKINGS =====
  rankings: {
    first: "#eab308", // Gold
    second: "#94a3b8", // Silver
    third: "#d97706", // Bronze
    other: "#64748b", // Gray
  },

  // ===== UI ELEMENTS =====
  ui: {
    background: "#f8fafc", // Page background
    card: "#ffffff", // Card background
    hover: "#f1f5f9", // Hover state
    border: "#e2e8f0", // Default border
    divider: "#e2e8f0", // Section dividers
  },

  // ===== SPECIAL =====
  special: {
    overlay: "rgba(0, 0, 0, 0.5)", // Modal overlay
    highlightBg: "rgba(6, 5, 78, 0.1)", // Highlight background
  },
} as const;

// Type exports for TypeScript
export type BrandColor = keyof typeof colors.brand;
export type NeutralColor = keyof typeof colors.neutral;
export type ZoneColor = keyof typeof colors.zones;
export type StatColor = keyof typeof colors.stats;

// Helper function to get color value
export function getColor(path: string): string {
  const parts = path.split(".");
  let value: any = colors;

  for (const part of parts) {
    value = value[part];
    if (!value) return "";
  }

  return value;
}

// Tailwind-compatible color export
export const tailwindColors = {
  brand: colors.brand,
  zone: colors.zones,
  stat: colors.stats,
  rank: colors.rankings,
};

export default colors;
