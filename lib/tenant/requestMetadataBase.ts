import { headers } from "next/headers";

/**
 * Request-scoped base URL for metadata (Open Graph, icons, etc.).
 * Required so relative `/icons/...` paths resolve to the same host as the tab
 * (e.g. `http://rha.localhost:3000`, not a fallback `localhost` origin).
 */
export async function requestMetadataBase(): Promise<URL> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headersList.get("host") ||
    "localhost:3000";
  const forwarded = headersList
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const isLocalDevHost =
    /^([^.]+\.)?localhost(?::\d+)?$/i.test(host) ||
    /^localhost(?::\d+)?$/i.test(host) ||
    /^127\.0\.0\.1(?::\d+)?$/i.test(host) ||
    /^\[::1\](?::\d+)?$/i.test(host);
  const protocol =
    forwarded === "https" || forwarded === "http"
      ? forwarded
      : isLocalDevHost
        ? "http"
        : process.env.VERCEL
          ? "https"
          : "http";
  return new URL(`${protocol}://${host}`);
}
