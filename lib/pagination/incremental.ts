/** Pure helpers for "show N more" lists (infinite scroll with a button fallback). */

export const DEFAULT_PAGE_SIZE = 12;

/** A usable page size: a positive integer, otherwise the default. */
export function sanitizePageSize(size: number | undefined): number {
  return Number.isFinite(size) && (size as number) >= 1
    ? Math.floor(size as number)
    : DEFAULT_PAGE_SIZE;
}

/** How many items to show after one more "page", never beyond the total. */
export function nextVisibleCount(current: number, total: number, pageSize: number): number {
  const size = sanitizePageSize(pageSize);
  const safeTotal = Math.max(0, Math.floor(total) || 0);
  return Math.min(Math.max(0, Math.floor(current) || 0) + size, safeTotal);
}

/** The count actually rendered: at least one page, never more than the list holds. */
export function clampVisible(count: number, total: number, pageSize: number): number {
  const size = sanitizePageSize(pageSize);
  const safeTotal = Math.max(0, Math.floor(total) || 0);
  return Math.min(Math.max(count, size), safeTotal);
}
