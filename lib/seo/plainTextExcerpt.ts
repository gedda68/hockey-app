/** Strip tags and collapse whitespace for meta descriptions (not for security). */
export function plainTextExcerpt(
  html: string | undefined,
  maxLen = 160,
): string | undefined {
  if (!html?.trim()) return undefined;
  const t = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return undefined;
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}
