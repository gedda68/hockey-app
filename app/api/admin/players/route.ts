/**
 * GET  /api/admin/players  — list players (sourced from members collection)
 * POST /api/admin/players  — create player (creates a member record)
 *
 * Design note:
 * The authoritative person record is the `members` collection.
 * This route adapts it to the flat Player shape that PlayersList.tsx expects,
 * using memberId as the playerId for URL routing.
 *
 * Membership status mapping (members use Title Case, PlayersList uses lowercase):
 *   "Active" | "Life" → "active"
 *   "Inactive"        → "inactive"
 *   "Suspended"       → "suspended"
 *   absent/other      → "pending"
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { escapeRegex } from "@/lib/utils/regex";
import { getSession } from "@/lib/auth/session";

// ── Status mapping ────────────────────────────────────────────────────────────
function mapStatus(membershipStatus?: string): string {
  switch ((membershipStatus ?? "").toLowerCase()) {
    case "active":
    case "life":
      return "active";
    case "inactive":
      return "inactive";
    case "suspended":
      return "suspended";
    default:
      return "pending";
  }
}

// ── Field mapping: member doc → PlayersList Player shape ──────────────────────
function memberToPlayer(m: Record<string, any>, clubName?: string | null) {
  const pi = m.personalInfo ?? {};
  const ct = m.contact ?? {};
  const mem = m.membership ?? {};

  return {
    // Identity — memberId is used as playerId for URL routing
    playerId:       m.memberId,
    memberId:       m.memberId,

    // Personal
    firstName:      pi.firstName    ?? "",
    lastName:       pi.lastName     ?? "",
    preferredName:  pi.displayName  ?? undefined,
    dateOfBirth:    pi.dateOfBirth  ?? "",
    gender:         pi.gender       ?? "",
    photo:          pi.photoUrl     ?? undefined,

    // Contact
    phone:          ct.mobile ?? ct.phone ?? "",
    email:          ct.primaryEmail ?? ct.email ?? "",

    // Club
    clubId:         m.clubId        ?? "",
    clubName:       clubName        ?? m.clubName ?? null,

    // Roles
    roles:          m.roles         ?? [],

    // Status (flattened to match old players shape)
    status: {
      current:          mapStatus(mem.status),
      registrationDate: mem.joinDate ?? mem.currentPeriodStart ?? undefined,
      expiryDate:       mem.currentPeriodEnd ?? undefined,
    },

    // Medical
    medical: m.medical
      ? {
          conditions:  m.medical.conditions  ?? "",
          allergies:   m.medical.allergies   ?? "",
          medications: m.medical.medications ?? "",
          bloodType:   undefined,
          doctorName:  m.medical.doctorName  ?? "",
          doctorPhone: m.medical.doctorPhone ?? "",
        }
      : undefined,

    // Emergency contacts — remap from members shape
    emergencyContacts: (m.emergencyContacts ?? []).map((ec: Record<string, any>) => ({
      id:           ec.contactId ?? ec.id ?? "",
      name:         ec.name      ?? "",
      relationship: ec.relationship ?? "",
      phone:        ec.phone     ?? ec.mobile ?? "",
      email:        ec.email     ?? "",
    })),

    // Player-specific
    playerInfo: m.playerInfo ?? undefined,
  };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const clubId  = searchParams.get("clubId");
    const status  = searchParams.get("status");    // "active"|"inactive"|"suspended"|"pending"
    const gender  = searchParams.get("gender");
    const search  = searchParams.get("search");
    const role    = searchParams.get("role");      // filter by specific role
    const page    = parseInt(searchParams.get("page")  || "1");
    const limit   = parseInt(searchParams.get("limit") || "100");
    const skip    = (page - 1) * limit;

    const client = await clientPromise;
    const db     = client.db("hockey-app");

    // ── Build query ───────────────────────────────────────────────────────────
    const query: Record<string, unknown> = {};

    if (clubId) query.clubId = clubId;

    // Role filter — default to showing members who have a player-type role
    if (role) {
      query.roles = role;
    }
    // (No default role filter — show all members; admins can use the role filter)

    // Status: map the lowercase player status back to Title Case for members query
    if (status && status !== "all") {
      const statusMap: Record<string, string | string[] | { $exists: boolean }> = {
        active:    ["Active", "Life"],
        inactive:  "Inactive",
        suspended: "Suspended",
        pending:   { $exists: false },
      };
      const mapped = statusMap[status];
      if (mapped) {
        if (Array.isArray(mapped)) {
          query["membership.status"] = { $in: mapped };
        } else if (typeof mapped === "object") {
          query["membership.status"] = mapped;
        } else {
          query["membership.status"] = mapped;
        }
      }
    }

    // Gender
    if (gender) {
      // Members store gender as "gender-male", "gender-female", etc.
      // Accept both the full value and short forms
      query["personalInfo.gender"] = { $regex: gender, $options: "i" };
    }

    // Search
    if (search) {
      const s = escapeRegex(search);
      query.$or = [
        { memberId:                    { $regex: s, $options: "i" } },
        { "personalInfo.firstName":    { $regex: s, $options: "i" } },
        { "personalInfo.lastName":     { $regex: s, $options: "i" } },
        { "personalInfo.displayName":  { $regex: s, $options: "i" } },
        { "contact.primaryEmail":      { $regex: s, $options: "i" } },
        { "contact.mobile":            { $regex: s, $options: "i" } },
      ];
    }

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const [total, members] = await Promise.all([
      db.collection("members").countDocuments(query),
      db.collection("members")
        .find(query)
        .sort({ "personalInfo.lastName": 1, "personalInfo.firstName": 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
    ]);

    // ── Join club names ───────────────────────────────────────────────────────
    const clubIds = [...new Set(members.map((m) => m.clubId).filter(Boolean))];
    const clubDocs = clubIds.length
      ? await db.collection("clubs")
          .find({ $or: [{ id: { $in: clubIds } }, { clubId: { $in: clubIds } }] })
          .project({ id: 1, clubId: 1, name: 1 })
          .toArray()
      : [];

    const clubMap = new Map<string, string>();
    for (const c of clubDocs) {
      const key = c.id ?? c.clubId;
      if (key) clubMap.set(key, c.name);
    }

    // ── Map to Player shape ───────────────────────────────────────────────────
    const players = members.map((m) =>
      memberToPlayer(m as Record<string, any>, clubMap.get(m.clubId) ?? null)
    );

    return NextResponse.json({
      players,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/players error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
// Creating a "player" means creating a member record with the player role.
// Delegates to /api/admin/members for the actual creation logic.
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Accept both flat (old players shape) and nested (members shape) payloads
    const firstName = body.firstName ?? body.personalInfo?.firstName;
    const lastName  = body.lastName  ?? body.personalInfo?.lastName;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Forward as a member creation request with "player" role
    const memberPayload = body.personalInfo
      ? body  // already in member shape
      : {
          clubId: body.clubId,
          personalInfo: {
            firstName:   body.firstName,
            lastName:    body.lastName,
            dateOfBirth: body.dateOfBirth ?? "",
            gender:      body.gender      ?? "",
            displayName: `${body.firstName} ${body.lastName}`,
          },
          contact: {
            primaryEmail:  body.email ?? "",
            mobile:        body.phone ?? "",
            emailOwnership: "personal",
          },
          medical:     body.medical     ?? {},
          roles:       body.roles       ?? ["player"],
          membership:  body.membership  ?? {
            membershipType:     "type-senior-playing",
            status:             "Active",
            joinDate:           new Date().toISOString().split("T")[0],
            currentPeriodStart: new Date().toISOString().split("T")[0],
            currentPeriodEnd:   `${new Date().getFullYear()}-12-31`,
          },
          emergencyContacts: body.emergencyContacts ?? [],
        };

    // Proxy to /api/admin/members
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/admin/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify(memberPayload),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });

    // Return in player shape
    const created = data.member ?? data;
    return NextResponse.json(
      { player: memberToPlayer(created) },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/admin/players error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
