import { APP_URL } from "@/lib/email/client";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildBlueCardVerificationEmail(opts: {
  verifierFirstName: string;
  memberName: string;
  memberId: string;
  clubName?: string;
  requestedBy?: string;
}): { subject: string; html: string; text: string } {
  const url = `${APP_URL}/admin/members/${encodeURIComponent(opts.memberId)}/edit`;
  const subject = `Blue card verification needed — ${opts.memberName}`;
  const html = `
    <p>Hi ${esc(opts.verifierFirstName || "there")},</p>
    <p>${esc(opts.requestedBy || "A colleague")} has asked you to verify the blue card for
       <strong>${esc(opts.memberName)}</strong>${opts.clubName ? ` (${esc(opts.clubName)})` : ""}.</p>
    <p>Please check the card with Blue Card Services, then open the member's record and update
       <em>Linked to club</em> and <em>Last verified</em>.</p>
    <p><a href="${url}">Open the member's blue card details</a></p>
  `;
  const text = `Hi ${opts.verifierFirstName || "there"}, please verify the blue card for ${opts.memberName}. Open: ${url}`;
  return { subject, html, text };
}
