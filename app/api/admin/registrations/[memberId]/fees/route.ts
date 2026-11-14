// PUT /api/admin/registrations/[memberId]/fees
// A club administrator can add / edit / remove fee lines for THEIR club on a member's registration;
// an association administrator for THEIR association. Every change is recorded in `feeChanges`.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { userCanAccessAssociationResource, userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import { applyToLines, sumLines, validateChange, type FeeChange } from "@/lib/registrations/feeEdit";

const CLUB_ROLES = ["club-admin", "club-committee", "registrar"];
const ASSOC_ROLES = ["association-admin", "assoc-committee", "assoc-registrar"];

export async function PUT(request: NextRequest, context: { params: Promise<{ memberId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { memberId } = await context.params;
  const body = (await request.json()) as FeeChange & { season?: number };

  const bad = validateChange(body);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const season = Number(body.season);
  if (!Number.isFinite(season)) return NextResponse.json({ error: "season is required" }, { status: 400 });

  // Scope: you may only change lines for the level you administer.
  const role = String(session.role);
  const allowed =
    role === "super-admin" ||
    (body.levelKind === "club" && CLUB_ROLES.includes(role) && (await userCanAccessClubResource(session, body.levelId))) ||
    (body.levelKind === "association" && ASSOC_ROLES.includes(role) && (await userCanAccessAssociationResource(session, body.levelId)));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
  const seasonIn = { $in: [season, String(season)] };
  const clubReg = await db.collection("club-registrations").findOne({ memberId, seasonYear: seasonIn, registrationType: { $ne: "secondary" } })
    ?? await db.collection("club-registrations").findOne({ memberId, seasonYear: seasonIn });
  if (!clubReg) return NextResponse.json({ error: "No club registration for that season" }, { status: 404 });
  // A club admin may only touch a registration at their own club.
  if (body.levelKind === "club" && String(clubReg.clubId) !== body.levelId) {
    return NextResponse.json({ error: "That registration belongs to a different club" }, { status: 403 });
  }

  const now = new Date();
  const by = String(session.username ?? session.userId ?? "admin");
  const before = (clubReg.fees ?? []) as Record<string, any>[];
  const result = applyToLines(before, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });

  const change = { at: now.toISOString(), by, role, action: body.action, levelKind: body.levelKind, levelId: body.levelId, before: body.action === "add" ? null : before.find((l) => l.itemId === body.itemId) ?? null, after: body.action === "remove" ? null : result.line };
  await db.collection("club-registrations").updateOne(
    { _id: clubReg._id },
    { $set: { fees: result.lines, totalFee: sumLines(result.lines), updatedAt: now }, $push: { feeChanges: change } as any },
  );

  // Mirror association lines onto that association's own registration.
  if (body.levelKind === "association") {
    const assocCol = db.collection("association-registrations");
    const reg = await assocCol.findOne({ memberId, associationId: body.levelId, seasonYear: seasonIn });
    const lines = ((reg?.fees ?? []) as Record<string, any>[]);
    const mirrored = body.action === "add" ? { lines: [...lines, result.line!] } : applyToLines(lines, { ...body, action: body.action }, "x");
    if (reg && !("error" in mirrored)) {
      await assocCol.updateOne({ _id: reg._id }, { $set: { fees: mirrored.lines, totalFee: sumLines(mirrored.lines), updatedAt: now }, $push: { feeChanges: change } as any });
    } else if (!reg && body.action === "add") {
      await assocCol.insertOne({
        registrationId: `AREG-${body.levelId}-${memberId}-${season}`, memberId, associationId: body.levelId, clubId: clubReg.clubId, seasonYear: season,
        status: clubReg.status, roleIds: [], registrationCategory: clubReg.registrationCategory, currency: clubReg.currency ?? "AUD",
        fees: [result.line], totalFee: Number(result.line!.amount), source: "manual", registeredDate: clubReg.registeredDate, createdAt: now, updatedAt: now, createdBy: by, feeChanges: [change],
      } as any);
    }
  }
  return NextResponse.json({ success: true, fees: result.lines, totalFee: sumLines(result.lines) });
}
