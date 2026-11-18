// GET /api/public/competitions/fixtures-export
//   ?seasonCompetitionId=… (one division)  or  ?season=2027 (every division of the year)
//   &round=next|week|all|<n>  &clubId=…  &teamId=…  &my=1  &format=xlsx|csv
// Published matches only, in the same order and with the same filters as the Match Day page.

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { filterMatches, getSeasonCompetitionOptions } from "@/lib/data";
import { loadFixturesMeta } from "@/lib/data/publicFixtureMeta";
import { getSession } from "@/lib/auth/session";
import { getMyTeamIdsForSession } from "@/lib/data/myFixtures";
import { EXPORT_HEADER, exportRows, resolveRound, selectMatches, slug, teamText, toCsv, type ExportInput } from "@/lib/competitions/fixtureView";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams;
    const options = await getSeasonCompetitionOptions();
    const scId = (q.get("seasonCompetitionId") ?? "").trim(), season = (q.get("season") ?? "").trim();
    const chosen = scId ? options.filter((o) => o.seasonCompetitionId === scId) : season ? options.filter((o) => o.season === season) : [];
    if (!chosen.length) return NextResponse.json({ error: "Choose a division or a season" }, { status: 400 });

    const clubId = (q.get("clubId") ?? "").trim(), teamId = (q.get("teamId") ?? "").trim(), roundChoice = q.get("round") ?? "all";
    let myTeamIds: string[] = [];
    if (q.get("my") === "1") {
      const session = await getSession();
      if (session) myTeamIds = await getMyTeamIdsForSession({ userId: session.userId, memberId: session.memberId ?? null, scopedRoles: session.scopedRoles ?? [] });
    }

    const items: ExportInput[] = [];
    let clubLabel = "";
    const now = new Date();
    for (const sc of chosen) {
      const [{ fixtures, clubLabelById }, matches] = await Promise.all([loadFixturesMeta(sc.seasonCompetitionId), filterMatches({ seasonCompetitionId: sc.seasonCompetitionId })]);
      if (clubId && clubLabelById.get(clubId)) clubLabel = String(clubLabelById.get(clubId));
      const metaById = new Map(fixtures.map((f) => [f.match.matchId, f]));
      const inScope = (matches as unknown as Record<string, unknown>[]).filter((m) => {
        const meta = metaById.get(String(m.matchId));
        if (!meta) return false;
        if (q.get("my") === "1") return Boolean((meta.homeTeamId && myTeamIds.includes(meta.homeTeamId)) || (meta.awayTeamId && myTeamIds.includes(meta.awayTeamId)));
        if (teamId) return meta.homeTeamId === teamId || meta.awayTeamId === teamId;
        if (clubId) return meta.homeClubId === clubId || meta.awayClubId === clubId;
        return true;
      });
      const rowsFor = inScope.map((m) => ({ round: m.round, dateTime: m.dateTime, status: m.status, m }));
      const picked = selectMatches(rowsFor, resolveRound(roundChoice, rowsFor, now));
      for (const { m } of picked) {
        const score = m.score as { home?: number; away?: number } | undefined;
        items.push({
          round: m.round, dateTime: m.dateTime, division: sc.competitionName ?? sc.label, home: teamText(m.homeTeam), away: teamText(m.awayTeam),
          venue: teamText(m.venue ?? m.location), status: String(m.status ?? ""), homeScore: (m.homeScore as number | null | undefined) ?? score?.home ?? null, awayScore: (m.awayScore as number | null | undefined) ?? score?.away ?? null,
        });
      }
    }
    items.sort((a, b) => new Date(String(a.dateTime)).getTime() - new Date(String(b.dateTime)).getTime() || a.division.localeCompare(b.division, undefined, { numeric: true }));

    const rows = [EXPORT_HEADER, ...exportRows(items)];
    const name = slug([chosen.length === 1 ? chosen[0].label : `${season} all divisions`, clubLabel, roundChoice === "all" ? "" : roundChoice === "next" || roundChoice === "week" ? roundChoice : `round ${roundChoice}`].filter(Boolean).join(" ")) || "fixtures";
    if (q.get("format") === "csv") {
      return new NextResponse(`﻿${toCsv(rows)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"` } });
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [8, 13, 11, 10, 14, 30, 30, 26, 11, 9].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fixtures");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${name}.xlsx"` } });
  } catch (e) {
    console.error("fixtures-export failed:", e);
    return NextResponse.json({ error: "Could not build the spreadsheet" }, { status: 500 });
  }
}
