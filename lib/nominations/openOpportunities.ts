// Currently-open representative nomination periods, joined to their tournament.
// Shared by the admin "available" endpoint and the member nomination options.

import type { Db } from "mongodb";
import { getEligibilityRange } from "@/types/nominations";
import type { OpenOpportunity, TournamentGender } from "@/types/tournaments";

export async function loadOpenOpportunities(db: Db, season: string, now = new Date()): Promise<OpenOpportunity[]> {
  const today = now.toISOString().split("T")[0];
  const periods = await db
    .collection("rep_nomination_periods")
    .find({ startDate: { $lte: today }, endDate: { $gte: today }, ...(season ? { season } : {}) })
    .toArray();

  const out: OpenOpportunity[] = [];
  for (const period of periods) {
    const end = new Date(period.endDate + "T00:00:00");
    const t0 = new Date(today + "T00:00:00");
    const daysRemaining = Math.max(0, Math.round((end.getTime() - t0.getTime()) / 86_400_000));
    const tournament = await db.collection("rep_tournaments").findOne({ season: period.season, ageGroup: period.ageGroup });
    out.push({
      ageGroup: period.ageGroup,
      season: period.season,
      tournamentId: tournament?.tournamentId ?? period.linkedTournamentId ?? "",
      tournamentTitle: tournament?.title ?? "TBA",
      tournamentGender: (tournament?.gender as TournamentGender) ?? "mixed",
      tournamentLocation: tournament?.location ?? "",
      tournamentStartDate: tournament?.startDate ?? "",
      tournamentEndDate: tournament?.endDate ?? "",
      nominationPeriodStart: period.startDate,
      nominationPeriodEnd: period.endDate,
      daysRemaining,
      nominationFee: tournament?.nominationFee ?? 0,
      eligibilityRange: getEligibilityRange(period.ageGroup) ?? {
        minAge: 0, maxAge: null, divisionType: "opens", description: period.ageGroup,
      },
    });
  }
  out.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return out;
}
