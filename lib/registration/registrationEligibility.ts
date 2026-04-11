import type { Db } from "mongodb";
import type { RegistrationEligibilitySnapshot } from "@/types/registration";
import { escapeRegex } from "@/lib/utils/regex";

function toDate(v: unknown): Date | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toIso(v: unknown): string | undefined {
  const d = toDate(v);
  return d?.toISOString();
}

function windowState(
  now: Date,
  open?: Date,
  close?: Date,
): {
  state: RegistrationEligibilitySnapshot["windows"]["registration"]["state"];
  open?: string;
  close?: string;
} {
  const o = toIso(open);
  const c = toIso(close);
  if (!open && !close) return { state: "unconfigured", open: o, close: c };
  if (open && now < open) return { state: "before_open", open: o, close: c };
  if (close && now > close) return { state: "after_close", open: o, close: c };
  return { state: "open", open: o, close: c };
}

export async function computeRegistrationEligibility(
  db: Db,
  input: {
    clubId: string;
    seasonYear: string;
    memberId?: string;
    email?: string;
  },
): Promise<RegistrationEligibilitySnapshot> {
  const now = new Date();

  const club = await db.collection("clubs").findOne({
    $or: [{ id: input.clubId }, { slug: input.clubId }],
  });

  if (!club) {
    throw new Error("Club not found");
  }

  const clubId = club.id as string;
  const parentAssociationId = club.parentAssociationId as string | undefined;
  if (!parentAssociationId) {
    throw new Error("Club has no parent association");
  }

  const primary = await db
    .collection("associations")
    .findOne({ associationId: parentAssociationId });

  if (!primary) {
    throw new Error("Parent association not found");
  }

  const settings = (primary.settings ?? {}) as Record<string, unknown>;

  const regOpen = toDate(settings.registrationOpenDate);
  const regClose = toDate(settings.registrationCloseDate);
  const transferOpen = toDate(settings.transferRegistrationOpenDate);
  const transferClose = toDate(settings.transferRegistrationCloseDate);

  const transferWindowFollowsRegistration =
    !transferOpen && !transferClose;

  const registration = windowState(now, regOpen, regClose);
  const transfer = transferWindowFollowsRegistration
    ? { ...registration }
    : windowState(now, transferOpen, transferClose);

  const flags = {
    requiresInsurance: (settings.requiresInsurance as boolean) ?? true,
    requiresClearance: (settings.requiresClearance as boolean) ?? false,
    requiresApproval: (settings.requiresApproval as boolean) ?? false,
    autoApproveReturningPlayers:
      (settings.autoApproveReturningPlayers as boolean) ?? true,
  };

  const base: RegistrationEligibilitySnapshot = {
    clubId,
    seasonYear: input.seasonYear,
    primaryAssociationId: parentAssociationId,
    flags,
    windows: { registration, transfer },
    transferWindowFollowsRegistration,
  };

  let memberQuery: Record<string, unknown> | null = null;
  if (input.memberId) {
    memberQuery = { memberId: input.memberId };
  } else if (input.email) {
    memberQuery = {
      "contact.primaryEmail": {
        $regex: new RegExp(`^${escapeRegex(input.email.trim())}$`, "i"),
      },
    };
  }

  if (!memberQuery) {
    return base;
  }

  const member = await db.collection("members").findOne(memberQuery);
  if (!member) {
    return base;
  }

  const memberId = member.memberId as string;
  const isBanned =
    member.status?.banned === true &&
    member.status?.bannedUntil &&
    new Date(member.status.bannedUntil as string) > now;

  const prevRegs = await db
    .collection("club-registrations")
    .find({ memberId })
    .sort({ seasonYear: -1, registeredDate: -1 })
    .limit(5)
    .toArray();

  const latest = prevRegs[0] as Record<string, unknown> | undefined;
  const lastClubId = latest?.clubId as string | undefined;
  const lastSeasonYear = latest?.seasonYear as string | undefined;

  const isReturningToThisClub =
    prevRegs.some((r) => (r as { clubId?: string }).clubId === clubId);
  const isTransferFromAnotherClub =
    prevRegs.length > 0 && !isReturningToThisClub;

  return {
    ...base,
    member: {
      memberId,
      isReturningToThisClub,
      isTransferFromAnotherClub,
      lastClubId,
      lastSeasonYear,
      isBanned: Boolean(isBanned),
      banReason: member.status?.banReason as string | undefined,
      bannedUntil: member.status?.bannedUntil
        ? new Date(member.status.bannedUntil as string).toISOString()
        : undefined,
    },
  };
}
