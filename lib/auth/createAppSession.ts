/**
 * Shared session creation for password login and OIDC SSO (no password check).
 */

import type { Db, Document } from "mongodb";
import { createSession } from "@/lib/auth/session";
import { generateSlug } from "@/lib/utils/slug";
import { getPrimaryRole, numericLevelToString } from "@/lib/types/roles";
import type { RoleAssignment, AssociationLevel } from "@/lib/types/roles";
import { buildTenantOrigin } from "@/lib/tenant/subdomainUrls";
import {
  associationPortalSubdomain,
  clubPortalSubdomain,
} from "@/lib/tenant/portalLabels";
import { toScopedRoles } from "@/lib/auth/toScopedRoles";
import { resolvePortalSubdomainLabel } from "@/lib/auth/postLoginTenant";

export type StaffSessionOk = {
  ok: true;
  accountType: "user";
  forcePasswordChange: boolean;
  clubPortalOrigin?: string;
  associationPortalOrigin?: string;
  user: {
    userId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    associationId: string | null;
    clubId: string | null;
    clubSlug: string | null;
    clubName: string | null;
    forcePasswordChange: boolean;
  };
};

export type MemberSessionOk = {
  ok: true;
  accountType: "member";
  forcePasswordChange: boolean;
  clubPortalOrigin?: string;
  associationPortalOrigin?: string;
  user: {
    memberId: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    associationId: string | null;
    clubId: string | null;
    clubSlug: string | null;
    clubName: string | null;
    forcePasswordChange: boolean;
  };
};

export type SessionEstablishResult =
  | StaffSessionOk
  | MemberSessionOk
  | { ok: false; status: number; error: string };

export async function createStaffUserSession(
  db: Db,
  user: Document,
): Promise<SessionEstablishResult> {
  if (user.status && user.status !== "active") {
    return {
      ok: false,
      status: 403,
      error: "Account is not active. Please contact an administrator.",
    };
  }

  const firstName = (user.firstName || "").trim();
  const lastName = (user.lastName || "").trim();
  const fullName = `${firstName} ${lastName}`.trim() || String(user.username || "");

  const dbRoles: RoleAssignment[] = Array.isArray(user.roles)
    ? (user.roles as RoleAssignment[])
    : [];
  const role: string =
    dbRoles.length > 0 ? getPrimaryRole(dbRoles) : (user.role || "member");
  const scopedRoles = toScopedRoles(dbRoles);

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
  type AssocProjection = {
    level?: number;
    code?: string;
    portalSlug?: string;
  } | null;
  let assocDoc: AssocProjection = null;
  if (user.associationId) {
    assocDoc = (await db.collection("associations").findOne(
      { associationId: user.associationId },
      { projection: { level: 1, code: 1, portalSlug: 1 } },
    )) as AssocProjection;
    if (assocDoc && typeof assocDoc.level === "number") {
      associationLevel = numericLevelToString(assocDoc.level);
    }
    if (assocDoc) {
      associationPortalOrigin = buildTenantOrigin(
        associationPortalSubdomain({
          code: assocDoc.code,
          portalSlug: assocDoc.portalSlug,
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

  const portalSubdomain = resolvePortalSubdomainLabel({
    role,
    clubId: user.clubId ? String(user.clubId) : null,
    club: clubDoc
      ? {
          shortName: clubDoc.shortName as string | undefined,
          abbreviation: clubDoc.abbreviation as string | undefined,
          portalSlug: clubDoc.portalSlug as string | undefined,
          slug: clubDoc.slug as string | undefined,
        }
      : null,
    associationId: user.associationId ? String(user.associationId) : null,
    association: assocDoc
      ? { code: assocDoc.code, portalSlug: assocDoc.portalSlug }
      : null,
  });

  await createSession({
    userId: user.userId || user._id.toString(),
    email: user.email || `${user.username}@local`,
    name: fullName,
    firstName,
    lastName,
    role,
    scopedRoles: scopedRoles.length > 0 ? scopedRoles : undefined,
    associationId: user.associationId || null,
    associationLevel,
    clubId: user.clubId || null,
    clubSlug: clubSlug || null,
    clubName,
    username: user.username,
    forcePasswordChange,
    portalSubdomain,
  });

  await db.collection("users").updateOne(
    { _id: user._id },
    { $set: { lastLogin: new Date(), loginAttempts: 0 } },
  );

  return {
    ok: true,
    accountType: "user",
    forcePasswordChange,
    clubPortalOrigin,
    associationPortalOrigin,
    user: {
      userId: user.userId || user._id.toString(),
      username: user.username,
      email: user.email,
      firstName,
      lastName,
      role,
      associationId: user.associationId || null,
      clubId: user.clubId || null,
      clubSlug: clubSlug || null,
      clubName: clubName || null,
      forcePasswordChange,
    },
  };
}

export async function createMemberSession(
  db: Db,
  member: Document,
): Promise<SessionEstablishResult> {
  const memberStatus =
    member.status?.toLowerCase() ||
    member.membership?.status?.toLowerCase();
  if (memberStatus && memberStatus !== "active") {
    return {
      ok: false,
      status: 403,
      error:
        "Account is not active. Please contact your club administrator.",
    };
  }

  const firstName = (
    member.personalInfo?.firstName ||
    member.firstName ||
    ""
  ).trim();
  const lastName = (
    member.personalInfo?.lastName ||
    member.lastName ||
    ""
  ).trim();
  const fullName =
    `${firstName} ${lastName}`.trim() || member.auth?.username || "";
  const memberEmail =
    member.contact?.email ||
    member.email ||
    `${member.auth?.username}@local`;
  const memberClubId =
    member.clubId || member.membership?.clubId || null;
  const memberAssocId = member.associationId || null;
  const forcePasswordChange = member.auth?.forcePasswordChange === true;

  const memberDbRoles: RoleAssignment[] = Array.isArray(member.roles)
    ? (member.roles as RoleAssignment[])
    : [];
  const role: string =
    memberDbRoles.length > 0
      ? getPrimaryRole(memberDbRoles)
      : member.auth?.role || "player";
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
          { $or: [{ id: memberClubId }, { clubId: memberClubId }] },
          { $set: { slug: memberClubSlug } },
        );
      }
    }
  }

  let memberAssocLevel: AssociationLevel | undefined;
  let memberAssociationPortalOrigin: string | undefined;
  type MemberAssocProjection = {
    level?: number;
    code?: string;
    portalSlug?: string;
  } | null;
  let memberAssocDoc: MemberAssocProjection = null;
  if (memberAssocId) {
    memberAssocDoc = (await db.collection("associations").findOne(
      { associationId: memberAssocId },
      { projection: { level: 1, code: 1, portalSlug: 1 } },
    )) as MemberAssocProjection;
    if (memberAssocDoc && typeof memberAssocDoc.level === "number") {
      memberAssocLevel = numericLevelToString(memberAssocDoc.level);
    }
    if (memberAssocDoc) {
      memberAssociationPortalOrigin = buildTenantOrigin(
        associationPortalSubdomain({
          code: memberAssocDoc.code,
          portalSlug: memberAssocDoc.portalSlug,
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

  const memberPortalSubdomain = resolvePortalSubdomainLabel({
    role,
    clubId: memberClubId ? String(memberClubId) : null,
    club: memberClubDoc
      ? {
          shortName: memberClubDoc.shortName as string | undefined,
          abbreviation: memberClubDoc.abbreviation as string | undefined,
          portalSlug: memberClubDoc.portalSlug as string | undefined,
          slug: memberClubDoc.slug as string | undefined,
        }
      : null,
    associationId: memberAssocId ? String(memberAssocId) : null,
    association: memberAssocDoc
      ? { code: memberAssocDoc.code, portalSlug: memberAssocDoc.portalSlug }
      : null,
  });

  await createSession({
    userId: member._id.toString(),
    email: memberEmail,
    name: fullName,
    firstName,
    lastName,
    role,
    scopedRoles:
      memberScopedRoles.length > 0 ? memberScopedRoles : undefined,
    associationId: memberAssocId,
    associationLevel: memberAssocLevel,
    clubId: memberClubId,
    clubSlug: memberClubSlug || null,
    clubName,
    memberId: member._id.toString(),
    username: member.auth?.username,
    forcePasswordChange,
    portalSubdomain: memberPortalSubdomain,
  });

  await db.collection("members").updateOne(
    { _id: member._id },
    { $set: { "auth.lastLogin": new Date().toISOString() } },
  );

  return {
    ok: true,
    accountType: "member",
    forcePasswordChange,
    clubPortalOrigin: memberClubPortalOrigin,
    associationPortalOrigin: memberAssociationPortalOrigin,
    user: {
      memberId: member._id.toString(),
      username: member.auth?.username,
      email: memberEmail,
      firstName,
      lastName,
      role,
      associationId: memberAssocId,
      clubId: memberClubId,
      clubSlug: memberClubSlug || null,
      clubName: clubName || null,
      forcePasswordChange,
    },
  };
}
