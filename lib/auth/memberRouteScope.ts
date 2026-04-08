// lib/auth/memberRouteScope.ts
// Ensures the session may access a member document (club or association scope).

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  userCanAccessAssociationResource,
  userCanAccessClubResource,
} from "@/lib/auth/resourceAccessDb";

export type MemberScopeDoc = {
  membership?: { clubId?: string; associationId?: string };
  clubId?: string;
  associationId?: string;
};

/** Returns a 403/401 NextResponse if access denied; otherwise null. */
export async function assertMemberInSessionScope(
  _request: NextRequest,
  member: MemberScopeDoc,
): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "super-admin") return null;

  const clubId = member.membership?.clubId ?? member.clubId;
  if (clubId) {
    const ok = await userCanAccessClubResource(session, clubId);
    return ok
      ? null
      : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assocId =
    member.membership?.associationId ?? member.associationId ?? undefined;
  if (assocId) {
    const ok = await userCanAccessAssociationResource(session, assocId);
    return ok
      ? null
      : NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
