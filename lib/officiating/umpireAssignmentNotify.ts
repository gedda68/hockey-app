// F3 follow-up — Email officials when assigned to a fixture (Resend).

import type { Db } from "mongodb";
import { sendEmail, APP_URL } from "@/lib/email/client";

const REGISTER_COL = "association_official_register";

export type UmpireSlotInput = {
  umpireType: string;
  umpireId: string;
  isStandby?: boolean;
  dateNotified?: string | null;
  allocationStatus?: string;
};

function memberEmailFromDoc(member: Record<string, unknown> | null): string | null {
  if (!member) return null;
  const contact = member.contact as Record<string, unknown> | undefined;
  const primary = contact?.primaryEmail;
  const legacy = contact?.email;
  const top = member.primaryEmail;
  for (const v of [primary, legacy, top]) {
    if (typeof v === "string" && v.includes("@")) return v.trim();
  }
  return null;
}

/**
 * For each non-standby slot with an umpireId, if there is no dateNotified yet, look up the
 * official register + member email and send a short assignment email. Sets `dateNotified` on
 * success (email configured and send succeeded).
 */
export async function applyUmpireAssignmentEmailNotifications(input: {
  db: Db;
  associationId: string;
  umpires: UmpireSlotInput[];
  fixtureSummary: {
    fixtureId: string;
    seasonCompetitionId: string;
    scheduledStart?: string | null;
    venueName?: string | null;
    round?: number;
  };
}): Promise<UmpireSlotInput[]> {
  const nowIso = new Date().toISOString();
  const out: UmpireSlotInput[] = [];

  for (const slot of input.umpires) {
    const copy = { ...slot };
    out.push(copy);

    if (slot.isStandby) continue;
    if (!slot.umpireId?.trim()) continue;
    if (slot.dateNotified) continue;

    const reg = await input.db.collection(REGISTER_COL).findOne({
      associationId: input.associationId,
      isActive: { $ne: false },
      $or: [{ memberId: slot.umpireId }, { umpireNumber: slot.umpireId }],
    });

    const memberId =
      reg && typeof reg.memberId === "string" && reg.memberId.trim()
        ? reg.memberId.trim()
        : null;

    if (!memberId) continue;

    const member = (await input.db
      .collection("members")
      .findOne({ memberId })) as Record<string, unknown> | null;

    const to = memberEmailFromDoc(member);
    if (!to) continue;

    const when = input.fixtureSummary.scheduledStart
      ? new Date(input.fixtureSummary.scheduledStart).toLocaleString("en-AU", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "TBC";
    const venue = input.fixtureSummary.venueName?.trim() || "TBC";
    const round = input.fixtureSummary.round ?? "?";
    const name =
      (reg && typeof reg.displayName === "string" && reg.displayName.trim()) ||
      "Umpire";

    const selfUrl = `${APP_URL}/my-umpiring`;

    const html = `
      <p>Hi ${escapeHtml(name)},</p>
      <p>You have been <strong>assigned</strong> as <strong>${escapeHtml(slot.umpireType)}</strong> for a competition fixture.</p>
      <ul>
        <li><strong>Round:</strong> ${escapeHtml(String(round))}</li>
        <li><strong>When:</strong> ${escapeHtml(when)}</li>
        <li><strong>Venue:</strong> ${escapeHtml(venue)}</li>
      </ul>
      <p>Open <a href="${selfUrl}">My umpiring</a> to accept or decline if your association uses that workflow.</p>
      <p style="color:#666;font-size:12px">Fixture ${escapeHtml(input.fixtureSummary.fixtureId)} · ${escapeHtml(input.fixtureSummary.seasonCompetitionId)}</p>
    `;

    const result = await sendEmail({
      to,
      subject: `Umpire assignment — ${input.fixtureSummary.seasonCompetitionId} (R${round})`,
      html,
      text: `You are assigned as ${slot.umpireType} for round ${round}. When: ${when}. Venue: ${venue}. Visit ${selfUrl}`,
    });

    if (result.success) {
      copy.dateNotified = nowIso;
    }
  }

  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
