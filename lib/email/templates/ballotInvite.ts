/**
 * lib/email/templates/ballotInvite.ts
 *
 * HTML + plain-text email sent to each eligible voter when a ballot opens
 * (either the first ballot or a second/tiebreaker ballot after a deadlock).
 *
 * The CTA links directly to /admin/ballots/[ballotId] where the voter can
 * read candidate statements and cast their single vote.
 */

import { APP_URL } from "@/lib/email/client";

export interface BallotInviteOptions {
  /** Voter's display name (first name preferred) */
  voterName: string;
  /** The nomination window title, e.g. "Club Secretary 2026" */
  windowTitle: string;
  /** Optional human-readable position label, e.g. "Club Secretary" */
  positionTitle?: string;
  /** Name of the organisation running the ballot */
  scopeName: string;
  /** Display names of all candidates on the ballot */
  candidateNames: string[];
  /** ISO datetime when voting closes */
  closeAt: string;
  /** The ballot document ID (used to build the vote URL) */
  ballotId: string;
  /** 1 = first ballot; 2 = second / tiebreaker ballot */
  ballotNumber: 1 | 2;
}

export function buildBallotInviteEmail(
  opts: BallotInviteOptions,
): { subject: string; html: string; text: string } {
  const {
    voterName,
    windowTitle,
    positionTitle,
    scopeName,
    candidateNames,
    closeAt,
    ballotId,
    ballotNumber,
  } = opts;

  const voteUrl = `${APP_URL}/admin/ballots/${encodeURIComponent(ballotId)}`;

  const closeDateFormatted = new Date(closeAt).toLocaleString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const isTiebreaker = ballotNumber === 2;

  const subject = isTiebreaker
    ? `Tiebreaker ballot open: ${windowTitle} — your vote is needed`
    : `You're invited to vote: ${windowTitle} — ${scopeName}`;

  const candidateListHtml = candidateNames
    .map((n) => `<li style="padding:4px 0;color:#1e293b;font-size:14px;">${n}</li>`)
    .join("");

  const candidateListText = candidateNames.map((n) => `  • ${n}`).join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#06054e;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900;letter-spacing:1px;">
                🗳️ HOCKEY APP
              </h1>
              <p style="color:#a5b4fc;margin:8px 0 0;font-size:14px;">
                ${isTiebreaker ? "Tiebreaker Ballot" : "Ballot Invitation"}
              </p>
            </td>
          </tr>

          <!-- Window / position banner -->
          <tr>
            <td style="background:#eef2ff;border-bottom:2px solid #818cf8;padding:20px 40px;text-align:center;">
              <p style="color:#1e1b4b;font-size:20px;font-weight:800;margin:0;">
                ${windowTitle}
              </p>
              ${positionTitle ? `<p style="color:#4f46e5;font-size:14px;font-weight:600;margin:4px 0 0;">${positionTitle} — ${scopeName}</p>` : `<p style="color:#4f46e5;font-size:14px;font-weight:600;margin:4px 0 0;">${scopeName}</p>`}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#1e293b;font-size:16px;font-weight:700;margin:0 0 12px;">
                Hi ${voterName},
              </p>

              ${isTiebreaker
                ? `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
                     The first ballot ended in a <strong>tie</strong>. A tiebreaker ballot has been
                     opened with the tied candidates. As an eligible voter, you are invited to
                     cast your vote again.
                   </p>`
                : `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">
                     A ballot has opened for <strong>${positionTitle ?? windowTitle}</strong> at
                     <strong>${scopeName}</strong>. As an eligible voter, you are invited to cast
                     your vote.
                   </p>`
              }

              <!-- Candidates -->
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
                <p style="color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">
                  Candidates on the ballot
                </p>
                <ul style="margin:0;padding-left:20px;">
                  ${candidateListHtml}
                </ul>
              </div>

              <!-- Closing deadline -->
              <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:14px 18px;margin-bottom:32px;">
                <p style="color:#713f12;font-size:13px;font-weight:600;margin:0;">
                  ⏰ Voting closes: <strong>${closeDateFormatted}</strong>
                </p>
              </div>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#06054e;border-radius:12px;padding:0;">
                    <a href="${voteUrl}"
                       style="display:inline-block;padding:16px 36px;color:#ffffff;
                              font-size:16px;font-weight:900;text-decoration:none;
                              letter-spacing:0.5px;">
                      Cast My Vote →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0 0 8px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 32px;">
                <a href="${voteUrl}" style="color:#4f46e5;font-size:12px;word-break:break-all;">
                  ${voteUrl}
                </a>
              </p>

              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                Your vote is <strong>private</strong> — individual votes are never disclosed.
                You can only vote once. If you were not expecting this invitation, please
                contact your ${scopeName} administrator.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="color:#94a3b8;font-size:12px;margin:0;">
                Sent via Hockey App · ${scopeName}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `
Hi ${voterName},

${isTiebreaker
  ? `The first ballot for "${windowTitle}" ended in a tie. A tiebreaker ballot has opened.`
  : `A ballot has opened for "${positionTitle ?? windowTitle}" at ${scopeName}.`}

Candidates:
${candidateListText}

Voting closes: ${closeDateFormatted}

Cast your vote here:
${voteUrl}

Your vote is private. You can only vote once.

— Hockey App · ${scopeName}
`.trim();

  return { subject, html, text };
}
