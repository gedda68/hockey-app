/**
 * Constants Index
 *
 * Central export file for all application constants.
 * Import from here to keep imports clean and organized.
 *
 * @example
 * import { ROUTES, APP_CONFIG, MESSAGES } from '@/lib/constants';
 */

// Routes
export * from "./routes";
export { ROUTES, NAV_GROUPS, BREADCRUMBS, PAGE_METADATA } from "./routes";
export type { RouteKey } from "./routes";

// Configuration
export * from "./config";
export {
  APP_CONFIG,
  FILTER_OPTIONS,
  ZONE_CONFIG,
  VALIDATION,
  FEATURES,
} from "./config";

// Messages
export * from "./messages";
export { MESSAGES, getMessage } from "./messages";
