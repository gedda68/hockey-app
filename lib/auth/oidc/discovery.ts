import { issuerBase } from "@/lib/auth/oidc/config";

export type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
};

let cache: { doc: OidcDiscovery; at: number } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function fetchOidcDiscovery(): Promise<OidcDiscovery> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.doc;

  const url = `${issuerBase()}/.well-known/openid-configuration`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status} ${url}`);
  }
  const doc = (await res.json()) as OidcDiscovery;
  if (
    !doc.authorization_endpoint ||
    !doc.token_endpoint ||
    !doc.jwks_uri ||
    !doc.issuer
  ) {
    throw new Error("OIDC discovery document missing required fields");
  }
  cache = { doc, at: now };
  return doc;
}
