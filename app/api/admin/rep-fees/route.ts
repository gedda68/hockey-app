// app/api/admin/rep-fees/route.ts
// GET  — aggregate all nomination fee records from member feeHistory for a season
// PATCH — update a specific fee record on a member (mark paid, waive, etc.)

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export interface EnrichedFeeRecord {
  // Member identity
  memberId: string;
  playerName: string;
  playerEmail?: string;
  clubName?: string;
  // Fee record
  feeId: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "waived" | "refunded";
  paymentMethod?: string;
  transactionId?: string;
  paidDate?: string;
  linkedTournamentId?: string;
  notes?: string;
  // Tournament info (resolved from linkedTournamentId)
  tournamentTitle?: string;
  ageGroup?: string;
  season?: string;
}

// ─── GET /api/admin/rep-fees?season=YYYY&status=&ageGroup= ───────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season       = searchParams.get("season") ?? new Date().getFullYear().toString();
    const statusFilter = searchParams.get("status") ?? "";
    const ageGroupFilter = searchParams.get("ageGroup") ?? "";

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // 1. Get all tournaments for this season to build a lookup map
    const tournaments = await db
      .collection("rep_tournaments")
      .find({ season })
      .project({ tournamentId: 1, title: 1, ageGroup: 1, season: 1 })
      .toArray();

    const tournamentMap = new Map(
      tournaments.map((t) => [
        t.tournamentId,
        { title: t.title, ageGroup: t.ageGroup, season: t.season },
      ])
    );
    const seasonTournamentIds = tournaments.map((t) => t.tournamentId);

    if (seasonTournamentIds.length === 0) {
      return NextResponse.json({ fees: [], summary: { total: 0, outstanding: 0, collected: 0, waived: 0 } });
    }

    // 2. Find all members that have fee records linked to this season's tournaments
    const members = await db
      .collection("members")
      .find(
        { feeHistory: { $elemMatch: { linkedTournamentId: { $in: seasonTournamentIds } } } },
        {
          projection: {
            memberId:    1,
            personalInfo: 1,
            membership:  1,
            feeHistory:  1,
          },
        }
      )
      .toArray();

    // 3. Flatten and enrich fee records
    const fees: EnrichedFeeRecord[] = [];

    for (const member of members) {
      const pi         = member.personalInfo ?? {};
      const playerName = `${pi.firstName ?? ""} ${pi.lastName ?? ""}`.trim();
      const clubName   = member.membership?.clubName ?? undefined;

      for (const fee of member.feeHistory ?? []) {
        if (!seasonTournamentIds.includes(fee.linkedTournamentId)) continue;

        const tournament = tournamentMap.get(fee.linkedTournamentId);

        if (statusFilter && fee.status !== statusFilter) continue;
        if (ageGroupFilter && tournament?.ageGroup !== ageGroupFilter) continue;

        fees.push({
          memberId:           member.memberId,
          playerName,
          playerEmail:        member.contact?.primaryEmail ?? undefined,
          clubName,
          feeId:              fee.id,
          date:               fee.date,
          type:               fee.type,
          description:        fee.description,
          amount:             fee.amount,
          currency:           fee.currency ?? "AUD",
          status:             fee.status,
          paymentMethod:      fee.paymentMethod ?? undefined,
          transactionId:      fee.transactionId ?? undefined,
          paidDate:           fee.paidDate ?? undefined,
          linkedTournamentId: fee.linkedTournamentId,
          notes:              fee.notes ?? undefined,
          tournamentTitle:    tournament?.title,
          ageGroup:           tournament?.ageGroup,
          season:             tournament?.season ?? season,
        });
      }
    }

    // Sort: overdue first, then pending, then paid/waived/refunded — then by date desc
    const statusOrder: Record<string, number> = { overdue: 0, pending: 1, paid: 2, waived: 3, refunded: 4 };
    fees.sort((a, b) => {
      const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (so !== 0) return so;
      return b.date.localeCompare(a.date);
    });

    const summary = {
      total:            fees.reduce((s, f) => s + f.amount, 0),
      outstanding:      fees.filter((f) => f.status === "pending" || f.status === "overdue").reduce((s, f) => s + f.amount, 0),
      collected:        fees.filter((f) => f.status === "paid").reduce((s, f) => s + f.amount, 0),
      waived:           fees.filter((f) => f.status === "waived").reduce((s, f) => s + f.amount, 0),
      count:            fees.length,
      countOutstanding: fees.filter((f) => f.status === "pending" || f.status === "overdue").length,
    };

    return NextResponse.json({ fees, summary, ageGroups: [...new Set(fees.map((f) => f.ageGroup).filter(Boolean))] });
  } catch (error: unknown) {
    console.error("GET /api/admin/rep-fees error:", error);
    return NextResponse.json({ error: "Failed to fetch fees" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/rep-fees ───────────────────────────────────────────────
// Body: { memberId, feeId, status, paymentMethod?, transactionId?, notes?, paidDate? }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept either memberId or the legacy playerId field
    const memberId        = body.memberId ?? body.playerId;
    const { feeId, status, paymentMethod, transactionId, notes, paidDate } = body;

    if (!memberId || !feeId) {
      return NextResponse.json({ error: "memberId and feeId are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const today = new Date().toISOString().split("T")[0];
    const updatedFeeHistory = (member.feeHistory ?? []).map((fee: Record<string, any>) => {
      if (fee.id !== feeId) return fee;
      return {
        ...fee,
        ...(status          !== undefined && { status }),
        ...(paymentMethod   !== undefined && { paymentMethod }),
        ...(transactionId   !== undefined && { transactionId }),
        ...(notes           !== undefined && { notes }),
        paidDate: status === "paid" ? (paidDate ?? today) : (fee.paidDate ?? undefined),
      };
    });

    await db.collection("members").updateOne(
      { memberId },
      { $set: { feeHistory: updatedFeeHistory, updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({ message: "Fee updated", memberId, feeId });
  } catch (error: unknown) {
    console.error("PATCH /api/admin/rep-fees error:", error);
    return NextResponse.json({ error: "Failed to update fee" }, { status: 500 });
  }
}
