import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getDatabase } from "@/lib/mongodb";
import {
  createMemberSession,
  createStaffUserSession,
} from "@/lib/auth/createAppSession";
import {
  isOidcConfigured,
  getOidcRedirectUri,
} from "@/lib/auth/oidc/config";
import { fetchOidcDiscovery } from "@/lib/auth/oidc/discovery";
import { verifyOidcState } from "@/lib/auth/oidc/state";

function loginWithSsoError(request: NextRequest, code: string) {
  const u = new URL("/login", request.url);
  u.searchParams.set("sso_error", code);
  return NextResponse.redirect(u);
}

/**
 * OIDC redirect_uri handler — exchanges code, verifies id_token, matches user by email.
 */
export async function GET(request: NextRequest) {
  if (!isOidcConfigured()) {
    return NextResponse.json({ error: "SSO not configured" }, { status: 503 });
  }

  const err = request.nextUrl.searchParams.get("error");
  const errDesc = request.nextUrl.searchParams.get("error_description");
  if (err) {
    console.warn("OIDC error from IdP:", err, errDesc);
    return loginWithSsoError(
      request,
      errDesc ? `${err}: ${errDesc}` : err,
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) {
    return loginWithSsoError(request, "missing_code_or_state");
  }

  const statePayload = await verifyOidcState(state);
  if (!statePayload) {
    return loginWithSsoError(request, "invalid_state");
  }

  let discovery;
  try {
    discovery = await fetchOidcDiscovery();
  } catch (e) {
    console.error(e);
    return loginWithSsoError(request, "discovery_failed");
  }

  const redirectUri = getOidcRedirectUri(request.url);
  const clientId = process.env.OIDC_CLIENT_ID!.trim();
  const clientSecret = process.env.OIDC_CLIENT_SECRET!.trim();

  let tokens: { id_token?: string };
  try {
    const tokenRes = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      console.error("Token exchange failed:", tokenRes.status, t);
      return loginWithSsoError(request, "token_exchange_failed");
    }
    tokens = (await tokenRes.json()) as { id_token?: string };
  } catch (e) {
    console.error(e);
    return loginWithSsoError(request, "token_network_error");
  }

  const idToken = tokens.id_token;
  if (!idToken) {
    return loginWithSsoError(request, "no_id_token");
  }

  const audience = process.env.OIDC_AUDIENCE?.trim() || clientId;
  let claims: Record<string, unknown>;
  try {
    const JWKS = createRemoteJWKSet(new URL(discovery.jwks_uri));
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: discovery.issuer,
      audience,
      clockTolerance: 120,
    });
    claims = payload as Record<string, unknown>;
  } catch (e) {
    console.error("id_token verify failed:", e);
    return loginWithSsoError(request, "invalid_id_token");
  }

  if (claims.nonce !== statePayload.nonce) {
    return loginWithSsoError(request, "nonce_mismatch");
  }

  const emailRaw =
    (typeof claims.email === "string" && claims.email) ||
    (typeof claims.preferred_username === "string" &&
    String(claims.preferred_username).includes("@")
      ? String(claims.preferred_username)
      : "");

  if (!emailRaw) {
    return loginWithSsoError(request, "no_email_in_token");
  }

  const email = emailRaw.toLowerCase().trim();
  const db = await getDatabase();

  const user = await db.collection("users").findOne({ email });
  if (user) {
    const r = await createStaffUserSession(db, user);
    if (!r.ok) {
      return loginWithSsoError(request, encodeURIComponent(r.error));
    }
    if (r.forcePasswordChange) {
      const next = statePayload.callbackUrl || "/";
      const cp = new URL("/change-password", request.url);
      cp.searchParams.set("next", next);
      cp.searchParams.set("force", "1");
      return NextResponse.redirect(cp);
    }
    const dest = statePayload.callbackUrl || "/";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  const member = await db.collection("members").findOne({
    $or: [{ email }, { "contact.email": email }],
  });
  if (member) {
    const r = await createMemberSession(db, member);
    if (!r.ok) {
      return loginWithSsoError(request, encodeURIComponent(r.error));
    }
    if (r.forcePasswordChange) {
      const next = statePayload.callbackUrl || "/";
      const cp = new URL("/change-password", request.url);
      cp.searchParams.set("next", next);
      cp.searchParams.set("force", "1");
      return NextResponse.redirect(cp);
    }
    const dest = statePayload.callbackUrl || "/";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  const u = new URL("/login", request.url);
  u.searchParams.set("sso_error", "no_matching_account");
  u.searchParams.set("hint", email);
  return NextResponse.redirect(u);
}
