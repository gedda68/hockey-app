/**
 * Port-aware local origin for development fallbacks.
 *
 * `next dev` falls back to the next free port (3001, 3002, …) when 3000 is busy,
 * and records the port it actually bound in `process.env.PORT` (Next 16
 * start-server). In the browser we read it from `window.location`. Use these
 * helpers instead of hardcoding `localhost:3000`.
 */

/** Port the app is being served on ("" when the browser is on a default port). */
export function devServerPort(): string {
  if (typeof window !== "undefined" && window.location) {
    return window.location.port;
  }
  return process.env.PORT?.trim() || "3000";
}

/** `localhost:<port>` (no scheme) for the running dev server. */
export function localDevHost(): string {
  const port = devServerPort();
  return port ? `localhost:${port}` : "localhost";
}

/** `http://localhost:<port>` for the running dev server. */
export function localDevOrigin(): string {
  return `http://${localDevHost()}`;
}

const LOCAL_HOST_RE = /^((?:[a-z0-9-]+\.)*localhost|127\.0\.0\.1)(?::\d+)?$/i;

/**
 * In development, a configured local host like `localhost:3000` (e.g. from
 * .env.local) is rewritten to the port actually in use. Non-local hosts and
 * production values are returned unchanged.
 */
export function alignLocalHostPort(hostWithOptionalPort: string): string {
  if (process.env.NODE_ENV !== "development") return hostWithOptionalPort;
  const m = LOCAL_HOST_RE.exec(hostWithOptionalPort.trim());
  if (!m) return hostWithOptionalPort;
  const port = devServerPort();
  return port ? `${m[1]}:${port}` : m[1];
}

/** Same as {@link alignLocalHostPort} for a full origin/URL such as `http://localhost:3000`. */
export function alignLocalOriginPort(url: string): string {
  if (process.env.NODE_ENV !== "development") return url;
  try {
    const u = new URL(url);
    const aligned = alignLocalHostPort(u.host);
    if (aligned === u.host) return url;
    u.host = aligned;
    return url.endsWith("/") ? u.toString() : u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}
