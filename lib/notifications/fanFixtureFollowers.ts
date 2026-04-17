import type { Db } from "mongodb";
import { memberPrimaryEmail } from "@/lib/member/fanPreferences";

/**
 * Members who follow either team and opted into fixture-change email (B3 / Epic J1 pattern).
 */
export async function collectFanFixtureChangeEmails(
  db: Db,
  input: { homeTeamId: string; awayTeamId: string },
): Promise<string[]> {
  const home = String(input.homeTeamId ?? "").trim();
  const away = String(input.awayTeamId ?? "").trim();
  const teamSet = new Set<string>();
  if (home) teamSet.add(home);
  if (away) teamSet.add(away);
  if (teamSet.size === 0) return [];

  const rows = await db
    .collection("members")
    .find(
      {
        "fanPreferences.followedTeamIds": { $in: [...teamSet] },
        "fanPreferences.notifyFixtureChangesEmail": true,
      },
      { projection: { contact: 1 } },
    )
    .toArray();

  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of rows) {
    const email = memberPrimaryEmail(m as unknown as Record<string, unknown>);
    if (!email) continue;
    const k = email.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(email);
  }
  return out;
}
