// PATCH /api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]
// Update venue, schedule, publish state (E2).

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import clientPromise from "@/lib/mongodb";
import {
  requireAnyPermission,
  requireResourceAccess,
} from "@/lib/auth/middleware";
import { PatchLeagueFixtureBodySchema } from "@/lib/db/schemas/leagueFixture.schema";
import { logPlatformAudit } from "@/lib/audit/platformAuditLog";
import { invalidateStandingsBundleCache } from "@/lib/competitions/standingsReadCache";
import {
  evaluateFixtureUmpireAssignments,
  slotHasValidCoiOverride,
} from "@/lib/officiating/umpireCoiAndAvailability";
import {
  applyUmpireAssignmentEmailNotifications,
  type UmpireSlotInput,
} from "@/lib/officiating/umpireAssignmentNotify";
import { APP_URL } from "@/lib/email/client";
import {
  scheduleOrVenueChanged,
  sendFixtureScheduleChangeEmails,
} from "@/lib/notifications/fixtureScheduleChangeNotify";
import { collectFanFixtureChangeEmails } from "@/lib/notifications/fanFixtureFollowers";
import { sendFanFixturePushForFollowedTeams } from "@/lib/notifications/fanFixturePushNotify";
import {
  assertPublishedPitchSchedule,
  resolvePitchVenueForAssociation,
  type ResolvedPitchVenue,
} from "@/lib/competitions/pitchScheduleConflict";

type Params = {
  params: Promise<{ seasonCompetitionId: string; fixtureId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { user, response } = await requireAnyPermission(request, [
    "competitions.manage",
    "competitions.fixtures",
  ]);
  if (response) return response;

  try {
    const { seasonCompetitionId, fixtureId } = await params;
    const body = PatchLeagueFixtureBodySchema.parse(await request.json());

    const client = await clientPromise;
    const db = client.db("hockey-app");

    const sc = await db.collection("season_competitions").findOne({
      seasonCompetitionId,
    });
    if (!sc) {
      return NextResponse.json(
        { error: "Season competition not found" },
        { status: 404 },
      );
    }

    const scope = await requireResourceAccess(
      request,
      "association",
      sc.owningAssociationId as string,
    );
    if (scope.response) return scope.response;

    const existing = await db.collection("league_fixtures").findOne({
      fixtureId,
      seasonCompetitionId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Fixture not found" }, { status: 404 });
    }

    const associationId = sc.owningAssociationId as string;

    if (body.umpires !== undefined) {
      const proposedUmpires = body.umpires ?? [];
      const homeTeamId = existing.homeTeamId as string;
      const awayTeamId = existing.awayTeamId as string;
      const { slots } = await evaluateFixtureUmpireAssignments(db, {
        associationId,
        homeTeamId,
        awayTeamId,
        proposedUmpires,
      });
      const conflicts = slots.filter((s) => s.blockingIssues.length > 0);
      if (conflicts.length > 0) {
        const unresolved = conflicts.filter((s) => {
          const slot = proposedUmpires[s.index];
          return !slotHasValidCoiOverride(slot);
        });
        if (unresolved.length > 0) {
          return NextResponse.json(
            {
              error:
                "Umpire assignment blocked by availability or conflict-of-interest. Provide coiOverride and coiOverrideReason (min 15 characters) per blocked slot when no suitable alternative exists.",
              code: "UMPIRE_COI_OR_AVAILABILITY",
              slots,
            },
            { status: 409 },
          );
        }
      }
    }

    let patchClearsPitch = false;
    let patchSetsPitchId: string | null = null;
    let resolvedForPitch: ResolvedPitchVenue | null = null;

    if (body.pitchId !== undefined) {
      const trimmed =
        body.pitchId === null ? "" : typeof body.pitchId === "string" ? body.pitchId.trim() : "";
      if (!trimmed) {
        patchClearsPitch = true;
      } else {
        const r = await resolvePitchVenueForAssociation(db, associationId, trimmed);
        if (!r) {
          return NextResponse.json(
            { error: "Unknown or inactive pitch for this association." },
            { status: 400 },
          );
        }
        if (
          body.venueId !== undefined &&
          body.venueId !== null &&
          String(body.venueId) !== r.venueId
        ) {
          return NextResponse.json(
            { error: "venueId does not match the venue for the selected pitch." },
            { status: 400 },
          );
        }
        patchSetsPitchId = trimmed;
        resolvedForPitch = r;
      }
    }

    const existingPitch =
      typeof existing.pitchId === "string" && existing.pitchId.trim()
        ? existing.pitchId.trim()
        : null;
    const nextPitchId = patchClearsPitch
      ? null
      : patchSetsPitchId
        ? patchSetsPitchId
        : existingPitch;

    const nextPublished =
      body.published !== undefined ? Boolean(body.published) : Boolean(existing.published);
    const nextStart =
      body.scheduledStart !== undefined
        ? body.scheduledStart
        : (existing.scheduledStart as string | null | undefined);
    const nextEnd =
      body.scheduledEnd !== undefined
        ? body.scheduledEnd
        : (existing.scheduledEnd as string | null | undefined);
    const nextStatus =
      body.status !== undefined ? body.status : (existing.status as string | null | undefined);

    const schedCheck = await assertPublishedPitchSchedule(db, {
      owningAssociationId: associationId,
      seasonCompetitionId,
      fixtureId,
      pitchId: nextPitchId,
      published: nextPublished,
      scheduledStart: nextStart as string | null | undefined,
      scheduledEnd: nextEnd as string | null | undefined,
      status: nextStatus,
    });
    if (!schedCheck.ok) {
      return NextResponse.json(
        {
          error: schedCheck.error,
          code: "PITCH_SCHEDULE_CONFLICT",
          conflictFixtureId: schedCheck.conflictFixtureId,
        },
        { status: 409 },
      );
    }

    const nowIso = new Date().toISOString();
    const $set: Record<string, unknown> = {
      updatedAt: nowIso,
      updatedBy: user.userId,
    };

    let umpiresToPersist = body.umpires;
    if (body.umpires != null && body.notifyAssignedUmpires) {
      const umpires = body.umpires;
      const notifySlots: UmpireSlotInput[] = umpires.map((u) => ({
        umpireType: u.umpireType,
        umpireId: u.umpireId,
        isStandby: u.isStandby ?? false,
        dateNotified: u.dateNotified,
        allocationStatus: u.allocationStatus,
      }));
      const notified = await applyUmpireAssignmentEmailNotifications({
        db,
        associationId: sc.owningAssociationId as string,
        umpires: notifySlots,
        fixtureSummary: {
          fixtureId,
          seasonCompetitionId,
          scheduledStart:
            (body.scheduledStart !== undefined
              ? body.scheduledStart
              : (existing.scheduledStart as string | null)) ?? null,
          venueName:
            (body.venueName !== undefined
              ? body.venueName
              : (existing.venueName as string | null)) ?? null,
          round: existing.round as number,
        },
      });
      umpiresToPersist = umpires.map((orig, i) => ({
        ...orig,
        dateNotified: notified[i]?.dateNotified ?? orig.dateNotified,
      }));
    }

    const keys = [
      "venueId",
      "venueName",
      "addressLine",
      "scheduledStart",
      "scheduledEnd",
      "timezone",
      "status",
      "legacyMatchId",
      "matchLevel",
    ] as const;
    for (const k of keys) {
      if (body[k] !== undefined) $set[k] = body[k];
    }
    if (patchSetsPitchId && resolvedForPitch) {
      $set.pitchId = patchSetsPitchId;
      $set.venueId = resolvedForPitch.venueId;
      $set.venueName = resolvedForPitch.venueName;
      $set.addressLine = resolvedForPitch.addressLine || null;
    } else if (patchClearsPitch) {
      $set.pitchId = null;
    }
    if (body.umpires !== undefined) {
      $set.umpires = umpiresToPersist;
    }

    if (body.published !== undefined) {
      $set.published = body.published;
      $set.publishedAt = body.published ? nowIso : null;
    }

    await db
      .collection("league_fixtures")
      .updateOne({ fixtureId, seasonCompetitionId }, { $set });

    const updated = await db.collection("league_fixtures").findOne({
      fixtureId,
      seasonCompetitionId,
    });

    invalidateStandingsBundleCache(seasonCompetitionId);

    const coiOverrides =
      (body.umpires ?? []).flatMap((s, i) =>
        s.coiOverride && String(s.coiOverrideReason ?? "").trim().length >= 15
          ? [
              {
                index: i,
                umpireId: s.umpireId,
                coiOverrideReason: String(s.coiOverrideReason ?? "").trim(),
              },
            ]
          : [],
      ) ?? [];

    await logPlatformAudit({
      userId: user.userId,
      userEmail: user.email,
      category: "fixture",
      action: "patch",
      resourceType: "fixture",
      resourceId: fixtureId,
      summary: `Updated fixture (seasonCompetition=${seasonCompetitionId})`,
      before: {
        venueName: existing.venueName,
        pitchId: existing.pitchId,
        scheduledStart: existing.scheduledStart,
        published: existing.published,
        status: existing.status,
      },
      after: {
        venueName: updated?.venueName,
        pitchId: updated?.pitchId,
        scheduledStart: updated?.scheduledStart,
        published: updated?.published,
        status: updated?.status,
      },
      metadata: {
        seasonCompetitionId,
        owningAssociationId: sc.owningAssociationId,
        ...(coiOverrides.length ? { coiOverrides } : {}),
      },
    });

    if (body.notifyScheduleChange && updated?.published) {
      const beforeLoc = {
        scheduledStart: existing.scheduledStart as string | null | undefined,
        venueName: existing.venueName as string | null | undefined,
        addressLine: existing.addressLine as string | null | undefined,
      };
      const afterLoc = {
        scheduledStart: updated.scheduledStart as string | null | undefined,
        venueName: updated.venueName as string | null | undefined,
        addressLine: updated.addressLine as string | null | undefined,
      };
      if (scheduleOrVenueChanged({ before: beforeLoc, after: afterLoc })) {
        const homeTeamId = String(updated.homeTeamId ?? "");
        const awayTeamId = String(updated.awayTeamId ?? "");
        const [home, away] = await Promise.all([
          homeTeamId
            ? db.collection("teams").findOne({ teamId: homeTeamId })
            : null,
          awayTeamId
            ? db.collection("teams").findOne({ teamId: awayTeamId })
            : null,
        ]);
        const homeName = String(home?.name ?? homeTeamId);
        const awayName = String(away?.name ?? awayTeamId);
        const label = String(
          (sc as { displayName?: string }).displayName ??
            (sc as { competitionName?: string }).competitionName ??
            (sc as { competitionId?: string }).competitionId ??
            seasonCompetitionId,
        );
        const fanTo = await collectFanFixtureChangeEmails(db, {
          homeTeamId,
          awayTeamId,
        });
        const adminTo = Array.isArray(body.scheduleChangeNotifyEmails)
          ? body.scheduleChangeNotifyEmails
          : [];
        const toSet = new Set<string>();
        for (const e of [...adminTo, ...fanTo]) {
          const x = String(e ?? "").trim();
          if (x) toSet.add(x);
        }
        await sendFixtureScheduleChangeEmails({
          to: [...toSet],
          competitionLabel: label,
          round: Number(updated.round ?? 0),
          homeName,
          awayName,
          fixtureId,
          seasonCompetitionId,
          before: beforeLoc,
          after: afterLoc,
        });

        const fmtShort = (iso: string | null | undefined) =>
          iso
            ? new Date(iso).toLocaleString("en-AU", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "TBC";
        const place = (v: typeof afterLoc) => {
          const venue = v.venueName?.trim() || "TBC";
          const addr = v.addressLine?.trim();
          return addr ? `${venue} (${addr})` : venue;
        };
        void sendFanFixturePushForFollowedTeams(db, {
          homeTeamId,
          awayTeamId,
          payload: {
            title: `Fixture update — ${label}`,
            body: `${homeName} vs ${awayName} · R${Number(updated.round ?? 0)} · ${fmtShort(afterLoc.scheduledStart)} · ${place(afterLoc)}`,
            url: `${APP_URL}/competitions/matches`,
          },
        });
      }
    }

    return NextResponse.json({
      ...updated,
      _id: updated?._id?.toString?.(),
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("PATCH admin fixture error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
