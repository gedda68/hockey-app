/**
 * lib/ballots/sendBallotInvites.ts
 *
 * Pure helper — fetches eligible voter contact details and dispatches ballot
 * invitation emails (fire-and-forget, one per voter).
 *
 * Called from two places:
 *   1. POST /api/admin/ballots          — first ballot (or explicit second ballot)
 *   2. POST /api/admin/ballots/[id]/close — when a second/tiebreaker ballot is
 *      auto-created after a deadlock
 *
 * Design notes:
 *   • Voter lookup queries users OR members depending on the window's electorateType.
 *   • All sends are fire-and-forget via Promise.allSettled — a failed email never
 *     blocks the API response.
 *   • Individual send failures are logged to stderr but do not propagate.
 *   • The function itself is async but its caller should NOT await it when used in
 *     a fire-and-forget context (just call without await).
 */

import type { Db } from "mongodb";
import { sendEmail } from "@/lib/email/client";
import { buildBallotInviteEmail } from "@/lib/email/templates/ballotInvite";
import type { Ballot, NominationWindow } from "@/types/nominations";

interface VoterContact {
  id:    string;
  name:  string;
  email: string;
}

/**
 * Look up email addresses for all eligible voters in a ballot.
 *
 * Committee electorate  → queries `users` collection by userId.
 * All-members electorate → queries `members` collection by memberId.
 */
async function resolveVoterContacts(
  db: Db,
  voterIds: string[],
  electorateType: "committee" | "all-members" = "committee",
): Promise<VoterContact[]> {
  if (voterIds.length === 0) return [];

  if (electorateType === "all-members") {
    const docs = await db
      .collection("members")
      .find(
        { memberId: { $in: voterIds } },
        { projection: { memberId: 1, "personalInfo.firstName": 1, "personalInfo.lastName": 1, "contact.email": 1 } },
      )
      .toArray();

    return docs
      .filter((d) => d.contact?.email)
      .map((d) => ({
        id:    String(d.memberId ?? ""),
        name:  [d.personalInfo?.firstName, d.personalInfo?.lastName]
                 .filter(Boolean)
                 .join(" ") || "Member",
        email: String(d.contact.email).trim().toLowerCase(),
      }));
  }

  // Committee (default): look up users
  const docs = await db
    .collection("users")
    .find(
      { userId: { $in: voterIds } },
      { projection: { userId: 1, email: 1, firstName: 1, lastName: 1, name: 1 } },
    )
    .toArray();

  return docs
    .filter((d) => d.email)
    .map((d) => ({
      id:    String(d.userId ?? ""),
      name:  String(d.name || [d.firstName, d.lastName].filter(Boolean).join(" ") || "Member"),
      email: String(d.email).trim().toLowerCase(),
    }));
}

/**
 * Fetch candidate display names for the ballot.
 */
async function resolveCandidateNames(
  db: Db,
  candidateNominationIds: string[],
): Promise<string[]> {
  if (candidateNominationIds.length === 0) return [];

  const noms = await db
    .collection("rep_nominations")
    .find(
      { nominationId: { $in: candidateNominationIds } },
      { projection: { nomineeName: 1, memberName: 1 } },
    )
    .toArray();

  return noms.map((n) => String(n.nomineeName || n.memberName || "Unknown"));
}

/**
 * Send ballot invitation emails to all eligible voters.
 *
 * Returns a promise that resolves when all sends have settled (successes and
 * failures). Individual failures are logged but do not reject the promise.
 *
 * @param db              MongoDB Db instance
 * @param ballot          The ballot document that was just created/opened
 * @param win             The parent nomination window
 */
export async function sendBallotInvites(
  db: Db,
  ballot: Ballot,
  win: NominationWindow,
): Promise<void> {
  try {
    const electorateType = win.electorateType ?? "committee";

    const [voters, candidateNames] = await Promise.all([
      resolveVoterContacts(db, ballot.eligibleVoterIds, electorateType),
      resolveCandidateNames(db, ballot.candidateNominationIds),
    ]);

    if (voters.length === 0) {
      console.warn(
        `[ballot-invites] No voter contacts resolved for ballot ${ballot.ballotId} — no emails sent`,
      );
      return;
    }

    const sends = voters.map(({ name, email }) => {
      const payload = buildBallotInviteEmail({
        voterName:      name,
        windowTitle:    win.title,
        positionTitle:  win.positionTitle,
        scopeName:      win.scopeName,
        candidateNames,
        closeAt:        ballot.closeAt,
        ballotId:       ballot.ballotId,
        ballotNumber:   ballot.ballotNumber,
      });

      return sendEmail({ to: email, subject: payload.subject, html: payload.html, text: payload.text })
        .then((result) => {
          if (!result.success) {
            console.error(
              `[ballot-invites] send failed for ${email} (ballot ${ballot.ballotId}): ${result.error}`,
            );
          }
        })
        .catch((err: unknown) => {
          console.error(
            `[ballot-invites] unexpected error sending to ${email} (ballot ${ballot.ballotId}):`,
            err,
          );
        });
    });

    await Promise.allSettled(sends);

    console.info(
      `[ballot-invites] dispatched ${voters.length} invite(s) for ballot ${ballot.ballotId}`,
    );
  } catch (err: unknown) {
    // Never let an email error crash the API response
    console.error(`[ballot-invites] fatal error for ballot ${ballot.ballotId}:`, err);
  }
}
