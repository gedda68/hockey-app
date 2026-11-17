// lib/social/crypto.ts
// Page access tokens are credentials, so they are stored encrypted (AES-256-GCM) with a key from the environment
// (SOCIAL_TOKEN_KEY: any long random string). Without the key nothing is stored.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const socialKeyConfigured = () => String(process.env.SOCIAL_TOKEN_KEY ?? "").trim().length >= 16;

const key = () => {
  const k = String(process.env.SOCIAL_TOKEN_KEY ?? "").trim();
  if (k.length < 16) throw new Error("SOCIAL_TOKEN_KEY is not set (use a long random string)");
  return createHash("sha256").update(k).digest();
};

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decryptToken(stored: string): string {
  const [iv, tag, enc] = stored.split(".").map((p) => Buffer.from(p, "base64"));
  if (!iv || !tag || !enc) throw new Error("Stored token is malformed");
  const d = createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
