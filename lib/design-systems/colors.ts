/**
 * Centralized Color System
 *
 * All colors used throughout the hockey app.
 * Reference this file instead of hardcoding colors.
 *
 * Usage:
 * import { colors } from '@/lib/design-systems/colors';
 *
 * Or better, extend Tailwind config to use these colors.
 */

export type ColorShades = {
  light?: string;
  DEFAULT: string;
  dark?: string;
};

export type BrandColors = {
  primary: string;
  secondary: string;
  accent?: string;
};

export type AppColors = {
  brand: BrandColors;
  success: ColorShades;
  error: ColorShades;
  warning?: ColorShades;
  neutral?: {
    100?: string;
    200?: string;
    300?: string;
  };
};

export const colors: AppColors = {
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
    DEFAULT: "#ef4444", // Red 500
    dark: "#dc2626",
  },

  warning: {
    light: "#fbbf24",
    DEFAULT: "#f59e0b",
    dark: "#d97706",
  },

  neutral: {
    100: "#f8fafc",
    200: "#e6eef8",
    300: "#cbd5e1",
  },
};

export type Colors = typeof colors;
