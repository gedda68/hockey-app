import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { getSession, attachSessionCookie, createSessionCookieParts } from "@/lib/auth/session";
import { extractPortalSlugFromHost } from "@/lib/tenant/portalHost";
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

    // Remember the choice so the next login can open the same organisation.
    if (session.memberId && ObjectId.isValid(String(session.memberId))) {
      await db
        .collection("members")
        .updateOne({ _id: new ObjectId(String(session.memberId)) }, { $set: { "preferences.lastPersonaKey": personaKey } })
        .catch(() => undefined);
    }

    // A profile that lives on a different tenant host needs the session established there too: the cookie is
    // host-only, so hand the browser the token to carry across (/api/auth/consume-session on that host).
    const target = nextSession.portalSubdomain?.trim().toLowerCase() || null;
    const here = extractPortalSlugFromHost(request.headers.get("host"));
    const sessionJwt = target && target !== here ? (await createSessionCookieParts(nextSession)).value : undefined;

    const res = NextResponse.json({
      success: true,
      portalSubdomain: nextSession.portalSubdomain ?? null,
      ...(sessionJwt ? { sessionJwt } : {}),
    });
    await attachSessionCookie(res, nextSession);
    return res;
  } catch (e) {
    console.error("switch-persona:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
