/**
 * GET /api/admin/sponsor-report?scopeType=club|association&scopeId=&from=&to=&format=json|csv|html&partner=
 * How often each sponsor's logo was shown and clicked, against the period before, for the club (or association) the
 * signed-in person runs. `format=html&partner=` is a page for one sponsor to send or print; `format=csv` opens in a spreadsheet.
 */
import { NextRequest, NextResponse } from "next/server";
import type { Permission } from "@/lib/types/roles";
import { getDatabase } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requireAnyPermission, requireResourceAccess } from "@/lib/auth/middleware";
import { resolveClubByIdOrSlug } from "@/lib/volunteerDuty/resolveClub";
import { memberBelongsToClubFilter } from "@/lib/rosters/memberClubQuery";
import { cleanRange, reportCsv } from "@/lib/sponsors/report";
import { renderSponsorPage } from "@/lib/sponsors/reportHtml";
import { sponsorReport } from "@/lib/sponsors/service";

const CLUB_PERMS: Permission[] = ["club.edit", "club.members"];
const ASSOC_PERMS: Permission[] = ["association.settings", "association.edit"];

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const q = request.nextUrl.searchParams;
    const scopeType = q.get("scopeType") === "association" ? "association" : q.get("scopeType") === "club" ? "club" : session.clubId || session.clubSlug ? "club" : "association";
    const ref = String(q.get("scopeId") || (scopeType === "club" ? session.clubId || session.clubSlug : session.associationId) || "").trim();
    if (!ref) return NextResponse.json({ error: "No club or association to report on" }, { status: 400 });

    const { response } = await requireAnyPermission(request, scopeType === "club" ? CLUB_PERMS : ASSOC_PERMS);
    if (response) return response;
    const scope = await requireResourceAccess(request, scopeType, ref);
    if (scope.response) return scope.response;

    const db = await getDatabase();
    let name = ref, ids = [ref], reach: { members: number } | null = null, color: string | undefined;
    if (scopeType === "club") {
      const club = await resolveClubByIdOrSlug(db, ref);
      if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
      const doc: any = await db.collection("clubs").findOne({ $or: [{ id: club.clubId }, { clubId: club.clubId }] }, { projection: { id: 1, slug: 1, branding: 1, primaryColor: 1 } });
      name = club.name; ids = [club.clubId, ref, doc?.id, doc?.slug];
      color = doc?.branding?.primaryColor ?? doc?.primaryColor;
      reach = { members: await db.collection("members").countDocuments(memberBelongsToClubFilter(club.clubId)) };
    } else {
      const a: any = await db.collection("associations").findOne({ associationId: ref }, { projection: { name: 1, branding: 1 } });
      if (!a) return NextResponse.json({ error: "Association not found" }, { status: 404 });
      name = String(a.name ?? ref); color = a.branding?.primaryColor;
    }

    const range = cleanRange(q.get("from"), q.get("to"));
    const report = await sponsorReport(db, scopeType, ids.filter(Boolean) as string[], range);
    const format = q.get("format");
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sponsors";
    if (format === "csv") return new NextResponse(reportCsv(report), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}-sponsors-${range.from}-to-${range.to}.csv"` } });
    if (format === "html") {
      const sponsor = report.sponsors.find((s) => s.partnerRef === q.get("partner"));
      if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
      return new NextResponse(renderSponsorPage({ orgName: name, sponsor, range, reach, color, generatedAt: new Date() }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ org: { name, type: scopeType, id: ids[0] }, reach, ...report });
  } catch (e) {
    console.error("sponsor report error:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
