import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { ROLE_DEFINITIONS } from "@/lib/types/roles";
import { generateMembershipCardPdf } from "@/lib/member/membershipCardPdf";

async function isFamilyPrimaryForTarget(
  db: ReturnType<Awaited<typeof clientPromise>["db"]>,
  sessionMemberId: string,
  targetMemberId: string,
): Promise<boolean> {
  const [me, target] = await Promise.all([
    db.collection("members").findOne({ memberId: sessionMemberId }, { projection: { family: 1 } }),
    db.collection("members").findOne({ memberId: targetMemberId }, { projection: { family: 1 } }),
  ]);
  const myFamilyId = String((me as any)?.family?.familyId ?? "").trim();
  const isPrimary = Boolean((me as any)?.family?.isPrimaryContact);
  const targetFamilyId = String((target as any)?.family?.familyId ?? "").trim();
  return !!(myFamilyId && isPrimary && targetFamilyId && myFamilyId === targetFamilyId);
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const seasonYear = (sp.get("seasonYear") ?? "").trim() || new Date().getFullYear().toString();
  if (!/^\d{4}$/.test(seasonYear)) {
    return NextResponse.json({ error: "seasonYear must be a YYYY string" }, { status: 400 });
  }

  const requestedRole = (sp.get("role") ?? "").trim() || null;
  const roleLabel =
    requestedRole && ROLE_DEFINITIONS[requestedRole as keyof typeof ROLE_DEFINITIONS]
      ? ROLE_DEFINITIONS[requestedRole as keyof typeof ROLE_DEFINITIONS]!.label
      : requestedRole;

  const requestedMemberId = (sp.get("memberId") ?? "").trim();
  const sessionMemberId = (session.memberId ?? "").trim();
  const targetMemberId = requestedMemberId || sessionMemberId;
  if (!targetMemberId) {
    return NextResponse.json({ error: "No member profile on this account" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();

  // Authorization: self, admins, or family primary for target member.
  const adminRoles = ["super-admin", "association-admin", "club-admin", "assoc-registrar", "registrar"];
  const isAdmin =
    adminRoles.includes(session.role) ||
    (session.scopedRoles ?? []).some((sr) => adminRoles.includes(sr.role));
  const isSelf = targetMemberId === sessionMemberId;

  if (!isAdmin && !isSelf) {
    if (!sessionMemberId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const ok = await isFamilyPrimaryForTarget(db, sessionMemberId, targetMemberId);
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const member = await db.collection("members").findOne(
    { memberId: targetMemberId },
    { projection: { memberId: 1, clubId: 1, personalInfo: 1 } },
  );
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const clubId = String((member as any).clubId ?? "").trim();
  const club = clubId
    ? await db.collection("clubs").findOne({ id: clubId }, { projection: { name: 1, shortName: 1 } })
    : null;
  const clubName = club ? String((club as any).shortName ?? (club as any).name ?? "").trim() : "";

  const pi = (member as any).personalInfo ?? {};
  const displayName =
    String(pi.displayName ?? "").trim() ||
    `${String(pi.firstName ?? "").trim()} ${String(pi.lastName ?? "").trim()}`.trim() ||
    targetMemberId;
  const photoUrl = (pi.photoUrl != null ? String(pi.photoUrl) : "").trim() || null;

  const { bytes, filename } = await generateMembershipCardPdf({
    memberId: targetMemberId,
    displayName,
    clubName,
    roleLabel: roleLabel ?? null,
    seasonYear,
    photoUrl,
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

