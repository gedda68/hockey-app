/**
 * Email member when they are placed on a published team roster (club portal visibility is separate).
 */

import { sendEmail, APP_URL } from "@/lib/email/client";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendTeamSelectionEmail(input: {
  to: string;
  memberDisplayName: string;
  clubName: string;
  teamName: string;
  division: string;
  season: string;
}): Promise<{ success: boolean; error?: string }> {
  const portalUrl = APP_URL;
  const html = `
    <p>Hi ${escapeHtml(input.memberDisplayName)},</p>
    <p>You have been <strong>selected</strong> for <strong>${escapeHtml(input.teamName)}</strong> at ${escapeHtml(input.clubName)}.</p>
    <p>Division: ${escapeHtml(input.division)} · Season ${escapeHtml(input.season)}</p>
    <p><a href="${portalUrl}">Open member portal</a></p>
    <p style="color:#666;font-size:12px">If this is unexpected, contact your club registrar.</p>
  `;

  return sendEmail({
    to: input.to,
    subject: `Team selection — ${input.teamName}`,
    html,
    text: `Hi ${input.memberDisplayName}, you were selected for ${input.teamName} (${input.division}, ${input.season}) at ${input.clubName}.`,
  });
}
