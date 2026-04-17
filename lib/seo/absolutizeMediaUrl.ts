/**
 * Resolve a stored image path or absolute URL for Open Graph / Twitter cards
 * relative to the request host (`metadataBase`).
 */
export function absolutizeOpenGraphUrl(
  href: string | null | undefined,
  metadataBase: URL,
): string | undefined {
  const raw = href?.trim();
  if (!raw) return undefined;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  try {
    const pathPart = raw.startsWith("/") ? raw : `/${raw.replace(/^\.?\//, "")}`;
    return new URL(pathPart, metadataBase).href;
  } catch {
    return undefined;
  }
}

/** Canonical URL for a pathname on the current request origin. */
export function canonicalFromPath(pathname: string, metadataBase: URL): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(path, metadataBase).href;
}
