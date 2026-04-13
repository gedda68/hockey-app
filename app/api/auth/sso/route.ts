import { NextRequest, NextResponse } from "next/server";
import {
  isOidcConfigured,
  getOidcRedirectUri,
  oidcScope,
} from "@/lib/auth/oidc/config";
import { fetchOidcDiscovery } from "@/lib/auth/oidc/discovery";
import { randomNonce, signOidcState } from "@/lib/auth/oidc/state";
import { sanitizeCallbackUrl } from "@/lib/auth/oidc/sanitizeCallback";

/**
 * Start OIDC login — redirects browser to the identity provider.
 * Query: callbackUrl (optional) — where to send the user after successful SSO.
 */
export async function GET(request: NextRequest) {
  if (!isOidcConfigured()) {
    return NextResponse.json(
      { error: "OIDC SSO is not configured (set OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET)" },
      { status: 503 },
    );
  }

  try {
    const discovery = await fetchOidcDiscovery();
    const callbackUrl = sanitizeCallbackUrl(
      request,
      request.nextUrl.searchParams.get("callbackUrl"),
    );
    const nonce = randomNonce();
    const state = await signOidcState(callbackUrl, nonce);
    const redirectUri = getOidcRedirectUri(request.url);
    const clientId = process.env.OIDC_CLIENT_ID!.trim();

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: oidcScope(),
      state,
      nonce,
    });

    const dest = `${discovery.authorization_endpoint}?${params.toString()}`;
    return NextResponse.redirect(dest);
  } catch (e: unknown) {
    console.error("SSO authorize error:", e);
    return NextResponse.json(
      { error: "Failed to start SSO" },
      { status: 500 },
    );
  }
}
