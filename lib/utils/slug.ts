// lib/utils/slug.ts
// Generates a URL-safe slug from a name string

/**
 * Converts a name into a URL slug.
 * e.g. "Commercial Hockey Club" → "commercial-hockey-club"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-")             // collapse repeated hyphens
    .replace(/^-|-$/g, "");          // strip leading/trailing hyphens
}
