// Blue card verification workflow rules.
//
//  - Any editor can record the card details and nominate an approver (an active member holding the Admin role).
//  - Only an active role-admin member or a super-admin can set the "linked to club" tick and the
//    "last verified" date. Everyone else's changes to those fields are ignored by the server.
//  - If the card's identity details change after a verification, the verification is cleared and the
//    verifier must be asked again.
//  - A request to verify is sent to the nominated approver when one is nominated or the card details change.

type Doc = Record<string, any>;

export const PROTECTED_FIELDS = ["linkedToClub", "linkedDate", "lastVerifiedDate", "verifiedBy", "verifiedByMemberId"] as const;
export const IDENTITY_FIELDS = ["cardType", "category", "status", "cardNumber", "nameOnCard", "issuingState", "issueDate", "expiryDate"] as const;

export interface Actor {
  role?: string;
  scopedRoles?: { role: string; scopeType?: string; scopeId?: string }[];
  clubId?: string | null;
  memberId?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
}

export const memberClubId = (m: Doc) => String(m?.membership?.clubId ?? m?.clubId ?? "");

/** "role-admin" (or plain "admin") member role. */
export const isAdminRole = (r: unknown) => /^(role-)?admin$/i.test(String(r ?? "").trim());

/** An active member who holds the Admin member role. */
export function isActiveRoleAdmin(memberDoc: Doc | null | undefined): boolean {
  if (!memberDoc) return false;
  const roles: unknown[] = [...(memberDoc.roles ?? []), ...(memberDoc.membership?.roles ?? [])];
  if (!roles.some(isAdminRole)) return false;
  const status = memberDoc.membership?.status;
  return status === undefined || status === null || status === "" || ["Active", "Life"].includes(String(status));
}

/** Who may confirm a blue card: super-admin, or an active role-admin (pass the actor's own member record). */
export function canVerifyBlueCard(actor: Actor | null | undefined, actorMember?: Doc | null): boolean {
  if (!actor) return false;
  if (actor.role === "super-admin") return true;
  return isActiveRoleAdmin(actorMember);
}

const actorName = (a: Actor) => a.name || [a.firstName, a.lastName].filter(Boolean).join(" ") || "";
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

export interface BlueCardUpdate {
  blueCard: Doc;
  /** Send the nominated verifier a request to verify. */
  notifyVerifier: boolean;
  verifierMemberId: string | null;
}

export function applyBlueCardUpdate(input: {
  existing: Doc | undefined | null;
  incoming: Doc;
  canVerify: boolean;
  actor: Actor | null | undefined;
  now?: Date;
}): BlueCardUpdate {
  const { existing, incoming, canVerify, actor } = input;
  const now = (input.now ?? new Date()).toISOString();
  const prev = existing ?? {};
  const next: Doc = { ...incoming };

  const identityChanged = IDENTITY_FIELDS.some((f) => !same(prev[f], next[f]));
  const verifierChanged = !same(prev.verifierMemberId, next.verifierMemberId);

  if (!canVerify) {
    // Locked fields can't be changed by anyone else: keep what is stored.
    for (const f of PROTECTED_FIELDS) {
      if (prev[f] === undefined) delete next[f];
      else next[f] = prev[f];
    }
    if (identityChanged && (prev.lastVerifiedDate || prev.linkedToClub)) {
      // The card changed after it was verified, so the old verification no longer applies.
      next.linkedToClub = false;
      next.linkedDate = "";
      next.lastVerifiedDate = "";
      next.verifiedBy = "";
      next.verifiedByMemberId = "";
      next.verificationStatus = "requested";
    }
  } else {
    const verifiedNow = !same(prev.lastVerifiedDate, next.lastVerifiedDate) && !!next.lastVerifiedDate;
    if (verifiedNow) {
      next.verifiedBy = actor ? actorName(actor) : next.verifiedBy;
      next.verifiedByMemberId = actor?.memberId ?? next.verifiedByMemberId ?? "";
      next.verificationStatus = "verified";
    }
  }

  const verifierMemberId = String(next.verifierMemberId ?? "") || null;
  const stillUnverified = next.verificationStatus !== "verified" || identityChanged;
  const notifyVerifier = !!verifierMemberId && stillUnverified && (verifierChanged || identityChanged);
  if (notifyVerifier) {
    next.verificationStatus = "requested";
    next.verificationRequestedAt = now;
    next.verificationRequestedBy = actor ? actorName(actor) : "";
  }
  return { blueCard: next, notifyVerifier, verifierMemberId };
}
