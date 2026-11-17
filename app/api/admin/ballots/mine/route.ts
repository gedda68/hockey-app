/**
 * GET /api/admin/ballots/mine
 *
 * Ballots the signed-in person can see: ballots they are an eligible voter in, plus (for people who manage
 * selection) ballots whose nomination window belongs to an organisation they have access to.
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requireAuth } from "@/lib/auth/middleware";
import { userCanAccessAssociationResource, userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import type { Ballot, NominationWindow } from "@/types/nominations";

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth(req);
  if (response) return response;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const voterIds = [session.userId, session.memberId].filter((v): v is string => !!v);
  const canManage = (user.permissions as string[]).includes("selection.manage");

  const recent = (await db
    .collection("ballots")
    .find({})
    .sort({ openAt: -1 })
    .limit(300)
    .toArray()) as unknown as Ballot[];

  const windows = (await db
    .collection("nomination_windows")
    .find({ windowId: { $in: [...new Set(recent.map((b) => b.windowId))] } })
    .toArray()) as unknown as NominationWindow[];
  const winById = new Map(windows.map((w) => [w.windowId, w]));

  const scopeOk = new Map<string, boolean>();
  const canSeeScope = async (w: NominationWindow) => {
    const k = `${w.scopeType}:${w.scopeId}`;
    if (!scopeOk.has(k)) {
      scopeOk.set(
        k,
        w.scopeType === "association"
          ? await userCanAccessAssociationResource(session, w.scopeId)
          : await userCanAccessClubResource(session, w.scopeId),
      );
    }
    return scopeOk.get(k)!;
  };

  const out: Record<string, unknown>[] = [];
  for (const b of recent) {
    const w = winById.get(b.windowId);
    const isVoter = (b.eligibleVoterIds ?? []).some((id) => voterIds.includes(id));
    const isAdmin = !isVoter && canManage && !!w && (await canSeeScope(w));
    if (!isVoter && !isAdmin) continue;
    out.push({
      ballotId: b.ballotId,
      title: w?.title ?? "Ballot",
      ballotNumber: b.ballotNumber,
      status: b.status,
      openAt: b.openAt,
      closeAt: b.closeAt,
      totalEligibleVoters: b.totalEligibleVoters,
      totalVotesCast: b.totalVotesCast,
      seasonYear: w?.seasonYear,
      scopeType: w?.scopeType,
      scopeId: w?.scopeId,
      isVoter,
      isAdmin: isAdmin || (isVoter && canManage),
    });
  }
  return NextResponse.json({ ballots: out });
}
