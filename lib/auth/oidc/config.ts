/**
 * OpenID Connect (Azure AD / Entra, Okta, Keycloak, etc.)
 *
 * Env:
 *   OIDC_ISSUER          — e.g. https://login.microsoftonline.com/{tenant}/v2.0
 *   OIDC_CLIENT_ID
 *   OIDC_CLIENT_SECRET
 *   OIDC_REDIRECT_URI    — optional; default {origin}/api/auth/sso/callback
 *   OIDC_SCOPE           — optional; default "openid profile email"
 *   OIDC_AUDIENCE        — optional; if set, passed as audience for id_token verify (rare)
 *
 * Behaviour:
 *   SSO_AUTO_REDIRECT=true — middleware sends unauthenticated users to /api/auth/sso (IdP) instead of /login
 *   NEXT_PUBLIC_SSO_BUTTON=true — show “Continue with organisation account” on /login
 */

export function isOidcConfigured(): boolean {
  return Boolean(
    process.env.OIDC_ISSUER?.trim() &&
      process.env.OIDC_CLIENT_ID?.trim() &&
      process.env.OIDC_CLIENT_SECRET?.trim(),
  );
}

/** Only when full OIDC is configured (including secret) — avoids redirecting to a broken /api/auth/sso. */
export function ssoAutoRedirectFromMiddleware(): boolean {
  return process.env.SSO_AUTO_REDIRECT === "true" && isOidcConfigured();
}

export function issuerBase(): string {
  return process.env.OIDC_ISSUER!.trim().replace(/\/$/, "");
}

export function getOidcRedirectUri(requestUrl: string): string {
  const explicit = process.env.OIDC_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const u = new URL(requestUrl);
  return `${u.origin}/api/auth/sso/callback`;
}

export function oidcScope(): string {
  return process.env.OIDC_SCOPE?.trim() || "openid profile email";
}
