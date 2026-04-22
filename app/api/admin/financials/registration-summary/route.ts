/**
 * GET /api/admin/financials/registration-summary
 * Epic H3: aggregate registration payments by club / association line items, GST component, CSV export.
 *
 * Query: seasonYear?, status?, clubId?, format=json|csv
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requireAnyPermission } from "@/lib/auth/middleware";
import type { UserSession } from "@/lib/db/schemas/user";
import {
  aggregateRegistrationPayments,
  buildScopedClubFilter,
  gstComponentFromLine,
} from "@/lib/financials/registrationPaymentSummary";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function allowedClubIdsFromFilter(
  filter: Record<string, unknown>,
): string[] | null {
  const cid = filter.clubId;
  if (cid == null) return null;
  if (typeof cid === "string") {
    if (cid === "__none__") return [];
    return [cid];
  }
  if (typeof cid === "object" && cid !== null && "$in" in cid) {
    const arr = (cid as { $in: string[] }).$in;
    return Array.isArray(arr) ? arr : [];
  }
  return [];
}

function assertClubAccess(
  user: UserSession,
  filter: Record<string, unknown>,
  requestedClubId: string | null,
): NextResponse | null {
  if (!requestedClubId) return null;
  if (user.role === "super-admin") return null;
  const allowed = allowedClubIdsFromFilter(filter);
  if (allowed === null) return null;
  if (!allowed.includes(requestedClubId)) {
    return NextResponse.json({ error: "Forbidden for this club" }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireAnyPermission(request, [
    "reports.financial",
    "registration.payments",
    "registration.manage",
    "registration.approve",
  ]);
  if (response) return response;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const seasonYear = searchParams.get("seasonYear") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const clubIdParam = searchParams.get("clubId");
    const format = searchParams.get("format") ?? "json";

    const client = await clientPromise;
    const db = client.db();

    const scopeFilter = await buildScopedClubFilter(db, session);
    const forbidden = assertClubAccess(user, scopeFilter, clubIdParam);
    if (forbidden) return forbidden;

    const query: Record<string, unknown> = { ...scopeFilter };
    if (seasonYear) query.seasonYear = seasonYear;
    if (status) query.status = status;
    if (clubIdParam) query.clubId = clubIdParam;

    const payments = await db
      .collection("payments")
      .find(query)
      .project({
        paymentId: 1,
        memberId: 1,
        clubId: 1,
        seasonYear: 1,
        status: 1,
        amount: 1,
        lineItems: 1,
        paidDate: 1,
        createdAt: 1,
      })
      .limit(5000)
      .toArray();

    if (format === "csv") {
      const header = [
        "paymentId",
        "memberId",
        "clubId",
        "seasonYear",
        "paymentStatus",
        "paymentAmount",
        "lineType",
        "lineName",
        "lineAmount",
        "gstIncluded",
        "gstComponent",
        "gstAmountCents",
        "associationId",
        "competitionId",
        "tournamentId",
      ].join(",");

      const rows: string[] = [header];
      for (const pay of payments) {
        const p = pay as Record<string, unknown>;
        const items = (p.lineItems as Array<Record<string, unknown>>) ?? [];
        if (items.length === 0) {
          rows.push(
            [
              csvEscape(String(p.paymentId ?? "")),
              csvEscape(String(p.memberId ?? "")),
              csvEscape(String(p.clubId ?? "")),
              csvEscape(String(p.seasonYear ?? "")),
              csvEscape(String(p.status ?? "")),
              csvEscape(String(p.amount ?? "")),
              // lineType, lineName, lineAmount, gstIncluded, gstComponent, gstAmountCents
              "", "", "", "", "", "",
              // associationId, competitionId, tournamentId
              "", "", "",
            ].join(","),
          );
          continue;
        }
        for (const line of items) {
          const amt            = (line.amount as number) ?? 0;
          const gi             = (line.gstIncluded as boolean) ?? true;
          const gst            = gstComponentFromLine(amt, gi);
          const gstCentsCol    = Math.round(gst * 100);
          rows.push(
            [
              csvEscape(String(p.paymentId ?? "")),
              csvEscape(String(p.memberId ?? "")),
              csvEscape(String(p.clubId ?? "")),
              csvEscape(String(p.seasonYear ?? "")),
              csvEscape(String(p.status ?? "")),
              csvEscape(String(p.amount ?? "")),
              csvEscape(String(line.type ?? "")),
              csvEscape(String(line.name ?? "")),
              csvEscape(String(amt)),
              csvEscape(String(gi)),
              csvEscape(String(gst)),
              csvEscape(String(gstCentsCol)),
              csvEscape(String(line.associationId ?? "")),
              csvEscape(String(line.competitionId ?? "")),
              csvEscape(String(line.tournamentId ?? "")),
            ].join(","),
          );
        }
      }

      return new NextResponse(rows.join("\r\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="registration-payments-summary.csv"',
        },
      });
    }

    const summary = aggregateRegistrationPayments(
      payments as Parameters<typeof aggregateRegistrationPayments>[0],
      { seasonYear },
    );
    summary.scope.status = status;

    return NextResponse.json({
      summary,
      truncated: payments.length >= 5000,
    });
  } catch (error: unknown) {
    console.error("GET registration-summary error:", error);
    return NextResponse.json(
      {
        error: "Failed to build summary",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
