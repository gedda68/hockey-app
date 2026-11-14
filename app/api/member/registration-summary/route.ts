// GET /api/member/registration-summary[?memberId=]
//  - a member sees their own summary
//  - club / association admins see the same limited summary for members in their scope
// Never returns contact, address, medical, family, blue-card or login data.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { userCanAccessAssociationResource, userCanAccessClubResource } from "@/lib/auth/resourceAccessDb";
import { ADMIN_VIEW_ROLES, limitForAdmin, loadRegistrationSummary } from "@/lib/members/registrationSummary";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asked = new URL(request.url).searchParams.get("memberId")?.trim();
  const memberId = asked || session.memberId || "";
  if (!memberId) return NextResponse.json({ error: "No member linked to this login", code: "NO_MEMBER" }, { status: 400 });

  const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
  const own = !!session.memberId && session.memberId === memberId;

  const summary = await loadRegistrationSummary(db, memberId);
  if (!summary) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (own) return NextResponse.json({ view: "self", summary });

  // Anyone else: must hold an admin role AND have scope over the member's club or association.
  if (!ADMIN_VIEW_ROLES.includes(String(session.role))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Club roles are checked against the member's club only (their login also carries the parent
  // association id, which must NOT widen access to every club under it); association roles against
  // the association levels only.
  const isClubRole = ["club-admin", "club-committee", "registrar"].includes(String(session.role));
  let allowed = session.role === "super-admin";
  for (const l of summary.levels) {
    if (allowed) break;
    if (isClubRole) {
      if (l.kind === "club") allowed = await userCanAccessClubResource(session, l.id);
    } else if (l.kind === "association") {
      allowed = await userCanAccessAssociationResource(session, l.id);
    }
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Which levels this admin may edit fee lines for (shown as edit controls in the page).
  const editable: string[] = [];
  for (const l of summary.levels) {
    const ok =
      session.role === "super-admin" ||
      (l.kind === "club" && isClubRole && (await userCanAccessClubResource(session, l.id))) ||
      (l.kind === "association" && !isClubRole && (await userCanAccessAssociationResource(session, l.id)));
    if (ok) editable.push(`${l.kind}:${l.id}`);
  }
  return NextResponse.json({ view: "admin", editable, summary: limitForAdmin(summary, { role: session.role, associationId: session.associationId }) });
}
