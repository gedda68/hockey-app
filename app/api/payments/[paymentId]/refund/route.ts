/**
 * POST /api/payments/[paymentId]/refund
 *
 * Initiates a refund against a completed payment.  Supports both Stripe-gateway
 * refunds and manual adjustment records (for cash / bank-transfer payments).
 *
 * ── Auth ──────────────────────────────────────────────────────────────────────
 *   Requires club.fees, association.fees, or system.manage permission.
 *   Scope-guarded: the caller must have mutation access to the payment's scope
 *   (same guard as PATCH /api/payments/[paymentId]).
 *
 * ── Anti-nepotism ─────────────────────────────────────────────────────────────
 *   `reason` is MANDATORY — an empty or missing reason is rejected with 400.
 *   The reason, admin name, role, and timestamp are stored in a `refundAudit`
 *   sub-document on the payment record, mirroring the fee-waiver audit trail.
 *   The reason is also surfaced verbatim in the confirmation email sent to the
 *   member, creating a visible paper trail.
 *
 * ── Stripe path ───────────────────────────────────────────────────────────────
 *   When PAYMENT_GATEWAY_MODE=stripe and the payment has a
 *   `stripePaymentIntentId`, calls `stripe.refunds.create()`.  Passes the
 *   reason in `metadata` (Stripe's `reason` param is limited to three values;
 *   we always use "requested_by_customer").  On Stripe success the DB is
 *   updated and a `charge.refunded` webhook will eventually arrive — the
 *   webhook handler (P3) guards with `if (payment.status === "refunded")` so
 *   double-processing is prevented.
 *
 * ── Manual path ───────────────────────────────────────────────────────────────
 *   When the payment has no Stripe reference (cash, bank transfer, simulated)
 *   the DB is updated directly without calling the Stripe API.
 *
 * ── DB side-effects ───────────────────────────────────────────────────────────
 *   • payments       — status, refundAmountCents, refundedAt, refundAudit, …
 *   • role_requests  — full refund only: status → pending_payment, feePaid=false
 *
 * ── Body ──────────────────────────────────────────────────────────────────────
 *   { reason: string; amountCents?: number }
 *   amountCents: partial refund amount in cents (omit for full refund)
 *
 * ── Response ──────────────────────────────────────────────────────────────────
 *   200 { refundId?, amountCents, partial, message }
 *   400 reason missing / payment not refundable / amount invalid
 *   401/403 auth / scope
 *   404 payment not found
 *   502 Stripe API error
 */

import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { requireAnyPermission } from "@/lib/auth/middleware";
import { assertPaymentMutationAccess } from "@/lib/auth/scopeGuard";
import { getPaymentGatewayMode } from "@/lib/payments/paymentGateway";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import { sendEmail } from "@/lib/email/client";
import { buildPaymentRefundEmail } from "@/lib/email/templates/paymentRefund";

type Params = { params: Promise<{ paymentId: string }> };

/** Statuses that are eligible for a refund */
const REFUNDABLE_STATUSES = new Set(["paid", "partially_refunded"]);

export async function POST(request: NextRequest, { params }: Params) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const { user, response: authError } = await requireAnyPermission(request, [
    "club.fees",
    "association.fees",
    "system.manage",
  ]);
  if (authError) return authError;

  try {
    const { paymentId } = await params;

    // ── Parse body ─────────────────────────────────────────────────────────────
    let body: { reason?: string; amountCents?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const reason = body.reason?.trim();
    if (!reason) {
      return NextResponse.json(
        { error: "A refund reason is required" },
        { status: 400 },
      );
    }

    // ── Load payment ───────────────────────────────────────────────────────────
    const client = await clientPromise;
    const db     = client.db(process.env.DB_NAME ?? "hockey-app");

    const payment = await db.collection("payments").findOne({ paymentId });
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // ── Refundability check ───────────────────────────────────────────────────
    if (!REFUNDABLE_STATUSES.has(payment.status as string)) {
      return NextResponse.json(
        {
          error: `Payment cannot be refunded — current status is "${payment.status}". ` +
                 `Only "paid" or "partially_refunded" payments are eligible.`,
        },
        { status: 400 },
      );
    }

    // ── Scope guard ───────────────────────────────────────────────────────────
    const scopeError = await assertPaymentMutationAccess(
      user,
      payment.memberId as string,
      payment.clubId as string | undefined,
    );
    if (scopeError) return scopeError;

    // ── Resolve refund amount ─────────────────────────────────────────────────
    const totalPaid         = (payment.amountCents as number) ?? Math.round((payment.amount as number) * 100);
    const alreadyRefunded   = (payment.refundAmountCents as number) ?? 0;
    const remainingRefundable = totalPaid - alreadyRefunded;

    const refundAmountCents = body.amountCents != null
      ? Math.round(body.amountCents)
      : remainingRefundable;

    if (refundAmountCents <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be greater than zero" },
        { status: 400 },
      );
    }
    if (refundAmountCents > remainingRefundable) {
      return NextResponse.json(
        {
          error: `Refund amount (${refundAmountCents}¢) exceeds the remaining refundable ` +
                 `balance (${remainingRefundable}¢)`,
        },
        { status: 400 },
      );
    }

    const now            = new Date();
    const partial        = refundAmountCents < totalPaid;
    const newTotalRefund = alreadyRefunded + refundAmountCents;
    const newStatus      = newTotalRefund >= totalPaid ? "refunded" : "partially_refunded";

    // ── Audit trail (mirrors FeeWaiver structure) ─────────────────────────────
    const adminName   = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const refundAudit = {
      refundedBy:     user.userId,
      refundedByName: adminName,
      refundedByRole: user.role,
      refundedAt:     now.toISOString(),
      reason,
      amountCents:    refundAmountCents,
    };

    // ── Stripe refund (when gateway=stripe and payment has a PaymentIntent) ───
    let stripeRefundId: string | null = null;

    const hasStripeIntent =
      typeof payment.stripePaymentIntentId === "string" &&
      payment.stripePaymentIntentId.startsWith("pi_");

    if (
      getPaymentGatewayMode() === "stripe" &&
      isStripeConfigured() &&
      hasStripeIntent
    ) {
      try {
        const stripe       = getStripe();
        const stripeRefund = await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId as string,
          amount:         refundAmountCents,
          reason:         "requested_by_customer",
          metadata: {
            paymentId,
            refundedBy:   user.userId,
            refundReason: reason.slice(0, 500), // Stripe metadata value limit
          },
        });
        stripeRefundId = stripeRefund.id;
      } catch (stripeErr: unknown) {
        const msg = stripeErr instanceof Error ? stripeErr.message : "Stripe refund failed";
        console.error("[refund] Stripe error:", stripeErr);
        return NextResponse.json(
          { error: `Stripe API error: ${msg}` },
          { status: 502 },
        );
      }
    }

    // ── Update payment record ─────────────────────────────────────────────────
    await db.collection("payments").updateOne(
      { paymentId },
      {
        $set: {
          status:            newStatus,
          refundAmountCents: newTotalRefund,
          refundedAt:        now,
          refundAudit,
          ...(stripeRefundId ? { stripeRefundId } : {}),
          updatedAt:         now,
        },
      },
    );

    // ── Revert role_request on full refund ────────────────────────────────────
    if (!partial) {
      const rr = await db
        .collection("role_requests")
        .findOne({ paymentId });

      if (rr && ["awaiting_approval", "approved"].includes(rr.status as string)) {
        await db.collection("role_requests").updateOne(
          { paymentId },
          {
            $set: {
              feePaid:    false,
              status:     "pending_payment",
              refundedAt: now.toISOString(),
              updatedAt:  now.toISOString(),
            },
          },
        );
        console.info(
          `[refund] role_request "${rr.requestId as string}" reverted to pending_payment ` +
          `after full refund of paymentId="${paymentId}"`,
        );
      }
    }

    console.info(
      `[refund] paymentId="${paymentId}" refundAmountCents=${refundAmountCents} ` +
      `status="${newStatus}" by="${user.userId}" stripeRefundId="${stripeRefundId ?? "n/a"}"`,
    );

    // ── Send confirmation email ───────────────────────────────────────────────
    // Look up member email (members collection, then users as fallback)
    const memberId = payment.memberId as string;
    let toEmail: string | null = null;
    let firstName  = "Member";

    const member = await db.collection("members").findOne(
      { memberId },
      { projection: { "personalInfo.firstName": 1, "contact.primaryEmail": 1 } },
    );

    if (member) {
      toEmail   = (member.contact?.primaryEmail as string | undefined) ?? null;
      firstName = (member.personalInfo?.firstName as string | undefined) ?? "Member";
    }

    if (!toEmail) {
      // Fallback: check the users collection (non-member accounts)
      const userDoc = await db.collection("users").findOne(
        { $or: [{ memberId }, { userId: memberId }] },
        { projection: { email: 1, firstName: 1 } },
      );
      if (userDoc) {
        toEmail   = (userDoc.email as string | undefined) ?? null;
        firstName = (userDoc.firstName as string | undefined) ?? firstName;
      }
    }

    if (toEmail) {
      const lineItemNames = ((payment.lineItems as Array<{ name: string }> | undefined) ?? [])
        .map((i) => i.name)
        .filter(Boolean);

      const emailContent = buildPaymentRefundEmail({
        firstName,
        paymentId,
        originalAmountCents: totalPaid,
        refundAmountCents,
        refundReason:        reason,
        refundedByName:      adminName,
        paidDate:            payment.paidDate
          ? (payment.paidDate instanceof Date
              ? payment.paidDate.toISOString()
              : String(payment.paidDate))
          : null,
        refundedAt:    now.toISOString(),
        partial,
        lineItemNames,
        paymentMethod: (payment.paymentMethod as string | undefined) ?? "manual",
        stripeRefundId,
      });

      const emailResult = await sendEmail({
        to:      toEmail,
        subject: emailContent.subject,
        html:    emailContent.html,
        text:    emailContent.text,
      });

      if (!emailResult.success) {
        // Non-fatal: log but don't fail the request — the refund was recorded
        console.warn(
          `[refund] email not sent to "${toEmail}": ${emailResult.error}`,
        );
      }
    } else {
      console.warn(
        `[refund] no email address found for memberId="${memberId}" — skipping notification`,
      );
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    return NextResponse.json({
      message:        `Payment ${partial ? "partially " : ""}refunded successfully`,
      paymentId,
      refundId:       stripeRefundId,
      amountCents:    refundAmountCents,
      totalRefunded:  newTotalRefund,
      partial,
      status:         newStatus,
    });
  } catch (err: unknown) {
    console.error("[refund] unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refund failed" },
      { status: 500 },
    );
  }
}
