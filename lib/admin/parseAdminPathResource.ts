/**
 * Detects club / association resource keys from `/admin/clubs/...` and
 * `/admin/associations/...` paths for scope UX (not security — server APIs enforce access).
 */

const CLUB_LITERAL_SEGMENTS = new Set(["new", "selection-policy"]);

const ASSOCIATION_LITERAL_SEGMENTS = new Set([
  "new",
  "fees",
  "hierarchy",
  "positions",
  "selection-policy",
]);

export type ParsedAdminPathResource =
  | { kind: "club"; key: string }
  | { kind: "association"; id: string };

export function parseAdminPathResource(
  pathname: string | null,
): ParsedAdminPathResource | null {
  if (!pathname?.startsWith("/admin")) return null;

  const clubMatch = /^\/admin\/clubs\/([^/]+)/.exec(pathname);
  if (clubMatch?.[1]) {
    const key = decodeURIComponent(clubMatch[1]);
    if (!key || CLUB_LITERAL_SEGMENTS.has(key)) return null;
    return { kind: "club", key };
  }

  const assocMatch = /^\/admin\/associations\/([^/]+)/.exec(pathname);
  if (assocMatch?.[1]) {
    const id = decodeURIComponent(assocMatch[1]);
    if (!id || ASSOCIATION_LITERAL_SEGMENTS.has(id)) return null;
    return { kind: "association", id };
  }

  return null;
}
