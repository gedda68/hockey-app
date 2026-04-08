// lib/auth/analyticsScope.ts
// Validates analytics ?scope=&scopeId= against the signed-in admin session.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  userCanAccessAssociationResource,
  userCanAccessClubResource,
} from "@/lib/auth/resourceAccessDb";
import { requirePermission } from "@/lib/auth/middleware";

export async function requireAnalyticsAccess(
  request: NextRequest,
): Promise<{ response?: NextResponse }> {
  const { response } = await requirePermission(request, "reports.view");
  if (response) return { response };

  const session = await getSession();
  if (!session) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "global";
  const scopeId = searchParams.get("scopeId");

  if (scope === "global") {
    if (session.role !== "super-admin") {
      return {
        response: NextResponse.json(
          {
            error:
              "Forbidden — global analytics requires super-admin; pass scope=association|club with scopeId",
          },
          { status: 403 },
        ),
      };
    }
    return {};
  }

  if (!scopeId?.trim()) {
    return {
      response: NextResponse.json(
        { error: "scopeId is required for association or club analytics" },
        { status: 400 },
      ),
    };
  }

  if (scope === "association") {
    const ok = await userCanAccessAssociationResource(session, scopeId);
    if (!ok) {
      return {
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    return {};
  }

  if (scope === "club") {
    const ok = await userCanAccessClubResource(session, scopeId);
    if (!ok) {
      return {
        response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    return {};
  }

  return {
    response: NextResponse.json({ error: "Invalid scope" }, { status: 400 }),
  };
}
