// app/api/auth/me/route.ts
// GET: current session as a user object for the client.
// PATCH: update own staff account name, email, phone (session cookie refreshed).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { attachSessionCookie, getSession, type SessionData } from "@/lib/auth/session";
import { getDatabase } from "@/lib/mongodb";
import {
  activePersonaKeyFromSession,
  buildPersonaOptions,
} from "@/lib/auth/sessionPersona";
import { requirePermission } from "@/lib/auth/middleware";
import { escapeRegex } from "@/lib/utils/regex";

const PatchMeSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phone: z.union([z.string().trim().max(40), z.null()]).optional(),
});

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const db = await getDatabase();
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
        portalSubdomain: session.portalSubdomain ?? null,
        activePersonaKey,
        personas,
      },
    });
  } catch {
    return NextResponse.json({ error: "Session error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { response: permRes } = await requirePermission(request, "profile.edit");
  if (permRes) return permRes;

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchMeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { firstName, lastName, email, phone } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  try {
    const db = await getDatabase();
    const existing = await db.collection("users").findOne({ userId: session.userId });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prevEmail = String(existing.email ?? "").trim().toLowerCase();
    if (emailNorm !== prevEmail) {
      const dup = await db.collection("users").findOne({
        userId: { $ne: session.userId },
        email: { $regex: new RegExp(`^${escapeRegex(emailNorm)}$`, "i") },
      });
      if (dup) {
        return NextResponse.json({ error: "That email is already in use" }, { status: 409 });
      }
    }

    const name = `${firstName} ${lastName}`.trim();
    const $set: Record<string, unknown> = {
      firstName,
      lastName,
      name,
      email: email.trim(),
      updatedAt: new Date().toISOString(),
    };
    if (phone !== undefined) {
      $set.phone = phone;
    }

    await db.collection("users").updateOne({ userId: session.userId }, { $set });

    const nextSession: SessionData = {
      ...session,
      firstName,
      lastName,
      name,
      email: email.trim(),
    };

    const res = NextResponse.json({ ok: true, firstName, lastName, email: email.trim() });
    await attachSessionCookie(res, nextSession);
    return res;
  } catch (e) {
    console.error("PATCH /api/auth/me:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
