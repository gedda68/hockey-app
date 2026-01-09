/**
 * Borders & Shadows System
 *
 * Consistent border radius, border styles, and shadow values.
 *
 * Usage:
 * import { borders } from '@/lib/design-system/borders';
 * className={borders.card}
 */

export const borders = {
  // ===== BORDER RADIUS =====
  radius: {
    none: "rounded-none",
    sm: "rounded-sm", // 2px
    md: "rounded", // 4px
    lg: "rounded-lg", // 8px
    xl: "rounded-xl", // 12px
    "2xl": "rounded-2xl", // 16px
    "3xl": "rounded-3xl", // 24px (cards)
    full: "rounded-full", // Pill shape (buttons)
  },

  // ===== COMPONENT-SPECIFIC RADIUS =====
  card: "rounded-3xl", // 24px - Main card containers
  button: "rounded-full", // Pill shape - All buttons
  element: "rounded-xl", // 12px - Table rows, small containers
  elementSmall: "rounded-lg", // 8px - Badges, chips
  elementTiny: "rounded", // 4px - Small elements
  input: "rounded-full", // Input fields
  badge: "rounded-full", // Badges
  avatar: "rounded-full", // Profile images
  image: "rounded-xl", // Content images

  // ===== BORDER WIDTHS =====
  width: {
    none: "border-0",
    thin: "border", // 1px
    medium: "border-2", // 2px
    thick: "border-4", // 4px
    extraThick: "border-8", // 8px
  },

  // ===== BORDER STYLES =====
  style: {
    solid: "border-solid",
    dashed: "border-dashed",
    dotted: "border-dotted",
    double: "border-double",
    none: "border-none",
  },

  // ===== BORDER COLORS =====
  color: {
    default: "border-slate-200",
    primary: "border-[#06054e]",
    secondary: "border-red-600",
    success: "border-green-500",
    error: "border-red-500",
    warning: "border-yellow-500",
    info: "border-blue-500",
    transparent: "border-transparent",
    white: "border-white",
    whiteAlpha: "border-white/20",
  },

  // ===== DIVIDERS =====
  divider: {
    section: "border-b-4 border-[#06054e]", // Page section dividers
    card: "border-b-2 border-slate-200", // Card section dividers
    cardThick: "border-b-2 border-[#06054e]", // Emphasized card dividers
    row: "border-b border-slate-100", // Table row dividers
    subtle: "border-b border-slate-200", // Subtle dividers
    white: "border-b border-white/20", // White dividers (dark bg)
    whiteThick: "border-b-2 border-white/20", // Thick white dividers
  },

  // ===== SPECIFIC BORDERS =====
  outline: {
    default: "border-2 border-slate-200",
    hover: "border-2 border-[#06054e]",
    active: "border-2 border-red-600",
    error: "border-2 border-red-500",
    success: "border-2 border-green-500",
  },

  // ===== SHADOWS =====
  shadow: {
    none: "shadow-none",
    sm: "shadow-sm", // Subtle elevation
    md: "shadow-md", // Default shadow
    lg: "shadow-lg", // Card shadow
    xl: "shadow-xl", // Hover state
    "2xl": "shadow-2xl", // Maximum elevation
    inner: "shadow-inner", // Inset shadow
  },

  // ===== COMPONENT SHADOWS =====
  cardShadow: "shadow-lg", // Default card
  cardShadowHover: "hover:shadow-xl", // Card hover
  buttonShadow: "shadow-md", // Button default
  modalShadow: "shadow-2xl", // Modal/dialog
  dropdownShadow: "shadow-xl", // Dropdown menus
  tooltipShadow: "shadow-lg", // Tooltips

  // ===== RING (FOCUS) =====
  ring: {
    none: "ring-0",
    thin: "ring-1",
    default: "ring-2",
    thick: "ring-4",
  },

  ringColor: {
    primary: "ring-[#06054e]",
    secondary: "ring-red-600",
    success: "ring-green-500",
    error: "ring-red-500",
    warning: "ring-yellow-500",
    info: "ring-blue-500",
  },

  ringOffset: {
    none: "ring-offset-0",
    sm: "ring-offset-1",
    md: "ring-offset-2",
    lg: "ring-offset-4",
  },

  // ===== FOCUS STYLES =====
  focus: {
    default: "focus:ring-2 focus:ring-[#06054e] focus:ring-offset-2",
    input:
      "focus:border-[#06054e] focus:ring-2 focus:ring-[#06054e] focus:ring-offset-0",
    button: "focus:ring-2 focus:ring-[#06054e] focus:ring-offset-2",
    card: "focus:ring-2 focus:ring-slate-300",
  },

  // ===== GRADIENT BORDERS =====
  gradientBorder: {
    primary:
      "border-2 border-transparent bg-gradient-to-r from-[#06054e] to-red-600",
    accent:
      "border-2 border-transparent bg-gradient-to-r from-red-600 to-blue-600",
  },
} as const;

// Helper function to combine border/shadow with additional classes
export function withBorder(base: string, additional?: string): string {
  return additional ? `${base} ${additional}` : base;
}

// Combined utility classes for common patterns
export const borderCombinations = {
  // Card with all styling
  card: "rounded-3xl border-0 shadow-lg",
  cardHover: "rounded-3xl border-0 shadow-lg hover:shadow-xl transition-shadow",

  // Button with all styling
  button: "rounded-full border-0 shadow-md",
  buttonOutline:
    "rounded-full border-2 border-slate-200 hover:border-[#06054e]",

  // Input with all styling
  input:
    "rounded-full border-2 border-slate-200 focus:border-[#06054e] focus:ring-2 focus:ring-[#06054e] focus:ring-offset-0",

  // Table row
  tableRow: "rounded-xl border-0",
  tableRowBorder: "rounded-xl border-b border-slate-100 last:border-0",

  // Section with divider
  section: "border-b-4 border-[#06054e] pb-6",
  sectionCard: "border-b-2 border-slate-200 pb-4",

  // Modal/Dialog
  modal: "rounded-3xl border-0 shadow-2xl",

  // Dropdown
  dropdown: "rounded-xl border border-slate-200 shadow-xl",

  // Badge
  badge: "rounded-full border border-slate-200",

  // Avatar
  avatar: "rounded-full border-2 border-white shadow-md",
} as const;

// Transition classes for smooth animations
export const transitions = {
  all: "transition-all",
  colors: "transition-colors",
  opacity: "transition-opacity",
  shadow: "transition-shadow",
  transform: "transition-transform",

  // Durations
  fast: "duration-150",
  normal: "duration-300",
  slow: "duration-500",

  // Combined
  allNormal: "transition-all duration-300",
  shadowNormal: "transition-shadow duration-300",
  transformNormal: "transition-transform duration-300",
  colorsNormal: "transition-colors duration-300",
} as const;

export type BorderKey = keyof typeof borders;
export type ShadowKey = keyof typeof borders.shadow;
export type RadiusKey = keyof typeof borders.radius;

export default borders;
