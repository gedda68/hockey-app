/**
 * POST /api/admin/nominations/submit
 *
 * Submit a nomination against a NominationWindow with full eligibility enforcement.
 * Supports self-nominations and third-party nominations.
 *
 * Body:
 *   windowId          — required
 *   nomineeId         — memberId or userId of the nominee
 *   nomineeType       — "member" | "user"
 *   nominatedBy       — userId of nominator (optional — if absent, assumes self-nomination)
 *   nominatedByName   — display name of nominator
 *   statement         — required if window.requiresStatement
 *   preferredGrade    — for grade-pref windows only
 *   notes             — optional
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/middleware";
import type { NominationWindow, EligibilitySnapshot } from "@/types/nominations";
import { isWindowOpen } from "@/types/nominations";

export async function POST(request: NextRequest) {
  try {
    const nom = await requirePermission(request, "selection.nominate");
    if (!nom.response) {
      /* ok */
    } else {
      const reg = await requirePermission(request, "registration.manage");
      if (!reg.response) {
        /* ok */
      } else {
        const sel = await requirePermission(request, "selection.manage");
        if (sel.response) return sel.response;
      }
    }

    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const body = await request.json() as {
      windowId: string;
      nomineeId: string;
      nomineeType: "member" | "user";
      nominatedBy?: string;
      nominatedByName?: string;
      statement?: string;
      preferredGrade?: string;
      notes?: string;
    };

    const { windowId, nomineeId, nomineeType, statement, preferredGrade, notes } = body;

    if (!windowId || !nomineeId || !nomineeType) {
      return NextResponse.json(
        { error: "windowId, nomineeId, and nomineeType are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("hockey-app");

    // ── Resolve window ─────────────────────────────────────────────────────────
    const win = await db.collection("nomination_windows").findOne({ windowId }) as NominationWindow | null;
    if (!win) return NextResponse.json({ error: "Nomination window not found" }, { status: 404 });

    if (!isWindowOpen(win)) {
      return NextResponse.json(
        { error: `Nominations for "${win.title}" are not currently open` },
        { status: 409 }
      );
    }

    // ── Statement check ────────────────────────────────────────────────────────
    if (win.requiresStatement && !statement?.trim()) {
      return NextResponse.json(
        { error: "A nomination statement is required for this window" },
        { status: 400 }
      );
    }

    // ── Resolve nominee details ────────────────────────────────────────────────
    const targetCollection = nomineeType === "user" ? "users" : "members";
    const idField          = nomineeType === "user" ? "userId" : "memberId";

    const nominee = await db.collection(targetCollection).findOne({ [idField]: nomineeId });
    if (!nominee) {
      return NextResponse.json({ error: "Nominee not found" }, { status: 404 });
    }

    const nomineeName = nomineeType === "user"
      ? `${nominee.firstName ?? ""} ${nominee.lastName ?? ""}`.trim() || nominee.username
      : `${nominee.personalInfo?.firstName ?? ""} ${nominee.personalInfo?.lastName ?? ""}`.trim();

    const dateOfBirth: string = nomineeType === "user"
      ? (nominee.dateOfBirth ?? "")
      : (nominee.personalInfo?.dateOfBirth ?? "");

    const seasonYear = parseInt(win.seasonYear, 10);

    // ── Birth year eligibility (rep-team and grade-pref) ───────────────────────
    const eligibility: EligibilitySnapshot = {
      ageEligible:          true,
      financiallyCleared:   true,
      noConflictOfInterest: true,
      noPositionConflict:   true,
    };

    if ((win.category === "rep-team" || win.category === "grade-pref") && dateOfBirth) {
      const birthYear = new Date(dateOfBirth).getFullYear();
      if (win.minBirthYear && birthYear < win.minBirthYear) {
        eligibility.ageEligible = false;
      }
      if (win.maxBirthYear && birthYear > win.maxBirthYear) {
        eligibility.ageEligible = false;
      }
      if (!eligibility.ageEligible) {
        return NextResponse.json(
          {
            error: `Nominee is not age-eligible for ${win.ageGroup ?? win.title} in ${win.seasonYear}`,
            eligibility,
          },
          { status: 422 }
        );
      }
    }

    // ── Financial membership check ─────────────────────────────────────────────
    if (win.requiresFinancialMembership) {
      // Check nominee has a current (non-expired) registration in the relevant scope
      const regQuery: Record<string, unknown> = {
        [idField]: nomineeId,
        status: { $in: ["active", "financial"] },
        seasonYear: win.seasonYear,
      };
      const registration = await db.collection("registrations").findOne(regQuery);
      if (!registration) {
        // Also accept members registered via the members collection with paid status
        const memberFinancial = nomineeType === "member"
          ? await db.collection("members").findOne({
              memberId: nomineeId,
              "membership.status": { $in: ["financial", "active"] },
              "membership.seasonYear": win.seasonYear,
            })
          : null;

        if (!memberFinancial) {
          eligibility.financiallyCleared = false;
          return NextResponse.json(
            {
              error: "Nominee does not have a current financial membership for this season",
              eligibility,
            },
            { status: 422 }
          );
        }
      }
    }

    // ── Position conflict check (same position at another club in same city) ───
    if (win.positionRole && nomineeType === "member" && win.scopeType === "club") {
      // Find if nominee already holds this role for a different club in the same city
      const existingRole = await db.collection("members").findOne({
        memberId: nomineeId,
        "roles": {
          $elemMatch: {
            role: win.positionRole,
            scopeType: "club",
            active: true,
            scopeId: { $ne: win.scopeId },
          }
        }
      });
      if (existingRole) {
        // Only block if that club is in the same city/association
        // For now flag as potential conflict (non-blocking) — full city lookup would require club record
        eligibility.noPositionConflict = false;
        // Return warning but don't hard-block — let admin decide
        console.warn(`Nominee ${nomineeId} may hold ${win.positionRole} at another club`);
      }
    }

    // ── Duplicate check ────────────────────────────────────────────────────────
    const duplicate = await db.collection("rep_nominations").findOne({
      windowId,
      nomineeId,
      status: { $nin: ["withdrawn"] },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Nominee already has an active nomination for this window" },
        { status: 409 }
      );
    }

    // ── Determine status ───────────────────────────────────────────────────────
    // Third-party: nominator is different from nominee
    const nominatedBy     = body.nominatedBy ?? session.userId;
    const nominatedByName = body.nominatedByName ?? session.name;
    const isSelfNomination =
      nominatedBy === nomineeId ||
      nominatedBy === session.userId && (session.userId === nomineeId || session.memberId === nomineeId);

    const initialStatus = isSelfNomination ? "pending" : "pending-acceptance";

    const now = new Date().toISOString();
    const nomination = {
      nominationId: `nom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      windowId,

      // Legacy rep-team compat fields
      season:    win.seasonYear,
      ageGroup:  win.ageGroup ?? "",
      clubId:    win.scopeId,
      clubName:  win.scopeName,

      // Nominee
      nomineeId,
      nomineeName,
      nomineeType,
      memberId:   nomineeType === "member" ? nomineeId : undefined,
      memberName: nomineeName,

      dateOfBirth,
      ageAtSeason: dateOfBirth
        ? seasonYear - new Date(dateOfBirth).getFullYear()
        : 0,

      // Nominator
      nominatedBy,
      nominatedByName,
      ...(initialStatus === "pending-acceptance" ? {} : { nomineeAccepted: true }),

      // Content
      ...(statement?.trim()    ? { statement: statement.trim() }           : {}),
      ...(preferredGrade?.trim() ? { preferredGrade: preferredGrade.trim() } : {}),
      ...(notes?.trim()        ? { notes: notes.trim() }                   : {}),

      // Eligibility audit
      eligibilityChecks: eligibility,

      status: initialStatus,
      nominatedAt: now,
      updatedAt: now,
    };

    await db.collection("rep_nominations").insertOne(nomination);

    return NextResponse.json(
      { ...nomination, _id: undefined },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error("POST /api/admin/nominations/submit error:", error);
    return NextResponse.json({ error: "Failed to submit nomination" }, { status: 500 });
  }
}
