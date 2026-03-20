// app/api/auth/me/route.ts
// Returns the current session as a user object for the client

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Map session fields to a user object the client understands
    return NextResponse.json({
      user: {
        userId:        session.userId,
        memberId:      session.memberId || null,
        username:      session.username || "",
        email:         session.email    || "",
        firstName:     session.firstName || session.name?.split(" ")[0] || "",
        lastName:      session.lastName  || session.name?.split(" ").slice(1).join(" ") || "",
        name:          session.name,
        role:          session.role,
        associationId: session.associationId || null,
        clubId:        session.clubId        || null,
        clubName:      session.clubName      || null,
        forcePasswordChange: session.forcePasswordChange || false,
      },
    });
  } catch {
    return NextResponse.json({ error: "Session error" }, { status: 500 });
  }
}
