/**
 * GET /api/export/role-requests
 *
 * Returns all role requests as a flat JSON array for CSV/PDF export.
 * Admin-scoped: same visibility rules as /api/admin/role-requests.
 *
 * Query params: status?, search?
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

const EXPORT_LIMIT = 5000;

const ALLOWED_ROLES = [
  "super-admin", "association-admin", "assoc-registrar",
  "club-admin", "registrar",
];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const query: Record<string, unknown> = {};

  // Scope enforcement
  if (session.role === "super-admin") {
    // no restriction
  } else if (["association-admin", "assoc-registrar"].includes(session.role) && session.associationId) {
    // Clubs under this association + the association itself
    const clubs = await db
      .collection("clubs")
      .find({ parentAssociationId: session.associationId }, { projection: { id: 1 } })
      .toArray();
    const clubIds = clubs.map((c) => c.id).filter(Boolean);
    query.$or = [
      { scopeId: session.associationId },
      { scopeId: { $in: clubIds } },
    ];
  } else if (["club-admin", "registrar"].includes(session.role) && session.clubId) {
    query.scopeId = session.clubId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (status) query.status = status;

  if (search) {
    const s = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { memberName:    { $regex: s, $options: "i" } },
      { requestedRole: { $regex: s, $options: "i" } },
      { scopeName:     { $regex: s, $options: "i" } },
    ];
  }

  const requests = await db
    .collection("role_requests")
    .find(query)
    .sort({ requestedAt: -1 })
    .limit(EXPORT_LIMIT)
    .project({
      requestId:       1,
      memberName:      1,
      requestedRole:   1,
      scopeType:       1,
      scopeName:       1,
      seasonYear:      1,
      status:          1,
      requiresFee:     1,
      feeAmountCents:  1,
      feePaid:         1,
      paymentId:       1,
      paymentDate:     1,
      requestedAt:     1,
      requestedByName: 1,
      reviewedByName:  1,
      reviewedAt:      1,
      reviewNotes:     1,
      "feeWaiver.grantedByName": 1,
      "feeWaiver.reason":        1,
    })
    .toArray();

  function fmtDate(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-AU", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }

  const rows = requests.map((r) => ({
    requestId:      r.requestId ?? "",
    memberName:     r.memberName ?? "",
    requestedRole:  r.requestedRole ?? "",
    scopeName:      r.scopeName ?? "",
    seasonYear:     r.seasonYear ?? "",
    status:         r.status ?? "",
    requiresFee:    r.requiresFee ? "Yes" : "No",
    feeAmount:      r.feeAmountCents ? `$${(r.feeAmountCents / 100).toFixed(2)}` : "",
    feePaid:        r.feePaid ? "Yes" : "No",
    paymentRef:     r.paymentId ?? "",
    paymentDate:    fmtDate(r.paymentDate),
    feeWaivedBy:    r.feeWaiver?.grantedByName ?? "",
    feeWaiverReason: r.feeWaiver?.reason ?? "",
    requestedAt:    fmtDate(r.requestedAt),
    requestedBy:    r.requestedByName ?? "",
    reviewedBy:     r.reviewedByName ?? "",
    reviewedAt:     fmtDate(r.reviewedAt),
    reviewNotes:    r.reviewNotes ?? "",
  }));

  return NextResponse.json({ rows, total: rows.length });
}
