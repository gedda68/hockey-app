import type { Filter } from "mongodb";
import type { PublicTenantPayload } from "@/lib/tenant/portalHost";
import type { UserSession } from "@/lib/db/schemas/user";

export type NewsScopeType = "platform" | "association" | "club";

export type ParsedNewsScope = {
  scopeType: NewsScopeType;
  scopeId: string | null;
};

const MEDIA_ROLES = new Set([
  "super-admin",
  "association-admin",
  "assoc-committee",
  "media-marketing",
  "club-admin",
  "club-committee",
]);

export function parseNewsScope(
  doc: Record<string, unknown> | null | undefined,
): ParsedNewsScope {
  if (!doc) {
    return { scopeType: "platform", scopeId: null };
  }
  const raw = doc.scopeType;
  const st =
    raw === "association" || raw === "club" || raw === "platform"
      ? raw
      : "platform";
  const sid = doc.scopeId;
  const scopeId =
    st === "platform"
      ? null
      : sid != null && String(sid).trim()
        ? String(sid).trim()
        : null;
  return { scopeType: st, scopeId };
}

/**
 * Public association hub: news for this association regardless of apex vs `{slug}.host`
 * (incoming `tenant` may be null on apex, or another portal in edge layouts).
 */
export function publicNewsMongoFilterForAssociationHub(
  associationId: string,
): Filter<Record<string, unknown>> {
  const id = String(associationId ?? "").trim();
  if (!id) {
    return publicNewsMongoFilter(null);
  }
  return { scopeType: "association", scopeId: id };
}

/** Public club hub: news scoped to this club (`scopeType=club`, `scopeId`). */
export function publicNewsMongoFilterForClubHub(
  clubId: string,
): Filter<Record<string, unknown>> {
  const id = String(clubId ?? "").trim();
  if (!id) {
    return publicNewsMongoFilter(null);
  }
  return { scopeType: "club", scopeId: id };
}

/** Public site: strict tenant filter (legacy docs without scopeType count as platform-only). */
export function publicNewsMongoFilter(
  tenant: PublicTenantPayload | null,
): Filter<Record<string, unknown>> {
  if (!tenant) {
    return {
      $or: [
        { scopeType: "platform" },
        { scopeType: { $exists: false } },
        { scopeType: null },
        { scopeType: "" },
      ],
    };
  }
  if (tenant.kind === "association") {
    return { scopeType: "association", scopeId: tenant.id };
  }
  return { scopeType: "club", scopeId: tenant.id };
}

export function adminNewsListFilter(user: UserSession): Filter<Record<string, unknown>> {
  if (user.role === "super-admin") {
    return {};
  }
  if (user.clubId) {
    return { scopeType: "club", scopeId: user.clubId };
  }
  if (user.associationId) {
    return { scopeType: "association", scopeId: user.associationId };
  }
  return { _id: { $exists: false } };
}

function hasMediaRole(role: string): boolean {
  return MEDIA_ROLES.has(role);
}

export function userCanMutateNewsItem(
  user: UserSession,
  scope: ParsedNewsScope,
): boolean {
  if (user.role === "super-admin") return true;
  if (!hasMediaRole(user.role)) return false;
  if (scope.scopeType === "platform") {
    return false;
  }
  if (scope.scopeType === "association") {
    return (
      !!user.associationId &&
      user.associationId === scope.scopeId &&
      !user.clubId
    );
  }
  if (scope.scopeType === "club") {
    return !!user.clubId && user.clubId === scope.scopeId;
  }
  return false;
}

/** Resolve target scope for POST from form/body (super-admin) or session. */
export function resolveNewsScopeForCreate(
  user: UserSession,
  body: { scopeType?: string; scopeId?: string | null },
): { ok: true; scope: ParsedNewsScope } | { ok: false; error: string } {
  if (user.role === "super-admin") {
    const st = (body.scopeType as NewsScopeType | undefined) ?? "platform";
    if (st === "platform" || !body.scopeType) {
      return { ok: true, scope: { scopeType: "platform", scopeId: null } };
    }
    if (st === "association" && body.scopeId?.trim()) {
      return {
        ok: true,
        scope: { scopeType: "association", scopeId: body.scopeId.trim() },
      };
    }
    if (st === "club" && body.scopeId?.trim()) {
      return { ok: true, scope: { scopeType: "club", scopeId: body.scopeId.trim() } };
    }
    return {
      ok: false,
      error:
        "For association/club news, super-admin must send scopeType and non-empty scopeId",
    };
  }
  if (user.clubId && hasMediaRole(user.role)) {
    return { ok: true, scope: { scopeType: "club", scopeId: user.clubId } };
  }
  if (user.associationId && hasMediaRole(user.role)) {
    return {
      ok: true,
      scope: { scopeType: "association", scopeId: user.associationId },
    };
  }
  return { ok: false, error: "No association or club scope for news" };
}
