import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSession, attachSessionCookie } from "@/lib/auth/session";
import {
  parsePersonaKey,
  buildPersonaOptions,
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

    const db = await getDatabase();
    const parsed = parsePersonaKey(personaKey);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid persona" }, { status: 403 });
    }
    const options = await buildPersonaOptions(db, session);
    if (!options.some((o) => o.key === personaKey)) {
      return NextResponse.json({ error: "Invalid persona" }, { status: 403 });
    }
    const nextSession = await sessionWithPersona(db, session, personaKey);
    if (!nextSession) {
      return NextResponse.json(
        { error: "Could not apply persona" },
        { status: 400 },
      );
    }

    const res = NextResponse.json({
      success: true,
      portalSubdomain: nextSession.portalSubdomain ?? null,
    });
    await attachSessionCookie(res, nextSession);
    return res;
  } catch (e) {
    console.error("switch-persona:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
