/**
 * Typography System
 *
 * Consistent typography classes used throughout the app.
 * Use these constants instead of hardcoding font classes.
 *
 * Usage:
 * import { typography } from '@/lib/design-system/typography';
 * className={typography.h1}
 */

export const typography = {
  // ===== HEADINGS =====
  h1: "text-4xl font-black uppercase italic text-slate-900",
  h2: "text-3xl font-black uppercase italic text-slate-900",
  h3: "text-xl font-black uppercase italic text-slate-900",
  h4: "text-lg font-black uppercase text-slate-900",
  h5: "text-base font-black uppercase text-slate-900",

  // ===== PAGE HEADERS =====
  pageTitle: "text-4xl font-black uppercase italic",
  pageSubtitle: "text-lg font-bold text-slate-600",
  sectionTitle: "text-xl font-black uppercase italic text-[#06054e]",
  sectionSubtitle:
    "text-[10px] font-bold text-slate-500 uppercase tracking-wide",

  // ===== LABELS =====
  label: "text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]",
  labelLarge: "text-xs font-black uppercase text-slate-400 tracking-wider",
  labelMedium: "text-[10px] font-bold uppercase text-slate-500",
  labelSmall: "text-[8px] font-black uppercase text-slate-400 tracking-wider",

  // ===== BODY TEXT =====
  body: "text-sm font-medium text-slate-600",
  bodyLarge: "text-base font-medium text-slate-600",
  bodySmall: "text-xs font-medium text-slate-600",
  bodyBold: "text-sm font-bold text-slate-900",

  // ===== DATA / STATS =====
  dataXLarge: "text-4xl font-black",
  dataLarge: "text-3xl font-black",
  dataMedium: "text-2xl font-black",
  dataSmall: "text-lg font-black",
  dataXSmall: "text-base font-black",

  // ===== TABLE HEADERS =====
  tableHeader: "text-[8px] font-black uppercase text-slate-400 tracking-wider",
  tableHeaderLarge:
    "text-[10px] font-black uppercase text-slate-400 tracking-wide",

  // ===== BUTTONS =====
  button: "text-[10px] font-black uppercase tracking-widest",
  buttonLarge: "text-xs font-black uppercase tracking-wide",
  buttonSmall: "text-[9px] font-black uppercase tracking-widest",

  // ===== LINKS =====
  link: "text-sm font-bold text-[#06054e] hover:underline",
  linkLarge: "text-base font-bold text-[#06054e] hover:underline",
  linkSmall: "text-xs font-bold text-[#06054e] hover:underline",

  // ===== NAVIGATION =====
  navItem: "text-[10px] font-black uppercase tracking-widest",
  navLink: "text-sm font-bold hover:text-[#06054e]",
  backButton: "text-[10px] font-black uppercase tracking-widest text-slate-400",

  // ===== CARDS =====
  cardTitle: "text-lg font-black uppercase italic",
  cardSubtitle: "text-xs font-bold text-slate-500",
  cardLabel: "text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]",

  // ===== STATS CARDS =====
  statValue: "text-4xl font-black text-[#06054e]",
  statLabel: "text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]",
  statTrend: "text-xs font-black uppercase",
  statSubtext: "text-xs text-slate-500 font-medium",

  // ===== PLAYER / TEAM NAMES =====
  playerName: "text-xs font-black text-slate-900",
  playerClub: "text-[9px] font-bold text-slate-500 uppercase",
  teamName: "text-xs font-black text-slate-900 uppercase",
  teamNameLarge: "text-base font-black text-slate-900 uppercase",

  // ===== SCORES =====
  scoreLarge: "text-2xl font-black",
  scoreMedium: "text-lg font-black",
  scoreSmall: "text-base font-black",

  // ===== EMPTY STATES =====
  emptyTitle: "text-sm font-bold text-slate-400 uppercase tracking-wide",
  emptyText: "text-xs text-slate-500",

  // ===== ERROR STATES =====
  errorTitle: "text-lg font-black text-red-600 uppercase",
  errorText: "text-sm text-slate-600",

  // ===== LOADING STATES =====
  loadingText: "text-sm font-bold text-slate-400",

  // ===== BADGES =====
  badge: "text-[9px] font-black uppercase tracking-wide",
  badgeLarge: "text-xs font-black uppercase tracking-wide",

  // ===== TOOLTIPS =====
  tooltip: "text-xs font-medium",

  // ===== FORMS =====
  formLabel: "text-xs font-bold text-slate-700",
  formHelperText: "text-xs text-slate-500",
  formError: "text-xs font-bold text-red-600",

  // ===== TIMESTAMPS =====
  timestamp: "text-xs font-medium text-slate-500",
  timestampSmall: "text-[10px] font-medium text-slate-400",
} as const;

// Helper function to combine typography with additional classes
export function withTypography(base: string, additional?: string): string {
  return additional ? `${base} ${additional}` : base;
}

// Font weight utilities
export const fontWeight = {
  thin: "font-thin", // 100
  extralight: "font-extralight", // 200
  light: "font-light", // 300
  normal: "font-normal", // 400
  medium: "font-medium", // 500
  semibold: "font-semibold", // 600
  bold: "font-bold", // 700
  extrabold: "font-extrabold", // 800
  black: "font-black", // 900
} as const;

// Tracking utilities (letter spacing)
export const tracking = {
  tighter: "tracking-tighter", // -0.05em
  tight: "tracking-tight", // -0.025em
  normal: "tracking-normal", // 0em
  wide: "tracking-wide", // 0.025em
  wider: "tracking-wider", // 0.05em
  widest: "tracking-widest", // 0.1em
  ultraWide: "tracking-[0.2em]", // Custom ultra-wide
} as const;

// Leading utilities (line height)
export const leading = {
  none: "leading-none", // 1
  tight: "leading-tight", // 1.25
  snug: "leading-snug", // 1.375
  normal: "leading-normal", // 1.5
  relaxed: "leading-relaxed", // 1.625
  loose: "leading-loose", // 2
} as const;

// Text transform utilities
export const textTransform = {
  uppercase: "uppercase",
  lowercase: "lowercase",
  capitalize: "capitalize",
  normal: "normal-case",
} as const;

// Font style utilities
export const fontStyle = {
  italic: "italic",
  normal: "not-italic",
} as const;

export type TypographyKey = keyof typeof typography;

export default typography;
