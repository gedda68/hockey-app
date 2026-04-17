import { NextRequest, NextResponse } from "next/server";
import clientPromise, { getDatabaseName } from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import {
  userCanAccessAssociationResource,
  userCanAccessClubResource,
} from "@/lib/auth/resourceAccessDb";
/**
 * Returns whether the current session may edit the given admin resource,
 * plus a display label for the admin shell ("Editing: …").
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clubKey = request.nextUrl.searchParams.get("clubKey")?.trim();
  const associationId = request.nextUrl.searchParams.get("associationId")?.trim();

  if (!clubKey && !associationId) {
    return NextResponse.json({
      allowed: true,
      kind: null as string | null,
      displayName: null as string | null,
    });
  }

  try {
    const client = await clientPromise;
    const db = client.db(getDatabaseName());

    if (clubKey) {
      const allowed = await userCanAccessClubResource(session, clubKey);
      const club = await db.collection("clubs").findOne(
        {
          $or: [{ slug: clubKey }, { id: clubKey }],
        },
        { projection: { name: 1, title: 1 } },
      );
      const displayName =
        (club?.name as string | undefined) ||
        (club?.title as string | undefined) ||
        clubKey;
      return NextResponse.json({
        allowed,
        kind: "club",
        displayName,
      });
    }

    if (!associationId) {
      return NextResponse.json({
        allowed: true,
        kind: null as string | null,
        displayName: null as string | null,
      });
    }

    const allowed = await userCanAccessAssociationResource(
      session,
      associationId,
    );
    const assoc = await db.collection("associations").findOne(
      { associationId },
      { projection: { name: 1, fullName: 1 } },
    );
    const displayName =
      (assoc?.name as string | undefined) ||
      (assoc?.fullName as string | undefined) ||
      associationId;
    return NextResponse.json({
      allowed,
      kind: "association",
      displayName,
    });
  } catch (e) {
    console.error("[admin-editing-scope]", e);
    return NextResponse.json(
      { error: "Failed to resolve scope" },
      { status: 500 },
    );
  }
}
