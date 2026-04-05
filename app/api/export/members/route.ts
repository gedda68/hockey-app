/**
 * GET /api/export/members
 *
 * Returns all members as a flat JSON array suitable for CSV/PDF export.
 * Accepts the same filter params as /api/admin/members but removes pagination.
 *
 * Query params: clubId?, associationId?, status?, membershipType?, search?
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { escapeRegex } from "@/lib/utils/regex";

const EXPORT_LIMIT = 5000;

const ALLOWED_ROLES = [
  "super-admin", "association-admin", "assoc-registrar",
  "club-admin", "registrar", "club-committee",
];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const clubId         = searchParams.get("clubId")         ?? undefined;
  const associationId  = searchParams.get("associationId")  ?? undefined;
  const status         = searchParams.get("status")         ?? undefined;
  const membershipType = searchParams.get("membershipType") ?? undefined;
  const search         = searchParams.get("search")         ?? undefined;

  const client = await clientPromise;
  const db = client.db("hockey-app");

  const query: Record<string, unknown> = {};

  // Scope: club-level roles can only export their own club
  if (["club-admin", "registrar", "club-committee"].includes(session.role) && session.clubId) {
    query.clubId = session.clubId;
  } else {
    if (clubId)        query.clubId        = clubId;
    if (associationId) query.associationId = associationId;
  }

  if (status)         query["membership.status"]           = status;
  if (membershipType) query["membership.membershipTypes"]  = membershipType;

  if (search) {
    const s = escapeRegex(search);
    query.$or = [
      { memberId:                      { $regex: s, $options: "i" } },
      { "personalInfo.firstName":      { $regex: s, $options: "i" } },
      { "personalInfo.lastName":       { $regex: s, $options: "i" } },
      { "contact.primaryEmail":        { $regex: s, $options: "i" } },
    ];
  }

  const members = await db
    .collection("members")
    .find(query)
    .sort({ "personalInfo.lastName": 1, "personalInfo.firstName": 1 })
    .limit(EXPORT_LIMIT)
    .project({
      memberId:                  1,
      clubId:                    1,
      "personalInfo.firstName":  1,
      "personalInfo.lastName":   1,
      "personalInfo.dateOfBirth":1,
      "personalInfo.gender":     1,
      "contact.primaryEmail":    1,
      "contact.primaryPhone":    1,
      "contact.mobile":          1,
      "address.suburb":          1,
      "address.state":           1,
      "address.postcode":        1,
      "membership.status":       1,
      "membership.membershipTypes": 1,
      "membership.joinDate":     1,
      "membership.expiryDate":   1,
      roles:                     1,
    })
    .toArray();

  // Flatten nested fields for easy CSV/table consumption
  const rows = members.map((m) => ({
    memberId:        m.memberId ?? "",
    clubId:          m.clubId ?? "",
    firstName:       m.personalInfo?.firstName ?? "",
    lastName:        m.personalInfo?.lastName ?? "",
    dateOfBirth:     m.personalInfo?.dateOfBirth ?? "",
    gender:          m.personalInfo?.gender ?? "",
    email:           m.contact?.primaryEmail ?? "",
    phone:           m.contact?.primaryPhone ?? m.contact?.mobile ?? "",
    suburb:          m.address?.suburb ?? "",
    state:           m.address?.state ?? "",
    postcode:        m.address?.postcode ?? "",
    membershipStatus: m.membership?.status ?? "",
    membershipTypes: (m.membership?.membershipTypes ?? []).join(", "),
    joinDate:        m.membership?.joinDate ?? "",
    expiryDate:      m.membership?.expiryDate ?? "",
    activeRoles:     (m.roles ?? [])
      .filter((r: Record<string, unknown>) => r.active !== false)
      .map((r: Record<string, unknown>) => r.role)
      .join(", "),
  }));

  return NextResponse.json({ rows, total: rows.length });
}
