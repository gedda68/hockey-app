// lib/auth/resourceAccessDb.ts
// DB-backed scope checks (e.g. association admin → clubs under that association).

import clientPromise from "@/lib/mongodb";
import type { SessionData } from "@/lib/auth/session";
import { sessionDataToAssignments } from "@/lib/auth/sessionAssignments";
import { canAccessResource } from "@/lib/types/roles";

export async function userCanAccessAssociationResource(
  session: SessionData | null,
  associationId: string,
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "super-admin") return true;
  const assignments = sessionDataToAssignments(session);
  if (canAccessResource(assignments, "association", associationId)) return true;
  return session.associationId === associationId;
}

export async function userCanAccessClubResource(
  session: SessionData | null,
  clubIdOrSlug: string,
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "super-admin") return true;
  const assignments = sessionDataToAssignments(session);
  if (canAccessResource(assignments, "club", clubIdOrSlug)) return true;
  if (session.clubId === clubIdOrSlug || session.clubSlug === clubIdOrSlug)
    return true;

  if (session.role === "association-admin" && session.associationId) {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const club = await db.collection("clubs").findOne({
      $or: [{ slug: clubIdOrSlug }, { id: clubIdOrSlug }],
    });
    return club?.parentAssociationId === session.associationId;
  }

  return false;
}
