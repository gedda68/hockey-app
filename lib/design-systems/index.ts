/**
 * Design System Index
 *
 * Central export file for all design system constants.
 * Import design tokens from here for consistent styling.
 *
 * @example
 * import { colors, typography, spacing, borders } from '@/lib/design-system';
 *
 * @example
 * // Or import specific modules
 * import { typography } from '@/lib/design-system';
 */

// Core design tokens
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./borders";

// Named exports for convenience
export { colors, getColor, tailwindColors } from "./colors";
export type { BrandColor, NeutralColor, ZoneColor, StatColor } from "./colors";

export {
  typography,
  fontWeight,
  tracking,
  leading,
  textTransform,
  fontStyle,
} from "./typography";
export type { TypographyKey } from "./typography";

export { spacing, responsiveSpacing, container } from "./spacing";
export type { SpacingKey } from "./spacing";

export { borders, borderCombinations, transitions } from "./borders";
export type { BorderKey, ShadowKey, RadiusKey } from "./borders";

// Re-export defaults
import colors from "./colors";
import typography from "./typography";
import spacing from "./spacing";
import borders from "./borders";

export default {
  colors,
  typography,
  spacing,
  borders,
};
