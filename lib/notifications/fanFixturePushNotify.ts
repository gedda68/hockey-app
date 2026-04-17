import type { Db } from "mongodb";
import webpush from "web-push";
import { APP_URL } from "@/lib/email/client";
import { getVapidKeys } from "@/lib/push/vapidConfig";
import type { FanPushSubscription } from "@/lib/member/fanPreferences";

let vapidConfigured = false;

function ensureVapid(): boolean {
  const keys = getVapidKeys();
  if (!keys) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
    vapidConfigured = true;
  }
  return true;
}

export type FanFixturePushPayload = {
  title: string;
  body: string;
  url: string;
};

/**
 * Notify members who follow either team, opted into push, and have stored subscriptions.
 */
export async function sendFanFixturePushForFollowedTeams(
  db: Db,
  input: {
    homeTeamId: string;
    awayTeamId: string;
    payload: FanFixturePushPayload;
  },
): Promise<{ attempted: number; delivered: number; failed: number }> {
  if (!ensureVapid()) {
    return { attempted: 0, delivered: 0, failed: 0 };
  }

  const home = String(input.homeTeamId ?? "").trim();
  const away = String(input.awayTeamId ?? "").trim();
  const teamSet = new Set<string>();
  if (home) teamSet.add(home);
  if (away) teamSet.add(away);
  if (teamSet.size === 0) return { attempted: 0, delivered: 0, failed: 0 };

  const rows = await db
    .collection("members")
    .find(
      {
        "fanPreferences.followedTeamIds": { $in: [...teamSet] },
        "fanPreferences.notifyFixtureChangesPush": true,
      },
      { projection: { memberId: 1, fanPreferences: 1 } },
    )
    .toArray();

  const payloadStr = JSON.stringify(input.payload);
  let attempted = 0;
  let delivered = 0;
  let failed = 0;

  for (const m of rows) {
    const fp = (m as { fanPreferences?: { pushSubscriptions?: FanPushSubscription[] } }).fanPreferences;
    const subs = Array.isArray(fp?.pushSubscriptions) ? fp!.pushSubscriptions! : [];
    for (const sub of subs) {
      if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
      attempted++;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          payloadStr,
          { TTL: 60 * 60 * 12 },
        );
        delivered++;
      } catch (e: unknown) {
        failed++;
        const status = e && typeof e === "object" && "statusCode" in e ? (e as { statusCode?: number }).statusCode : undefined;
        if (status === 404 || status === 410) {
          // Expired subscription — best-effort prune
          const memberId = String((m as { memberId?: string }).memberId ?? "");
          if (memberId) {
            await db.collection("members").updateOne(
              { memberId },
              {
                $pull: {
                  "fanPreferences.pushSubscriptions": { endpoint: sub.endpoint },
                } as never,
              },
            );
          }
        }
      }
    }
  }

  if (attempted > 0 && process.env.NODE_ENV === "development") {
    console.info(
      `[fanFixturePush] attempted=${attempted} delivered=${delivered} failed=${failed} url=${APP_URL}`,
    );
  }

  return { attempted, delivered, failed };
}
