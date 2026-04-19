import { NextResponse, type NextRequest } from "next/server";
import type { UserSession } from "@/lib/db/schemas/user";
import type { Permission } from "@/lib/types/roles";
import type { BulkImportEntity } from "@/lib/bulk-import/types";
import type { ImportRuntimeContext } from "@/lib/bulk-import/helpers";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";

/** How we gate organisation scope after permissions pass (non–super-admin). */
export type BulkImportScopeKind = "none" | "club" | "association";

type EntityAccessRule = {
  permissions: Permission[];
  /** none = permission only. either = club if session has clubId else association. */
  scope: BulkImportScopeKind | "either";
};

const RULES: Record<BulkImportEntity, EntityAccessRule> = {
  associations: {
    permissions: ["system.manage", "association.create"],
    scope: "none",
  },
  clubs: {
    permissions: ["system.manage", "association.edit", "club.create"],
    scope: "association",
  },
  members: {
    permissions: ["member.create", "club.members", "registration.manage"],
    scope: "either",
  },
  players: {
    permissions: ["member.create", "club.members", "registration.manage"],
    scope: "either",
  },
  users: {
    permissions: ["system.users", "association.settings"],
    scope: "either",
  },
  teams: {
    permissions: ["team.create", "team.edit"],
    scope: "either",
  },
  "rep-teams": {
    permissions: ["team.create", "team.edit", "competitions.manage"],
    scope: "association",
  },
  "association-registrations": {
    permissions: ["registration.manage", "member.create"],
    scope: "association",
  },
  "club-registrations": {
    permissions: ["registration.manage", "member.create"],
    scope: "either",
  },
  "league-venues": {
    permissions: ["competitions.manage", "competitions.fixtures"],
    scope: "association",
  },
  tournaments: {
    permissions: ["competitions.manage"],
    scope: "association",
  },
  "tournament-fixtures": {
    permissions: ["competitions.manage", "competitions.fixtures"],
    scope: "association",
  },
  "tournament-results": {
    permissions: ["results.manage", "competitions.fixtures", "competitions.manage"],
    scope: "association",
  },
  "league-fixture-results": {
    permissions: ["results.manage", "competitions.fixtures", "competitions.manage"],
    scope: "association",
  },
  "competition-awards": {
    permissions: ["results.manage", "competitions.fixtures", "competitions.manage"],
    scope: "association",
  },
  nominations: {
    permissions: ["selection.manage"],
    scope: "either",
  },
  fees: {
    permissions: ["association.fees", "club.fees"],
    scope: "either",
  },
  "tournament-fees": {
    permissions: ["competitions.manage", "registration.payments"],
    scope: "association",
  },
  news: {
    permissions: ["system.manage", "association.edit", "club.edit"],
    scope: "either",
  },
};

function resolveEffectiveScope(
  user: UserSession,
  rule: EntityAccessRule,
): BulkImportScopeKind | null {
  if (rule.scope === "none") return "none";
  if (rule.scope === "club") return "club";
  if (rule.scope === "association") return "association";
  if (user.clubId) return "club";
  if (user.associationId) return "association";
  return null;
}

/**
 * Permission + organisation gate for bulk import. Super-admin skips resource checks.
 * Returns a NextResponse when forbidden, otherwise `{ user }`.
 */
export async function authorizeBulkImport(
  request: NextRequest,
  user: UserSession,
  entity: BulkImportEntity,
): Promise<{ user: UserSession; response?: NextResponse }> {
  const rule = RULES[entity];
  if (!rule) {
    return {
      user,
      response: NextResponse.json({ error: `Unknown entity: ${entity}` }, { status: 400 }),
    };
  }

  const { user: authedUser, response: permRes } = await requireAnyPermission(request, rule.permissions);
  if (permRes) return { user: authedUser, response: permRes };

  if (authedUser.role === "super-admin") {
    return { user: authedUser };
  }

  const scope = resolveEffectiveScope(authedUser, rule);
  if (scope === null) {
    return {
      user: authedUser,
      response: NextResponse.json(
        { error: "Forbidden — club or association assignment required" },
        { status: 403 },
      ),
    };
  }

  if (scope === "none") {
    return { user: authedUser };
  }

  if (scope === "club") {
    if (!authedUser.clubId) {
      return {
        user: authedUser,
        response: NextResponse.json(
          { error: "Forbidden — club scope required for this import" },
          { status: 403 },
        ),
      };
    }
    return requireResourceAccess(request, "club", authedUser.clubId);
  }

  if (!authedUser.associationId) {
    return {
      user: authedUser,
      response: NextResponse.json(
        { error: "Forbidden — association scope required for this import" },
        { status: 403 },
      ),
    };
  }
  return requireResourceAccess(request, "association", authedUser.associationId);
}

export function buildImportRuntimeContext(user: UserSession): ImportRuntimeContext {
  const isSuper = user.role === "super-admin";
  if (isSuper) {
    return { allowStaticPassword: true };
  }
  const ctx: ImportRuntimeContext = {
    allowStaticPassword: false,
  };
  if (user.clubId) {
    ctx.forcedClubId = user.clubId;
  } else if (user.associationId) {
    ctx.forcedParentAssociationId = user.associationId;
    ctx.forcedAssociationId = user.associationId;
  }
  return ctx;
}
