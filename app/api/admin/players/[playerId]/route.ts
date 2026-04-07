/**
 * GET    /api/admin/players/[playerId]  — fetch single player (from members collection)
 * PUT    /api/admin/players/[playerId]  — update player
 * PATCH  /api/admin/players/[playerId]  — append history entries
 * DELETE /api/admin/players/[playerId]  — deactivate (sets membership.status = Inactive)
 *
 * playerId is the memberId (e.g. "CHC-0000001").
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

type Params = { params: Promise<{ playerId: string }> };

function mapStatus(membershipStatus?: string): string {
  switch ((membershipStatus ?? "").toLowerCase()) {
    case "active":
    case "life":    return "active";
    case "inactive":return "inactive";
    case "suspended":return "suspended";
    default:        return "pending";
  }
}

function memberToPlayer(m: Record<string, any>, clubName?: string | null) {
  const pi  = m.personalInfo ?? {};
  const ct  = m.contact      ?? {};
  const mem = m.membership   ?? {};

  return {
    playerId:      m.memberId,
    memberId:      m.memberId,
    firstName:     pi.firstName   ?? "",
    lastName:      pi.lastName    ?? "",
    preferredName: pi.displayName ?? undefined,
    dateOfBirth:   pi.dateOfBirth ?? "",
    gender:        pi.gender      ?? "",
    photo:         pi.photoUrl    ?? undefined,
    phone:         ct.mobile      ?? ct.phone ?? "",
    email:         ct.primaryEmail ?? ct.email ?? "",
    clubId:        m.clubId       ?? "",
    clubName:      clubName       ?? m.clubName ?? null,
    roles:         m.roles        ?? [],
    status: {
      current:          mapStatus(mem.status),
      registrationDate: mem.joinDate            ?? mem.currentPeriodStart ?? undefined,
      expiryDate:       mem.currentPeriodEnd    ?? undefined,
    },
    medical: m.medical
      ? {
          conditions:  m.medical.conditions  ?? "",
          allergies:   m.medical.allergies   ?? "",
          medications: m.medical.medications ?? "",
          doctorName:  m.medical.doctorName  ?? "",
          doctorPhone: m.medical.doctorPhone ?? "",
        }
      : undefined,
    emergencyContacts: (m.emergencyContacts ?? []).map((ec: Record<string, any>) => ({
      id:           ec.contactId ?? ec.id ?? "",
      name:         ec.name      ?? "",
      relationship: ec.relationship ?? "",
      phone:        ec.phone     ?? ec.mobile ?? "",
      email:        ec.email     ?? "",
    })),
    playerInfo:    m.playerInfo ?? undefined,
    // Pass through raw member fields for the edit form
    personalInfo:  pi,
    contact:       ct,
    membership:    mem,
    address:       m.address       ?? {},
    healthcare:    m.healthcare    ?? {},
    familyRelationships: m.familyRelationships ?? [],
    createdAt:     m.createdAt,
    updatedAt:     m.updatedAt,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const { playerId } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId: playerId });
    if (!member) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Join club name
    let clubName: string | null = null;
    if (member.clubId) {
      const club = await db.collection("clubs").findOne({
        $or: [{ id: member.clubId }, { clubId: member.clubId }],
      });
      clubName = club?.name ?? null;
    }

    return NextResponse.json({ player: memberToPlayer(member as Record<string, any>, clubName) });
  } catch (error: unknown) {
    console.error("GET /api/admin/players/[playerId] error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ── PUT ───────────────────────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { playerId } = await params;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const existing = await db.collection("members").findOne({ memberId: playerId });
    if (!existing) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Accept both flat (old player shape) and nested (member shape) updates
    const update: Record<string, any> = { updatedAt: new Date().toISOString() };

    if (body.personalInfo) {
      update.personalInfo = { ...(existing.personalInfo ?? {}), ...body.personalInfo };
    } else if (body.firstName || body.lastName || body.dateOfBirth || body.gender) {
      update.personalInfo = {
        ...(existing.personalInfo ?? {}),
        ...(body.firstName    ? { firstName:   body.firstName }   : {}),
        ...(body.lastName     ? { lastName:    body.lastName }    : {}),
        ...(body.dateOfBirth  ? { dateOfBirth: body.dateOfBirth } : {}),
        ...(body.gender       ? { gender:      body.gender }      : {}),
        ...(body.photo        ? { photoUrl:    body.photo }       : {}),
      };
    }

    if (body.contact) {
      update.contact = { ...(existing.contact ?? {}), ...body.contact };
    } else if (body.email || body.phone) {
      update.contact = {
        ...(existing.contact ?? {}),
        ...(body.email ? { primaryEmail: body.email } : {}),
        ...(body.phone ? { mobile: body.phone } : {}),
      };
    }

    if (body.medical) {
      update.medical = { ...(existing.medical ?? {}), ...body.medical };
    }

    if (body.membership) {
      update.membership = { ...(existing.membership ?? {}), ...body.membership };
    } else if (body.status) {
      // Map flat status update to membership.status
      const statusMap: Record<string, string> = {
        active: "Active", inactive: "Inactive", suspended: "Suspended",
      };
      update["membership.status"] = statusMap[body.status?.current ?? body.status] ?? existing.membership?.status;
    }

    if (body.emergencyContacts) update.emergencyContacts = body.emergencyContacts;
    if (body.address)           update.address           = body.address;
    if (body.healthcare)        update.healthcare        = body.healthcare;
    if (body.roles)             update.roles             = body.roles;
    if (body.playerInfo)        update.playerInfo        = body.playerInfo;

    await db.collection("members").updateOne({ memberId: playerId }, { $set: update });

    const updated = await db.collection("members").findOne({ memberId: playerId });
    return NextResponse.json({
      message: "Player updated",
      player:  memberToPlayer(updated as Record<string, any>),
      playerId,
    });
  } catch (error: unknown) {
    console.error("PUT /api/admin/players/[playerId] error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
// Appends history entries (tournament, fee, official) to the member record.
export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { playerId } = await params;
    const body = await request.json();

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId: playerId });
    if (!member) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const setFields: Record<string, any> = { updatedAt: new Date().toISOString() };
    const pushFields: Record<string, any> = {};

    if (body.email !== undefined)  setFields["contact.primaryEmail"] = body.email;
    if (body.phone !== undefined)  setFields["contact.mobile"]       = body.phone;

    if (body.medical && !body._appendTournamentHistory && !body._appendFeeHistory) {
      setFields.medical = { ...(member.medical ?? {}), ...body.medical };
    }
    if (body.emergencyContacts && !body._appendTournamentHistory && !body._appendFeeHistory) {
      setFields.emergencyContacts = body.emergencyContacts;
    }

    if (body._appendTournamentHistory && Array.isArray(body.tournamentHistory)) {
      pushFields.tournamentHistory = { $each: body.tournamentHistory };
    }
    if (body._appendFeeHistory && Array.isArray(body.feeHistory)) {
      pushFields.feeHistory = { $each: body.feeHistory };
    }
    if (body._appendOfficialHistory && Array.isArray(body.officialHistory)) {
      pushFields.officialHistory = { $each: body.officialHistory };
    }

    const update: Record<string, any> = { $set: setFields };
    if (Object.keys(pushFields).length > 0) update.$push = pushFields;

    await db.collection("members").updateOne({ memberId: playerId }, update);

    return NextResponse.json({ message: "Player updated", playerId });
  } catch (error: unknown) {
    console.error("PATCH /api/admin/players/[playerId] error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
// Soft-delete: set membership.status = Inactive rather than dropping the record.
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  try {
    const { playerId } = await params;
    const client = await clientPromise;
    const db = client.db("hockey-app");

    const member = await db.collection("members").findOne({ memberId: playerId });
    if (!member) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    await db.collection("members").updateOne(
      { memberId: playerId },
      { $set: { "membership.status": "Inactive", updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({ message: "Player deactivated" });
  } catch (error: unknown) {
    console.error("DELETE /api/admin/players/[playerId] error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
