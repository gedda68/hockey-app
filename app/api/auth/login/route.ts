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
import { escapeRegex } from "@/lib/utils/regex";
import { buildTenantOrigin } from "@/lib/tenant/subdomainUrls";
import {
  associationPortalSubdomain,
  clubPortalSubdomain,
} from "@/lib/tenant/portalLabels";

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
    const loginRegex = escapeRegex(loginIdentifier);

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
        { username: { $regex: `^${loginRegex}$`, $options: "i" } },
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

      // Resolve club name + slug (+ doc for portal URL)
      let clubName: string | undefined;
      let clubSlug: string | undefined;
      let clubDoc: Record<string, unknown> | null = null;
      if (user.clubId) {
        clubDoc = (await db.collection("clubs").findOne({
          $or: [{ id: user.clubId }, { clubId: user.clubId }],
        })) as Record<string, unknown> | null;
        if (clubDoc) {
          clubName = clubDoc.name as string | undefined;
          if (clubDoc.slug) {
            clubSlug = String(clubDoc.slug);
          } else if (clubDoc.name) {
            clubSlug = generateSlug(String(clubDoc.name));
            await db.collection("clubs").updateOne(
              { $or: [{ id: user.clubId }, { clubId: user.clubId }] },
              { $set: { slug: clubSlug } },
            );
          }
        }
      }

      const forcePasswordChange = user.forcePasswordChange === true;

      let associationLevel: AssociationLevel | undefined;
      let associationPortalOrigin: string | undefined;
      if (user.associationId) {
        const assoc = await db.collection("associations").findOne(
          { associationId: user.associationId },
          { projection: { level: 1, code: 1, portalSlug: 1 } },
        );
        if (assoc && typeof assoc.level === "number") {
          associationLevel = numericLevelToString(assoc.level);
        }
        if (assoc) {
          associationPortalOrigin = buildTenantOrigin(
            associationPortalSubdomain({
              code: assoc.code as string | undefined,
              portalSlug: assoc.portalSlug as string | undefined,
            }),
          );
        }
      }

      const clubPortalOrigin = clubDoc
        ? buildTenantOrigin(
            clubPortalSubdomain({
              shortName: clubDoc.shortName as string | undefined,
              abbreviation: clubDoc.abbreviation as string | undefined,
              portalSlug: clubDoc.portalSlug as string | undefined,
              slug: clubDoc.slug as string | undefined,
            }),
          )
        : undefined;

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
        clubPortalOrigin,
        associationPortalOrigin,
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
      "auth.username": { $regex: `^${loginRegex}$`, $options: "i" },
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
      let memberClubDoc: Record<string, unknown> | null = null;
      if (memberClubId) {
        memberClubDoc = (await db.collection("clubs").findOne({
          $or: [{ id: memberClubId }, { clubId: memberClubId }],
        })) as Record<string, unknown> | null;
        if (memberClubDoc) {
          clubName = memberClubDoc.name as string | undefined;
          if (memberClubDoc.slug) {
            memberClubSlug = String(memberClubDoc.slug);
          } else if (memberClubDoc.name) {
            memberClubSlug = generateSlug(String(memberClubDoc.name));
            await db.collection("clubs").updateOne(
              { _id: memberClubDoc._id },
              { $set: { slug: memberClubSlug } },
            );
          }
        }
      }

      let memberAssocLevel: AssociationLevel | undefined;
      let memberAssociationPortalOrigin: string | undefined;
      if (memberAssocId) {
        const memberAssoc = await db.collection("associations").findOne(
          { associationId: memberAssocId },
          { projection: { level: 1, code: 1, portalSlug: 1 } },
        );
        if (memberAssoc && typeof memberAssoc.level === "number") {
          memberAssocLevel = numericLevelToString(memberAssoc.level);
        }
        if (memberAssoc) {
          memberAssociationPortalOrigin = buildTenantOrigin(
            associationPortalSubdomain({
              code: memberAssoc.code as string | undefined,
              portalSlug: memberAssoc.portalSlug as string | undefined,
            }),
          );
        }
      }

      const memberClubPortalOrigin = memberClubDoc
        ? buildTenantOrigin(
            clubPortalSubdomain({
              shortName: memberClubDoc.shortName as string | undefined,
              abbreviation: memberClubDoc.abbreviation as string | undefined,
              portalSlug: memberClubDoc.portalSlug as string | undefined,
              slug: memberClubDoc.slug as string | undefined,
            }),
          )
        : undefined;

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
        clubPortalOrigin: memberClubPortalOrigin,
        associationPortalOrigin: memberAssociationPortalOrigin,
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
