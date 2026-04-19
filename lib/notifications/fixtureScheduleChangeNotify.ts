/**
 * J1 — Email club/team contacts when a published league fixture’s schedule or venue changes.
 */

import { sendEmail, APP_URL } from "@/lib/email/client";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function scheduleOrVenueChanged(input: {
  before: {
    scheduledStart: string | null | undefined;
    venueName: string | null | undefined;
    addressLine: string | null | undefined;
  };
  after: {
    scheduledStart: string | null | undefined;
    venueName: string | null | undefined;
    addressLine: string | null | undefined;
  };
}): boolean {
  const keys = ["scheduledStart", "venueName", "addressLine"] as const;
  for (const k of keys) {
    const a = input.before[k] ?? null;
    const b = input.after[k] ?? null;
    if (String(a) !== String(b)) return true;
  }
  return false;
}

export async function sendFixtureScheduleChangeEmails(input: {
  to: string[];
  competitionLabel: string;
  round: number;
  homeName: string;
  awayName: string;
  fixtureId: string;
  seasonCompetitionId: string;
  /** Plain text from association comms hub — escaped and shown above the standard template. */
  supplementPlain?: string | null;
  before: {
    scheduledStart: string | null | undefined;
    venueName: string | null | undefined;
    addressLine?: string | null | undefined;
  };
  after: {
    scheduledStart: string | null | undefined;
    venueName: string | null | undefined;
    addressLine?: string | null | undefined;
  };
}): Promise<{ sent: number; failed: number }> {
  if (input.to.length === 0) return { sent: 0, failed: 0 };

  const fmt = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleString("en-AU", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "TBC";

  const subject = `Fixture update — ${input.competitionLabel} (R${input.round})`;
  const matchesUrl = `${APP_URL}/competitions/matches`;

  const place = (v: typeof input.before) => {
    const venue = v.venueName?.trim() || "TBC";
    const addr = v.addressLine?.trim();
    return addr ? `${venue} (${addr})` : venue;
  };

  let sent = 0;
  let failed = 0;

  const supplementBlock = (() => {
    const raw = String(input.supplementPlain ?? "").trim();
    if (!raw) return "";
    const body = raw
      .split("\n")
      .map((line) => escapeHtml(line))
      .join("<br/>");
    return `<p style="margin:0 0 14px;line-height:1.45">${body}</p>`;
  })();

  for (const to of input.to) {
    const html = `
      ${supplementBlock}
      <p>The following <strong>published</strong> league fixture has an updated schedule or venue.</p>
      <ul>
        <li><strong>Competition:</strong> ${escapeHtml(input.competitionLabel)}</li>
        <li><strong>Round:</strong> ${input.round}</li>
        <li><strong>Match:</strong> ${escapeHtml(input.homeName)} vs ${escapeHtml(input.awayName)}</li>
        <li><strong>Was:</strong> ${escapeHtml(fmt(input.before.scheduledStart))} · ${escapeHtml(place(input.before))}</li>
        <li><strong>Now:</strong> ${escapeHtml(fmt(input.after.scheduledStart))} · ${escapeHtml(place(input.after))}</li>
      </ul>
      <p><a href="${matchesUrl}">View fixtures</a> on the public site.</p>
      <p style="color:#666;font-size:12px">${escapeHtml(input.fixtureId)} · ${escapeHtml(input.seasonCompetitionId)}</p>
    `;

    const prefix = String(input.supplementPlain ?? "").trim()
      ? `${String(input.supplementPlain).trim()}\n\n`
      : "";
    const r = await sendEmail({
      to,
      subject,
      html,
      text: `${prefix}Fixture updated: ${input.homeName} vs ${input.awayName}. Round ${input.round}. Now: ${fmt(input.after.scheduledStart)} at ${place(input.after)}. ${matchesUrl}`,
    });
    if (r.success) sent++;
    else failed++;
  }

  return { sent, failed };
}
