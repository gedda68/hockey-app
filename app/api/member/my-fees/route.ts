/**
 * GET /api/member/my-fees
 *
 * Returns a structured, hierarchical view of all fees for the currently
 * authenticated member, grouped by season year and entity level.
 *
 * Sources aggregated:
 *   - payments collection  (registration fees — line items with association/club attribution)
 *   - role_requests        (role assignment fees — inline on the request document)
 *
 * Query params:
 *   year?  — filter to a specific season year (e.g. "2025"). Defaults to current year.
 *            Pass "all" to return every year grouped.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MyFeeItem {
  itemId: string;
  sourceType: "payment" | "role-request";
  sourceId: string; // paymentId or requestId
  name: string;
  description?: string;
  amountCents: number;
  status: "paid" | "outstanding" | "waived" | "pending-approval" | "rejected";
  paidDate?: string;
  paymentId?: string;
  waiver?: { reason: string; grantedAt: string; grantedByName: string };
}

export interface MyFeeSection {
  sectionId: string;
  entityType: "association" | "club" | "insurance" | "role" | "tournament";
  entityId?: string;
  entityName: string;
  /** Lower = higher in hierarchy. Associations walk from national downward. */
  sortOrder: number;
  items: MyFeeItem[];
  /** Cents */
  totalCents: number;
  paidCents: number;
  outstandingCents: number;
  waivedCents: number;
}

export interface MyFeesYear {
  year: string;
  sections: MyFeeSection[];
  summary: {
    totalCents: number;
    paidCents: number;
    outstandingCents: number;
    waivedCents: number;
  };
}

export interface MyFeesResponse {
  memberId: string;
  availableYears: string[];
  /** When year param is "all", multiple entries. Otherwise single entry. */
  years: MyFeesYear[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

function itemStatus(
  paymentStatus: string
): MyFeeItem["status"] {
  if (paymentStatus === "paid") return "paid";
  if (paymentStatus === "refunded" || paymentStatus === "cancelled") return "rejected";
  return "outstanding";
}

function roleRequestStatus(
  rr: Record<string, unknown>
): MyFeeItem["status"] {
  const status = rr.status as string;
  if (status === "approved") return "paid"; // fee was paid or waived; role is active
  if (status === "rejected" || status === "withdrawn") return "rejected";
  if (status === "awaiting_approval") return "pending-approval";
  if (rr.feeWaiver) return "waived";
  return "outstanding"; // pending_payment
}

/** Build the summary totals for a year. */
function buildSummary(sections: MyFeeSection[]): MyFeesYear["summary"] {
  return sections.reduce(
    (acc, s) => ({
      totalCents: acc.totalCents + s.totalCents,
      paidCents: acc.paidCents + s.paidCents,
      outstandingCents: acc.outstandingCents + s.outstandingCents,
      waivedCents: acc.waivedCents + s.waivedCents,
    }),
    { totalCents: 0, paidCents: 0, outstandingCents: 0, waivedCents: 0 }
  );
}

/** Return the year string from a date-ish value (Date | string | undefined). */
function yearOf(value: unknown): string {
  if (!value) return new Date().getFullYear().toString();
  const d = value instanceof Date ? value : new Date(value as string);
  return isNaN(d.getTime()) ? new Date().getFullYear().toString() : d.getFullYear().toString();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = session.memberId;
  if (!memberId) {
    // User account with no linked member — return empty state gracefully
    return NextResponse.json<MyFeesResponse>({
      memberId: session.userId ?? "",
      availableYears: [],
      years: [],
    });
  }

  const yearParam = req.nextUrl.searchParams.get("year") ?? new Date().getFullYear().toString();

  const client = await clientPromise;
  const db = client.db("hockey-app");

  // ── 1. Fetch payments for this member ─────────────────────────────────────
  const payments = await db
    .collection("payments")
    .find({ memberId })
    .sort({ createdAt: -1 })
    .toArray();

  // ── 2. Fetch role-request fees for this member ────────────────────────────
  const roleRequests = await db
    .collection("role_requests")
    .find({ memberId, requiresFee: true })
    .sort({ createdAt: -1 })
    .toArray();

  // ── 3. Build entity name lookup (associations + clubs) ─────────────────────
  const assocIds = new Set<string>();
  const clubIds = new Set<string>();

  for (const pay of payments) {
    for (const item of (pay.lineItems ?? []) as Array<Record<string, unknown>>) {
      if (item.associationId) assocIds.add(item.associationId as string);
      if (item.clubId) clubIds.add(item.clubId as string);
    }
  }
  for (const rr of roleRequests) {
    if (rr.scopeType === "association" && rr.scopeId) assocIds.add(rr.scopeId as string);
    if (rr.scopeType === "club" && rr.scopeId) clubIds.add(rr.scopeId as string);
  }

  const [assocDocs, clubDocs] = await Promise.all([
    assocIds.size
      ? db.collection("associations").find({ associationId: { $in: [...assocIds] } }).toArray()
      : Promise.resolve([]),
    clubIds.size
      ? db.collection("clubs").find({ id: { $in: [...clubIds] } }).toArray()
      : Promise.resolve([]),
  ]);

  const assocMap = new Map(assocDocs.map((a) => [a.associationId as string, a]));
  const clubMap  = new Map(clubDocs.map((c) => [c.id as string, c]));

  // ── 4. Build association sort order from hierarchy depth ───────────────────
  /** Walk parentAssociationId chain; root associations get sortOrder 0. */
  function assocSortOrder(associationId: string, depth = 0): number {
    if (depth > 10) return depth; // guard
    const doc = assocMap.get(associationId);
    if (!doc || !doc.parentAssociationId) return depth;
    return assocSortOrder(doc.parentAssociationId as string, depth + 1);
  }

  // ── 5. Group all data by year ──────────────────────────────────────────────
  // Map: year → sectionId → MyFeeSection
  const yearMap = new Map<string, Map<string, MyFeeSection>>();

  function getOrCreateSection(
    year: string,
    sectionId: string,
    defaults: Omit<MyFeeSection, "items" | "totalCents" | "paidCents" | "outstandingCents" | "waivedCents">
  ): MyFeeSection {
    if (!yearMap.has(year)) yearMap.set(year, new Map());
    const sections = yearMap.get(year)!;
    if (!sections.has(sectionId)) {
      sections.set(sectionId, {
        ...defaults,
        items: [],
        totalCents: 0,
        paidCents: 0,
        outstandingCents: 0,
        waivedCents: 0,
      });
    }
    return sections.get(sectionId)!;
  }

  function addItem(section: MyFeeSection, item: MyFeeItem) {
    section.items.push(item);
    section.totalCents += item.amountCents;
    if (item.status === "paid") section.paidCents += item.amountCents;
    else if (item.status === "waived") section.waivedCents += item.amountCents;
    else if (item.status === "outstanding" || item.status === "pending-approval") {
      section.outstandingCents += item.amountCents;
    }
  }

  // ── 5a. Process payment line items ────────────────────────────────────────
  for (const pay of payments) {
    const year = (pay.seasonYear as string | undefined) ?? yearOf(pay.createdAt);
    const payStatus = itemStatus(pay.status as string);

    for (const rawItem of (pay.lineItems ?? []) as Array<Record<string, unknown>>) {
      const amountCents = dollarsToCents((rawItem.amount as number) ?? 0);
      const feeItemStatus = payStatus; // all line items share the payment status

      if (rawItem.type === "association" && rawItem.associationId) {
        const assocId = rawItem.associationId as string;
        const assoc = assocMap.get(assocId);
        const section = getOrCreateSection(year, `assoc-${assocId}`, {
          sectionId: `assoc-${assocId}`,
          entityType: "association",
          entityId: assocId,
          entityName: assoc?.name ?? rawItem.associationName as string ?? assocId,
          sortOrder: assocSortOrder(assocId),
        });
        addItem(section, {
          itemId: `${pay.paymentId}-${rawItem.itemId ?? rawItem.feeId ?? rawItem.name}`,
          sourceType: "payment",
          sourceId: pay.paymentId as string,
          name: rawItem.name as string,
          description: rawItem.description as string | undefined,
          amountCents,
          status: feeItemStatus,
          paidDate: pay.paidDate ? new Date(pay.paidDate as string).toISOString() : undefined,
          paymentId: pay.paymentId as string,
        });
      } else if (rawItem.type === "club" && rawItem.clubId) {
        const clubId = rawItem.clubId as string;
        const club = clubMap.get(clubId);
        const section = getOrCreateSection(year, `club-${clubId}`, {
          sectionId: `club-${clubId}`,
          entityType: "club",
          entityId: clubId,
          entityName: club?.name ?? clubId,
          sortOrder: 100,
        });
        addItem(section, {
          itemId: `${pay.paymentId}-${rawItem.itemId ?? rawItem.feeId ?? rawItem.name}`,
          sourceType: "payment",
          sourceId: pay.paymentId as string,
          name: rawItem.name as string,
          description: rawItem.description as string | undefined,
          amountCents,
          status: feeItemStatus,
          paidDate: pay.paidDate ? new Date(pay.paidDate as string).toISOString() : undefined,
          paymentId: pay.paymentId as string,
        });
      } else if (rawItem.type === "insurance" || rawItem.type === "levy") {
        const section = getOrCreateSection(year, `insurance-${year}`, {
          sectionId: `insurance-${year}`,
          entityType: "insurance",
          entityName: "Insurance & Levies",
          sortOrder: 200,
        });
        addItem(section, {
          itemId: `${pay.paymentId}-${rawItem.itemId ?? rawItem.feeId ?? rawItem.name}`,
          sourceType: "payment",
          sourceId: pay.paymentId as string,
          name: rawItem.name as string,
          description: rawItem.description as string | undefined,
          amountCents,
          status: feeItemStatus,
          paidDate: pay.paidDate ? new Date(pay.paidDate as string).toISOString() : undefined,
          paymentId: pay.paymentId as string,
        });
      } else if (
        rawItem.type === "competition" ||
        rawItem.type === "tournament"
      ) {
        const eventKey =
          (rawItem.tournamentId as string | undefined) ??
          (rawItem.competitionId as string | undefined) ??
          "general";
        const section = getOrCreateSection(year, `event-${eventKey}-${year}`, {
          sectionId: `event-${eventKey}-${year}`,
          entityType: "tournament",
          entityName:
            rawItem.type === "competition"
              ? "Competition fees"
              : "Tournament fees",
          sortOrder: 150,
        });
        addItem(section, {
          itemId: `${pay.paymentId}-${rawItem.itemId ?? rawItem.feeId ?? rawItem.name}`,
          sourceType: "payment",
          sourceId: pay.paymentId as string,
          name: rawItem.name as string,
          description: rawItem.description as string | undefined,
          amountCents,
          status: feeItemStatus,
          paidDate: pay.paidDate ? new Date(pay.paidDate as string).toISOString() : undefined,
          paymentId: pay.paymentId as string,
        });
      }
    }

    // Payment with no line items — show as a single line
    if ((!pay.lineItems || (pay.lineItems as unknown[]).length === 0) && pay.amount) {
      const year2 = (pay.seasonYear as string | undefined) ?? yearOf(pay.createdAt);
      const section = getOrCreateSection(year2, `other-${year2}`, {
        sectionId: `other-${year2}`,
        entityType: "club",
        entityName: "Other Fees",
        sortOrder: 300,
      });
      addItem(section, {
        itemId: pay.paymentId as string,
        sourceType: "payment",
        sourceId: pay.paymentId as string,
        name: pay.description as string ?? "Fee Payment",
        amountCents: dollarsToCents(pay.amount as number),
        status: payStatus,
        paidDate: pay.paidDate ? new Date(pay.paidDate as string).toISOString() : undefined,
        paymentId: pay.paymentId as string,
      });
    }
  }

  // ── 5b. Process role-request fees ─────────────────────────────────────────
  for (const rr of roleRequests) {
    const year = (rr.seasonYear as string | undefined) ?? yearOf(rr.createdAt);
    const status = roleRequestStatus(rr as Record<string, unknown>);
    const amountCents = (rr.feeAmountCents as number) ?? 0;

    const section = getOrCreateSection(year, `role-${year}`, {
      sectionId: `role-${year}`,
      entityType: "role",
      entityName: "Role Registrations",
      sortOrder: 400,
    });

    const feeWaiver = rr.feeWaiver as Record<string, unknown> | undefined;

    addItem(section, {
      itemId: rr.requestId as string,
      sourceType: "role-request",
      sourceId: rr.requestId as string,
      name: rr.feeDescription as string ?? `${rr.requestedRole} registration`,
      description: rr.scopeName ? `${rr.scopeName}` : undefined,
      amountCents,
      status,
      paidDate: rr.paymentDate as string | undefined,
      paymentId: rr.paymentId as string | undefined,
      waiver: feeWaiver
        ? {
            reason: feeWaiver.reason as string,
            grantedAt: feeWaiver.grantedAt as string,
            grantedByName: feeWaiver.grantedByName as string,
          }
        : undefined,
    });
  }

  // ── 5c. Process tournament fee allocations ────────────────────────────────
  const tournamentAllocations = await db
    .collection("member_tournament_fees")
    .find({ memberId })
    .sort({ createdAt: -1 })
    .toArray();

  for (const alloc of tournamentAllocations) {
    const year = (alloc.season as string) ?? yearOf(alloc.createdAt);
    const sectionId = `tournament-${alloc.entryId}`;

    const section = getOrCreateSection(year, sectionId, {
      sectionId,
      entityType: "tournament",
      entityId: alloc.entryId as string,
      entityName: `${alloc.tournamentTitle} — ${alloc.teamName}`,
      sortOrder: 500,
    });

    for (const item of (alloc.items ?? []) as Array<Record<string, unknown>>) {
      const rawStatus = item.status as string;
      const itemStatus: MyFeeItem["status"] =
        rawStatus === "paid"
          ? "paid"
          : rawStatus === "waived"
          ? "waived"
          : "outstanding";

      const rawWaiver = item.waiver as Record<string, unknown> | undefined;

      addItem(section, {
        itemId:      `${alloc.allocationId}-${item.itemId}`,
        sourceType:  "tournament-allocation" as "payment", // cast for now; simulate handles it
        sourceId:    alloc.allocationId as string,
        name:        item.name as string,
        description: item.category as string | undefined,
        amountCents: item.amountCents as number,
        status:      itemStatus,
        paidDate:    item.paidDate as string | undefined,
        paymentId:   item.paymentId as string | undefined,
        waiver:      rawWaiver
          ? {
              reason:        rawWaiver.reason as string,
              grantedAt:     rawWaiver.grantedAt as string,
              grantedByName: rawWaiver.grantedByName as string,
            }
          : undefined,
      });
    }
  }

  // ── 6. Collect available years and filter ──────────────────────────────────
  const currentYear = new Date().getFullYear().toString();
  const allYears = [...yearMap.keys()].sort((a, b) => b.localeCompare(a));
  if (!allYears.includes(currentYear)) allYears.unshift(currentYear);

  const yearsToReturn = yearParam === "all" ? allYears : [yearParam];

  const result: MyFeesYear[] = yearsToReturn.map((year) => {
    const sectionsMap = yearMap.get(year) ?? new Map<string, MyFeeSection>();
    const sections = [...sectionsMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      year,
      sections,
      summary: buildSummary(sections),
    };
  });

  return NextResponse.json<MyFeesResponse>({
    memberId,
    availableYears: allYears,
    years: result,
  });
}
