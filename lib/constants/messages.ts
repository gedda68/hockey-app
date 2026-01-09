/**
 * UI Messages & Text
 *
 * Centralized user-facing messages for consistency.
 * Easy to update and translate in the future.
 */

export const MESSAGES = {
  // Loading States
  LOADING: {
    PAGE: "Loading page...",
    MATCHES: "Loading matches...",
    STANDINGS: "Loading standings...",
    STATISTICS: "Loading statistics...",
    DATA: "Loading data...",
  },

  // Empty States
  EMPTY: {
    MATCHES: "No matches available yet",
    MATCHES_DESC: "Check back soon for match results!",

    UPCOMING: "No upcoming fixtures",
    UPCOMING_DESC: "Check back soon for the fixture list!",

    RESULTS: "No results available yet",
    RESULTS_DESC: "Check back after matches have been played!",

    STANDINGS: "No standings available",
    STANDINGS_DESC: "Standings will appear once matches have been played.",

    STATISTICS: "No statistics available",
    STATISTICS_DESC:
      "Statistics will be generated after matches are completed.",

    SEARCH: "No results found",
    SEARCH_DESC: "Try adjusting your search or filters.",

    CLUBS: "No clubs found",
    EVENTS: "No events scheduled",
  },

  // Error States
  ERROR: {
    GENERIC: "Something went wrong",
    GENERIC_DESC: "We apologize for the inconvenience. Please try again.",

    LOAD_FAILED: "Failed to load content",
    LOAD_FAILED_DESC: "Unable to load the requested data. Please try again.",

    NOT_FOUND: "Page not found",
    NOT_FOUND_DESC: "The page you're looking for doesn't exist.",

    NETWORK: "Network error",
    NETWORK_DESC: "Please check your internet connection and try again.",

    SERVER: "Server error",
    SERVER_DESC: "Our servers are experiencing issues. Please try again later.",
  },

  // Success Messages
  SUCCESS: {
    SAVED: "Saved successfully",
    UPDATED: "Updated successfully",
    DELETED: "Deleted successfully",
    SUBMITTED: "Submitted successfully",
    COPIED: "Copied to clipboard",
  },

  // Confirmation Messages
  CONFIRM: {
    DELETE: "Are you sure you want to delete this?",
    LEAVE: "Are you sure you want to leave? Unsaved changes will be lost.",
    RESET: "Are you sure you want to reset all filters?",
  },

  // Form Validation
  VALIDATION: {
    REQUIRED: "This field is required",
    EMAIL_INVALID: "Please enter a valid email address",
    PHONE_INVALID: "Please enter a valid phone number",
    MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
    MAX_LENGTH: (max: number) => `Must be no more than ${max} characters`,
    NUMBER_ONLY: "Please enter numbers only",
  },

  // Filter Messages
  FILTERS: {
    ALL: "All",
    RESET: "Reset Filters",
    APPLY: "Apply Filters",
    CLEAR: "Clear Filters",
  },

  // Navigation
  NAV: {
    BACK_TO_DASHBOARD: "Back to Dashboard",
    BACK_TO_HOME: "Back to Home",
    GO_HOME: "Go Home",
    VIEW_ALL: "View All",
    LEARN_MORE: "Learn More",
  },

  // Actions
  ACTIONS: {
    SAVE: "Save",
    CANCEL: "Cancel",
    DELETE: "Delete",
    EDIT: "Edit",
    CREATE: "Create",
    UPDATE: "Update",
    SUBMIT: "Submit",
    CLOSE: "Close",
    RETRY: "Try Again",
    REFRESH: "Refresh",
    EXPORT: "Export",
    IMPORT: "Import",
    DOWNLOAD: "Download",
    UPLOAD: "Upload",
    SEARCH: "Search",
    FILTER: "Filter",
    SORT: "Sort",
  },

  // Time Related
  TIME: {
    TODAY: "Today",
    TOMORROW: "Tomorrow",
    YESTERDAY: "Yesterday",
    THIS_WEEK: "This Week",
    LAST_WEEK: "Last Week",
    THIS_MONTH: "This Month",
    LAST_MONTH: "Last Month",
  },

  // Match Related
  MATCH: {
    VS: "vs",
    HOME: "Home",
    AWAY: "Away",
    POSTPONED: "Postponed",
    CANCELLED: "Cancelled",
    LIVE: "Live",
    FINAL: "Final",
    FULL_TIME: "Full Time",
    HALF_TIME: "Half Time",
  },

  // Statistics Related
  STATS: {
    GOALS: "Goals",
    ASSISTS: "Assists",
    POINTS: "Points",
    MATCHES: "Matches",
    WINS: "Wins",
    DRAWS: "Draws",
    LOSSES: "Losses",
    CLEAN_SHEETS: "Clean Sheets",
    GOALS_FOR: "Goals For",
    GOALS_AGAINST: "Goals Against",
    GOAL_DIFFERENCE: "Goal Difference",
  },

  // Accessibility
  A11Y: {
    SKIP_TO_CONTENT: "Skip to main content",
    OPEN_MENU: "Open menu",
    CLOSE_MENU: "Close menu",
    PREVIOUS: "Previous",
    NEXT: "Next",
    LOADING: "Loading",
    SEARCH: "Search",
    SORT_BY: "Sort by",
    FILTER_BY: "Filter by",
  },
} as const;

// Helper function to get nested message
export function getMessage(path: string, ...args: any[]): string {
  const keys = path.split(".");
  let value: any = MESSAGES;

  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Message not found: ${path}`);
      return path;
    }
  }

  // If it's a function, call it with args
  if (typeof value === "function") {
    return value(...args);
  }

  return value as string;
}

// Shorthand helper
export const msg = getMessage;
