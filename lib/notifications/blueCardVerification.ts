// Workflow notification: asks the nominated club admin to verify a member's blue card.
// Creates an in-app notification (shown in the admin banner) and sends an email when the verifier has one.

import type { Db } from "mongodb";
import { randomUUID } from "node:crypto";
import { sendEmail } from "@/lib/email/client";
import { buildBlueCardVerificationEmail } from "@/lib/email/templates/blueCardVerification";

type Doc = Record<string, any>;

export async function notifyBlueCardVerifier(
  db: Db,
  input: { member: Doc; verifierMemberId: string; requestedBy?: string; clubName?: string },
): Promise<{ inApp: boolean; email: boolean; error?: string }> {
  const { member, verifierMemberId } = input;
  const verifier = await db.collection("members").findOne({ memberId: verifierMemberId });
  if (!verifier) return { inApp: false, email: false, error: "Verifier not found" };

  const memberName = `${member.personalInfo?.firstName ?? ""} ${member.personalInfo?.lastName ?? ""}`.trim() || member.memberId;
  const clubId = String(member.membership?.clubId ?? member.clubId ?? "");
  const now = new Date();
  const link = `/admin/members/${encodeURIComponent(member.memberId)}/edit`;

  await db.collection("member_notifications").insertOne({
    notificationId: `notif-${randomUUID()}`,
    memberId: verifierMemberId,
    type: "blue_card_verification",
    subjectMemberId: member.memberId,
    title: "Blue card verification",
    message: `${memberName}'s blue card needs to be verified.`,
    link,
    clubId,
    clubName: input.clubName ?? "",
    createdAt: now.toISOString(),
    dismissedAt: null,
    expiresAt: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
  });

  const to = String(verifier.contact?.primaryEmail ?? verifier.contact?.email ?? "").trim();
  if (!to) return { inApp: true, email: false };
  const mail = buildBlueCardVerificationEmail({
    verifierFirstName: String(verifier.personalInfo?.firstName ?? ""),
    memberName,
    memberId: String(member.memberId),
    clubName: input.clubName,
    requestedBy: input.requestedBy,
  });
  const sent = await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text });
  return { inApp: true, email: sent.success, error: sent.error };
}
