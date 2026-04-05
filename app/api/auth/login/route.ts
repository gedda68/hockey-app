// app/api/auth/login/route.ts
// Login endpoint — checks users collection first, then members.

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { createSession, type ScopedRole } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/username";
import { generateSlug } from "@/lib/utils/slug";
import { getPrimaryRole, numericLevelToString } from "@/lib/types/roles";
import type { RoleAssignment, AssociationLevel } from "@/lib/types/roles";
import bcrypt from "bcryptjs";

/** Convert a DB roles[] array into the minimal ScopedRole[] for the JWT */
function toScopedRoles(roles: RoleAssignment[]): ScopedRole[] {
  const now = new Date();
  return roles
    .filter((r) => r.active !== false)
    .filter((r) => !r.expiresAt || new Date(r.expiresAt) > now)
    .map((r) => ({
      role: r.role,
      scopeType: r.scopeType,
      ...(r.scopeId ? { scopeId: r.scopeId } : {}),
    }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    const loginIdentifier = (username || email || "").trim();

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // ── 1. Check users collection (admin / staff accounts) ──────────────────
    const user = await db.collection("users").findOne({
      $or: [
        { username: { $regex: `^${loginIdentifier}$`, $options: "i" } },
        { email: loginIdentifier.toLowerCase() },
      ],
    });

    if (user && user.passwordHash) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      if (user.status && user.status !== "active") {
        return NextResponse.json(
          { error: "Account is not active. Please contact an administrator." },
          { status: 403 }
        );
      }

      const firstName = (user.firstName || "").trim();
      const lastName  = (user.lastName  || "").trim();
      const fullName  = `${firstName} ${lastName}`.trim() || user.username;

      // Use the full roles[] array when present — derive the primary role from it
      // so that a multi-role user (e.g. player + assoc-selector) gets the right
      // primary role for dashboard redirect without losing the other assignments.
      const dbRoles: RoleAssignment[] = Array.isArray(user.roles) ? user.roles as RoleAssignment[] : [];
      const role: string = dbRoles.length > 0
        ? getPrimaryRole(dbRoles)
        : (user.role || "member");
      const scopedRoles = toScopedRoles(dbRoles);

      // Resolve club name + slug
      let clubName: string | undefined;
      let clubSlug: string | undefined;
      if (user.clubId) {
        const club = await db.collection("clubs").findOne({
          $or: [{ id: user.clubId }, { clubId: user.clubId }],
        });
        if (club) {
          clubName = club.name;
          // Use stored slug, or generate + persist it
          if (club.slug) {
            clubSlug = club.slug;
          } else if (club.name) {
            clubSlug = generateSlug(club.name);
            await db.collection("clubs").updateOne(
              { _id: club._id },
              { $set: { slug: clubSlug } }
            );
          }
        }
      }

      const forcePasswordChange = user.forcePasswordChange === true;

      // Resolve association level (national / state / city / district)
      let associationLevel: AssociationLevel | undefined;
      if (user.associationId) {
        const assoc = await db.collection("associations").findOne(
          { associationId: user.associationId },
          { projection: { level: 1 } }
        );
        if (assoc && typeof assoc.level === "number") {
          associationLevel = numericLevelToString(assoc.level);
        }
      }

      await createSession({
        userId:           user.userId || user._id.toString(),
        email:            user.email  || `${user.username}@local`,
        name:             fullName,
        firstName,
        lastName,
        role,
        scopedRoles:      scopedRoles.length > 0 ? scopedRoles : undefined,
        associationId:    user.associationId || null,
        associationLevel,
        clubId:           user.clubId || null,
        clubSlug:         clubSlug || null,
        clubName,
        username:         user.username,
        forcePasswordChange,
      });

      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date(), loginAttempts: 0 } }
      );

      return NextResponse.json({
        success: true,
        forcePasswordChange,
        user: {
          userId:        user.userId || user._id.toString(),
          username:      user.username,
          email:         user.email,
          firstName,
          lastName,
          role,
          associationId: user.associationId || null,
          clubId:        user.clubId || null,
          clubSlug:      clubSlug || null,
          clubName:      clubName || null,
          forcePasswordChange,
        },
      });
    }

    // ── 2. Check members collection (portal / player accounts) ──────────────
    const member = await db.collection("members").findOne({
      "auth.username": { $regex: `^${loginIdentifier}$`, $options: "i" },
    });

    if (member && member.auth?.passwordHash) {
      const isValid = await verifyPassword(password, member.auth.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid username or password" },
          { status: 401 }
        );
      }

      const memberStatus =
        member.status?.toLowerCase() ||
        member.membership?.status?.toLowerCase();
      if (memberStatus && memberStatus !== "active") {
        return NextResponse.json(
          { error: "Account is not active. Please contact your club administrator." },
          { status: 403 }
        );
      }

      const firstName =
        (member.personalInfo?.firstName || member.firstName || "").trim();
      const lastName =
        (member.personalInfo?.lastName || member.lastName || "").trim();
      const fullName = `${firstName} ${lastName}`.trim() || member.auth.username;
      const memberEmail =
        member.contact?.email || member.email || `${member.auth.username}@local`;
      const memberClubId = member.clubId || member.membership?.clubId || null;
      const memberAssocId = member.associationId || null;
      const forcePasswordChange = member.auth.forcePasswordChange === true;

      const memberDbRoles: RoleAssignment[] = Array.isArray(member.roles) ? member.roles as RoleAssignment[] : [];
      const role: string = memberDbRoles.length > 0
        ? getPrimaryRole(memberDbRoles)
        : (member.auth.role || "player");
      const memberScopedRoles = toScopedRoles(memberDbRoles);

      let clubName: string | undefined;
      let memberClubSlug: string | undefined;
      if (memberClubId) {
        const club = await db.collection("clubs").findOne({
          $or: [{ id: memberClubId }, { clubId: memberClubId }],
        });
        if (club) {
          clubName = club.name;
          if (club.slug) {
            memberClubSlug = club.slug;
          } else if (club.name) {
            memberClubSlug = generateSlug(club.name);
            await db.collection("clubs").updateOne(
              { _id: club._id },
              { $set: { slug: memberClubSlug } }
            );
          }
        }
      }

      // Resolve association level for member (if they have an assoc scope)
      let memberAssocLevel: AssociationLevel | undefined;
      if (memberAssocId) {
        const memberAssoc = await db.collection("associations").findOne(
          { associationId: memberAssocId },
          { projection: { level: 1 } }
        );
        if (memberAssoc && typeof memberAssoc.level === "number") {
          memberAssocLevel = numericLevelToString(memberAssoc.level);
        }
      }

      await createSession({
        userId:           member._id.toString(),
        email:            memberEmail,
        name:             fullName,
        firstName,
        lastName,
        role,
        scopedRoles:      memberScopedRoles.length > 0 ? memberScopedRoles : undefined,
        associationId:    memberAssocId,
        associationLevel: memberAssocLevel,
        clubId:           memberClubId,
        clubSlug:         memberClubSlug || null,
        clubName,
        memberId:         member._id.toString(),
        username:         member.auth.username,
        forcePasswordChange,
      });

      await db.collection("members").updateOne(
        { _id: member._id },
        { $set: { "auth.lastLogin": new Date().toISOString() } }
      );

      return NextResponse.json({
        success: true,
        forcePasswordChange,
        user: {
          memberId:      member._id.toString(),
          username:      member.auth.username,
          email:         memberEmail,
          firstName,
          lastName,
          role,
          associationId: memberAssocId,
          clubId:        memberClubId,
          clubSlug:      memberClubSlug || null,
          clubName:      clubName || null,
          forcePasswordChange,
        },
      });
    }

    // ── 3. Not found in either collection ───────────────────────────────────
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 }
    );
  } catch (error: unknown) {
    console.error("💥 Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
