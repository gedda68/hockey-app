import { SignJWT, jwtVerify } from "jose";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET is required for OIDC state");

const key = new TextEncoder().encode(SECRET);

export type OidcStatePayload = {
  kind: "oidc-sso";
  callbackUrl: string;
  nonce: string;
};

export async function signOidcState(
  callbackUrl: string,
  nonce: string,
): Promise<string> {
  return await new SignJWT({
    kind: "oidc-sso",
    callbackUrl,
    nonce,
  } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key);
}

export async function verifyOidcState(
  token: string,
): Promise<OidcStatePayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.kind !== "oidc-sso" || typeof payload.nonce !== "string") {
      return null;
    }
    const callbackUrl =
      typeof payload.callbackUrl === "string" ? payload.callbackUrl : "/";
    return {
      kind: "oidc-sso",
      callbackUrl,
      nonce: payload.nonce,
    };
  } catch {
    return null;
  }
}

export function randomNonce(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
