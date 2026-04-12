// app/api/auth/me/route.ts
// Returns the current session as a user object for the client

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import clientPromise from "@/lib/mongodb";
import {
  activePersonaKeyFromSession,
  buildPersonaOptions,
} from "@/lib/auth/sessionPersona";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const personas = await buildPersonaOptions(db, session);
    const activePersonaKey = activePersonaKeyFromSession(session);

    return NextResponse.json({
      user: {
        userId: session.userId,
        memberId: session.memberId || null,
        username: session.username || "",
        email: session.email || "",
        firstName:
          session.firstName || session.name?.split(" ")[0] || "",
        lastName:
          session.lastName || session.name?.split(" ").slice(1).join(" ") || "",
        name: session.name,
        role: session.role,
        scopedRoles: session.scopedRoles ?? [],
        associationId: session.associationId ?? null,
        associationLevel: session.associationLevel ?? null,
        clubId: session.clubId ?? null,
        clubSlug: session.clubSlug ?? null,
        clubName: session.clubName ?? null,
        forcePasswordChange: session.forcePasswordChange || false,
        activePersonaKey,
        personas,
      },
    });
  } catch {
    return NextResponse.json({ error: "Session error" }, { status: 500 });
  }
}
