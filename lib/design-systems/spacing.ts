/**
 * Spacing System
 *
 * Consistent spacing values used throughout the app.
 * Use these constants for padding, margins, and gaps.
 *
 * Usage:
 * import { spacing } from '@/lib/design-system/spacing';
 * className={spacing.pagePadding}
 */

export const spacing = {
  // ===== PAGE LAYOUT =====
  pagePadding: "p-4 md:p-12",
  pageMargin: "m-4 md:m-12",
  contentPadding: "px-4 md:px-12",

  // ===== SECTION SPACING =====
  sectionGap: "space-y-8",
  sectionGapLarge: "space-y-12",
  sectionGapSmall: "space-y-6",
  sectionMarginBottom: "mb-10",
  sectionPaddingBottom: "pb-6",

  // ===== CARD SPACING =====
  cardPadding: "p-6",
  cardPaddingLarge: "p-8",
  cardPaddingSmall: "p-4",
  cardPaddingX: "px-6",
  cardPaddingY: "py-6",
  cardGap: "gap-4",

  // ===== GRID SPACING =====
  gridGap: "gap-6",
  gridGapLarge: "gap-8",
  gridGapSmall: "gap-4",
  gridGapXLarge: "gap-10",

  // ===== FLEX SPACING =====
  flexGap: "gap-4",
  flexGapLarge: "gap-6",
  flexGapSmall: "gap-2",
  flexGapXSmall: "gap-1",

  // ===== FILTER SPACING =====
  filterGap: "gap-x-10 gap-y-6",
  filterButtonGap: "gap-2",
  filterGroupGap: "gap-2",
  filterSectionGap: "gap-x-12 gap-y-6",

  // ===== TABLE SPACING =====
  tableRowPadding: "px-4 py-3",
  tableRowPaddingLarge: "px-4 py-4",
  tableRowPaddingSmall: "px-2 py-2",
  tableHeaderPadding: "px-4 pb-3",
  tableGap: "space-y-1",

  // ===== FORM SPACING =====
  formGap: "space-y-4",
  formGroupGap: "gap-2",
  inputPadding: "px-4 py-2",

  // ===== BUTTON SPACING =====
  buttonPadding: "px-6 py-2",
  buttonPaddingLarge: "px-8 py-3",
  buttonPaddingSmall: "px-4 py-2",
  buttonGap: "gap-2",

  // ===== LIST SPACING =====
  listGap: "space-y-2",
  listGapLarge: "space-y-4",
  listGapSmall: "space-y-1",
  listItemPadding: "p-4",

  // ===== HEADER SPACING =====
  headerMarginBottom: "mb-6",
  headerPaddingBottom: "pb-4",
  headerGap: "gap-4",

  // ===== STACK SPACING =====
  stackGapTiny: "space-y-0.5",
  stackGapXSmall: "space-y-1",
  stackGapSmall: "space-y-2",
  stackGap: "space-y-4",
  stackGapLarge: "space-y-6",
  stackGapXLarge: "space-y-8",

  // ===== INLINE SPACING =====
  inlineGapTiny: "gap-0.5",
  inlineGapXSmall: "gap-1",
  inlineGapSmall: "gap-2",
  inlineGap: "gap-3",
  inlineGapLarge: "gap-4",
  inlineGapXLarge: "gap-6",

  // ===== MARGINS =====
  marginTop: {
    none: "mt-0",
    xs: "mt-1",
    sm: "mt-2",
    md: "mt-4",
    lg: "mt-6",
    xl: "mt-8",
    xxl: "mt-12",
  },

  marginBottom: {
    none: "mb-0",
    xs: "mb-1",
    sm: "mb-2",
    md: "mb-4",
    lg: "mb-6",
    xl: "mb-8",
    xxl: "mb-12",
  },

  marginX: {
    none: "mx-0",
    xs: "mx-1",
    sm: "mx-2",
    md: "mx-4",
    lg: "mx-6",
    xl: "mx-8",
    auto: "mx-auto",
  },

  marginY: {
    none: "my-0",
    xs: "my-1",
    sm: "my-2",
    md: "my-4",
    lg: "my-6",
    xl: "my-8",
  },

  // ===== PADDING =====
  padding: {
    none: "p-0",
    xs: "p-1",
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
    xxl: "p-12",
  },

  paddingX: {
    none: "px-0",
    xs: "px-1",
    sm: "px-2",
    md: "px-4",
    lg: "px-6",
    xl: "px-8",
    xxl: "px-12",
  },

  paddingY: {
    none: "py-0",
    xs: "py-1",
    sm: "py-2",
    md: "py-4",
    lg: "py-6",
    xl: "py-8",
    xxl: "py-12",
  },

  // ===== GAPS =====
  gap: {
    none: "gap-0",
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
    xxl: "gap-12",
  },

  // ===== COMPONENT-SPECIFIC =====
  modal: {
    padding: "p-8",
    gap: "gap-6",
  },

  dropdown: {
    padding: "p-2",
    itemPadding: "px-3 py-2",
  },

  navbar: {
    padding: "px-6 py-4",
    gap: "gap-8",
  },

  sidebar: {
    padding: "p-6",
    gap: "space-y-4",
  },

  footer: {
    padding: "p-8",
    gap: "gap-6",
  },

  // ===== STATISTICS SPACING =====
  statsCard: {
    padding: "p-6",
    gap: "gap-2",
  },

  statsTable: {
    padding: "p-8",
    rowPadding: "px-4 py-4",
  },

  // ===== STANDINGS SPACING =====
  standings: {
    containerPadding: "p-6",
    rowPadding: "p-2",
    gap: "space-y-1",
  },

  // ===== MATCH SPACING =====
  match: {
    cardPadding: "p-6",
    gap: "gap-4",
  },
} as const;

// Helper function to combine spacing with additional classes
export function withSpacing(base: string, additional?: string): string {
  return additional ? `${base} ${additional}` : base;
}

// Responsive spacing utilities
export const responsiveSpacing = {
  // Small mobile to desktop progression
  sm: "p-4 md:p-6 lg:p-8",
  md: "p-6 md:p-8 lg:p-12",
  lg: "p-8 md:p-12 lg:p-16",

  // Gap variations
  gapSm: "gap-2 md:gap-4 lg:gap-6",
  gapMd: "gap-4 md:gap-6 lg:gap-8",
  gapLg: "gap-6 md:gap-8 lg:gap-12",
} as const;

// Container max widths
export const container = {
  xs: "max-w-xs", // 320px
  sm: "max-w-sm", // 384px
  md: "max-w-md", // 448px
  lg: "max-w-lg", // 512px
  xl: "max-w-xl", // 576px
  "2xl": "max-w-2xl", // 672px
  "3xl": "max-w-3xl", // 768px
  "4xl": "max-w-4xl", // 896px
  "5xl": "max-w-5xl", // 1024px
  "6xl": "max-w-6xl", // 1152px
  "7xl": "max-w-7xl", // 1280px
  full: "max-w-full",
  none: "max-w-none",
} as const;

export type SpacingKey = keyof typeof spacing;

export default spacing;
