import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession, createSession } from "@/lib/auth/session";
import {
  parsePersonaKey,
  personaIsAllowed,
  sessionWithPersona,
} from "@/lib/auth/sessionPersona";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const personaKey =
      typeof body.personaKey === "string" ? body.personaKey.trim() : "";
    if (!personaKey) {
      return NextResponse.json(
        { error: "personaKey is required" },
        { status: 400 },
      );
    }

    const parsed = parsePersonaKey(personaKey);
    if (!parsed || !personaIsAllowed(session, parsed)) {
      return NextResponse.json({ error: "Invalid persona" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");
    const nextSession = await sessionWithPersona(db, session, personaKey);
    if (!nextSession) {
      return NextResponse.json(
        { error: "Could not apply persona" },
        { status: 400 },
      );
    }

    await createSession(nextSession);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("switch-persona:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
