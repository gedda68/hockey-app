/**
 * Web Push (VAPID) for B3 fan alerts.
 * Generate keys: `npx web-push generate-vapid-keys`
 * Env:
 *   NEXT_PUBLIC_VAPID_PUBLIC_KEY — URL-safe public key (client + server)
 *   VAPID_PRIVATE_KEY — private key (server only)
 *   WEB_PUSH_CONTACT — mailto: contact for VAPID (default mailto:noreply@localhost)
 */

export type VapidKeys = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function getVapidKeys(): VapidKeys | null {
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY ?? "").trim();
  const subject = String(process.env.WEB_PUSH_CONTACT ?? "mailto:noreply@localhost").trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}
