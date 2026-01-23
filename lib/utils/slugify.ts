// lib/utils/slugify.ts
// Utility function to generate slug from club name

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/(^-|-$)/g, ""); // Remove leading/trailing hyphens
}

// Examples:
// "Commercial Hockey Club" → "commercial-hockey-club"
// "All Stars Hockey Club" → "all-stars-hockey-club"
// "St. Andrew's HC" → "st-andrew-s-hc"
