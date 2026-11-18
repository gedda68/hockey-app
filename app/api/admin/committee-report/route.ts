// GET /api/admin/committee-report?scope=club|association|global&scopeId=&season=2026[&format=csv]
// Registration trends, retention, participation by age and gender, officials and schools.

import { NextRequest, NextResponse } from "next/server";
import { areaGuard } from "@/lib/access/enforce";
import clientPromise from "@/lib/mongodb";
import { requireAnalyticsAccess } from "@/lib/auth/analyticsScope";
import { loadCommitteeReport } from "@/lib/reports/service";
import { committeeCsv } from "@/lib/reports/committee";

export async function GET(request: NextRequest) {
  const denied = await areaGuard("reports", "GET");
  if (denied) return denied;
  const auth = await requireAnalyticsAccess(request);
  if (auth.response) return auth.response;
  try {
    const sp = request.nextUrl.searchParams;
    const scope = (sp.get("scope") || "global") as "club" | "association" | "global";
    const scopeId = sp.get("scopeId");
    const season = /^\d{4}$/.test(sp.get("season") ?? "") ? sp.get("season")! : String(new Date().getFullYear());
    const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
    const report = await loadCommitteeReport(db, { scope, scopeId }, season);
    if (sp.get("format") === "csv") {
      const title = scope === "global" ? "All of hockey" : `${scope} ${scopeId}`;
      return new NextResponse(committeeCsv(report, title), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="committee-report-${season}.csv"` } });
    }
    return NextResponse.json(report);
  } catch (e) {
    console.error("committee report error:", e);
    return NextResponse.json({ error: "Could not build the report" }, { status: 500 });
  }
}
