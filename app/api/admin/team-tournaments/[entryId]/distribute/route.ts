/**
 * POST /api/admin/team-tournaments/[entryId]/distribute
 *
 * Calculates each attending member's share of every fee item and
 * upserts a MemberTournamentFee document per member.
 *
 * Split logic:
 *   - "equal"  → totalAmountCents / attendingCount (remainder allocated to first member)
 *   - "manual" → uses overrides[memberId][itemId] from request body;
 *                falls back to equal split if no override provided
 *
 * Existing paid/waived items are preserved — only "outstanding" items are
 * recalculated, so running distribute again after partial payment is safe.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import type {
  TeamTournamentEntry,
  MemberTournamentFee,
  MemberFeeAllocationItem,
  DistributeFeesBody,
} from "@/types/teamTournament";

const ADMIN_ROLES = [
  "super-admin",
  "association-admin",
  "club-admin",
  "registrar",
  "assoc-registrar",
];

function computeStatus(
  items: MemberFeeAllocationItem[]
): MemberTournamentFee["status"] {
  const payable = items.filter((i) => i.status !== "waived");
  if (payable.length === 0) return "waived";
  const allPaid = payable.every((i) => i.status === "paid");
  if (allPaid) return "paid";
  const somePaid = payable.some((i) => i.status === "paid");
  if (somePaid) return "partially-paid";
  return "outstanding";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { response } = await requirePermission(req, "registration.payments");
  if (response) return response;

  const session = await getSession();
  if (!session || !ADMIN_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entryId } = await params;
  const client = await clientPromise;
  const db = client.db("hockey-app");

  const entry = await db
    .collection<TeamTournamentEntry>("team_tournament_entries")
    .findOne({ entryId });

  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  if (["club-admin", "registrar"].includes(session.role) && session.clubId) {
    if (entry.clubId !== session.clubId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (entry.attendingMemberIds.length === 0) {
    return NextResponse.json(
      { error: "No attending members selected. Add members before distributing fees." },
      { status: 400 }
    );
  }

  if (entry.feeItems.length === 0) {
    return NextResponse.json(
      { error: "No fee items defined. Add fee items before distributing." },
      { status: 400 }
    );
  }

  let body: DistributeFeesBody = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional
  }
  const overrides = body.overrides ?? {};

  // Look up member names
  const memberDocs = await db
    .collection("members")
    .find({ memberId: { $in: entry.attendingMemberIds } })
    .project({ memberId: 1, "personalInfo.firstName": 1, "personalInfo.lastName": 1 })
    .toArray();

  const memberNameMap = new Map<string, string>(
    memberDocs.map((m) => [
      m.memberId as string,
      `${m.personalInfo?.firstName ?? ""}  ${m.personalInfo?.lastName ?? ""}`.trim(),
    ])
  );

  const n = entry.attendingMemberIds.length;
  const now = new Date();

  // Load existing allocations to preserve paid/waived items
  const existingAllocations = await db
    .collection<MemberTournamentFee>("member_tournament_fees")
    .find({ entryId })
    .toArray();

  const existingMap = new Map(existingAllocations.map((a) => [a.memberId, a]));

  const upserts: MemberTournamentFee[] = [];

  for (const memberId of entry.attendingMemberIds) {
    const existing = existingMap.get(memberId);
    const existingItemMap = new Map(
      (existing?.items ?? []).map((i) => [i.itemId, i])
    );

    const items: MemberFeeAllocationItem[] = entry.feeItems.map((feeItem, idx) => {
      const existingItem = existingItemMap.get(feeItem.itemId);

      // Preserve already-settled items
      if (existingItem && existingItem.status !== "outstanding") {
        return existingItem;
      }

      // Calculate this member's share
      let amountCents: number;

      if (feeItem.splitMethod === "manual" && overrides[memberId]?.[feeItem.itemId] !== undefined) {
        amountCents = overrides[memberId][feeItem.itemId];
      } else {
        // Equal split — distribute remainder to first member
        const base = Math.floor(feeItem.totalAmountCents / n);
        const remainder = feeItem.totalAmountCents - base * n;
        amountCents = idx === 0 && entry.attendingMemberIds.indexOf(memberId) === 0
          ? base + remainder
          : base;
      }

      return {
        itemId:      feeItem.itemId,
        category:    feeItem.category,
        name:        feeItem.name,
        amountCents,
        status:      "outstanding" as const,
      };
    });

    const totalCents      = items.reduce((s, i) => s + i.amountCents, 0);
    const paidCents       = items.filter((i) => i.status === "paid").reduce((s, i) => s + i.amountCents, 0);
    const waivedCents     = items.filter((i) => i.status === "waived").reduce((s, i) => s + i.amountCents, 0);
    const outstandingCents = items
      .filter((i) => i.status === "outstanding")
      .reduce((s, i) => s + i.amountCents, 0);

    const allocationId = `mtf-${memberId}-${entryId}`;

    upserts.push({
      allocationId,
      memberId,
      memberName:      memberNameMap.get(memberId) ?? memberId,
      entryId,
      teamId:          entry.teamId,
      teamName:        entry.teamName,
      clubId:          entry.clubId,
      tournamentId:    entry.tournamentId,
      tournamentTitle: entry.tournamentTitle,
      season:          entry.season,
      ageGroup:        entry.ageGroup,
      items,
      totalCents,
      paidCents,
      outstandingCents,
      waivedCents,
      status:    computeStatus(items),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  }

  // Bulk upsert
  const bulkOps = upserts.map((doc) => ({
    updateOne: {
      filter: { allocationId: doc.allocationId },
      update: { $set: doc },
      upsert: true,
    },
  }));

  await db.collection("member_tournament_fees").bulkWrite(bulkOps);

  // Update entry collected total
  const totalCollectedCents = upserts.reduce((s, a) => s + a.paidCents, 0);
  await db
    .collection("team_tournament_entries")
    .updateOne({ entryId }, { $set: { totalCollectedCents, updatedAt: now } });

  return NextResponse.json({
    distributed: upserts.length,
    allocations: upserts,
  });
}
