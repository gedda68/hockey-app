/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook receiver.  Verifies the event signature and processes events
 * to maintain payment records and role-request status in sync with Stripe.
 *
 * ── Security ──────────────────────────────────────────────────────────────────
 *   Every request is verified with `stripe.webhooks.constructEvent()` using
 *   STRIPE_WEBHOOK_SECRET.  Requests that fail verification receive a 400 and
 *   are not processed.
 *
 * ── Audit trail ───────────────────────────────────────────────────────────────
 *   Every verified event is upserted into the `stripe_events` collection
 *   (keyed on `stripeEventId`) immediately after signature verification and
 *   before handler dispatch.  This gives a full replay-ready log even if the
 *   handler throws.  The upsert is non-fatal: a failure logs but does not
 *   return 500 (Stripe would retry, creating duplicate audit entries).
 *
 * ── Idempotency ───────────────────────────────────────────────────────────────
 *   Each handler guards against double-processing:
 *   • checkout.session.completed — skips if `feePaid` already true.
 *   • charge.refunded            — skips if payment already `"refunded"`.
 *   • invoice.payment_failed     — no DB mutation; logs only.
 *
 * ── Raw body requirement ─────────────────────────────────────────────────────
 *   Stripe signature verification requires the EXACT bytes that Stripe sent.
 *   We use `await request.text()` before any JSON parsing.
 *   `export const dynamic = "force-dynamic"` prevents Next.js caching.
 *
 * ── Local testing ─────────────────────────────────────────────────────────────
 *   stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *   stripe trigger checkout.session.completed
 *   stripe trigger charge.refunded
 *
 * ── Events handled ────────────────────────────────────────────────────────────
 *   checkout.session.completed  — advance role-request, record payment (P2)
 *   charge.refunded             — flag payment refunded, revert role-request (P3)
 *   invoice.payment_failed      — log for future subscription support (P3)
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { constructWebhookEvent } from "@/lib/stripe/server";
import { recordRoleRequestPayment } from "@/app/api/checkout/route";

// Force dynamic rendering — no caching on a webhook receiver
export const dynamic = "force-dynamic";

// ── Audit: store every verified event ────────────────────────────────────────

async function storeStripeEvent(db: Db, event: Stripe.Event): Promise<void> {
  try {
    await db.collection("stripe_events").updateOne(
      { stripeEventId: event.id },
      {
        $setOnInsert: {
          stripeEventId: event.id,
          type:          event.type,
          livemode:      event.livemode,
          created:       new Date(event.created * 1000),
          receivedAt:    new Date(),
          rawEvent:      event,
        },
      },
      { upsert: true },
    );
  } catch (err) {
    // Non-fatal — log but don't 500 (Stripe would retry → duplicate audit rows)
    console.error("[stripe-webhook] failed to store event in stripe_events:", err);
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  db: Db,
): Promise<void> {
  const requestId = session.client_reference_id;
  if (!requestId) {
    console.warn(
      "[stripe-webhook] checkout.session.completed missing client_reference_id — skipping",
    );
    return;
  }

  // ── Load role-request ──────────────────────────────────────────────────────
  const rr = await db.collection("role_requests").findOne({ requestId });

  if (!rr) {
    // Role-request was deleted or ID is wrong — log and stop; don't 500 (that
    // would make Stripe retry indefinitely).
    console.error(
      `[stripe-webhook] role_request not found for requestId="${requestId}"`,
    );
    return;
  }

  // ── Idempotency guard ──────────────────────────────────────────────────────
  if (rr.feePaid) {
    console.info(
      `[stripe-webhook] fee already recorded for requestId="${requestId}" — skipping duplicate`,
    );
    return;
  }

  const memberId              = (rr.memberId as string) ?? session.metadata?.memberId;
  const amountCents           = session.amount_total ?? (rr.feeAmountCents as number) ?? 0;
  const stripePaymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : null;

  // ── Record payment + advance request ──────────────────────────────────────
  const { paymentId } = await recordRoleRequestPayment({
    requestId,
    memberId,
    amountCents,
    paymentMethod:           "stripe",
    transactionId:           stripePaymentIntentId ?? session.id,
    stripePaymentIntentId,
    stripeCheckoutSessionId: session.id,
    feeDescription:          rr.feeDescription  as string | undefined,
    requestedRole:           rr.requestedRole   as string | undefined,
    seasonYear:              rr.seasonYear      as string | undefined,
  });

  console.info(
    `[stripe-webhook] payment recorded: paymentId="${paymentId}" ` +
    `requestId="${requestId}" amountCents=${amountCents}`,
  );
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
  db: Db,
): Promise<void> {
  // Extract PaymentIntent ID — may be a string or an expanded object
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  if (!paymentIntentId) {
    console.warn(
      "[stripe-webhook] charge.refunded missing payment_intent — skipping",
    );
    return;
  }

  // ── Find payment record ────────────────────────────────────────────────────
  const payment = await db
    .collection("payments")
    .findOne({ stripePaymentIntentId: paymentIntentId });

  if (!payment) {
    console.warn(
      `[stripe-webhook] charge.refunded: no payment found for ` +
      `paymentIntentId="${paymentIntentId}" — skipping`,
    );
    return;
  }

  // ── Idempotency guard ──────────────────────────────────────────────────────
  if (payment.status === "refunded") {
    console.info(
      `[stripe-webhook] charge.refunded: payment "${payment.paymentId}" ` +
      `already fully refunded — skipping`,
    );
    return;
  }

  const now          = new Date();
  const fullyRefunded = charge.refunded === true;
  const newStatus    = fullyRefunded ? "refunded" : "partially_refunded";

  // ── Update payment record ──────────────────────────────────────────────────
  await db.collection("payments").updateOne(
    { stripePaymentIntentId: paymentIntentId },
    {
      $set: {
        status:           newStatus,
        refundAmountCents: charge.amount_refunded,
        refundedAt:       now,
        updatedAt:        now,
      },
    },
  );

  console.info(
    `[stripe-webhook] payment "${payment.paymentId}" marked ${newStatus} ` +
    `(refundAmountCents=${charge.amount_refunded})`,
  );

  // ── Revert role-request on full refund ─────────────────────────────────────
  // Partial refunds leave the request in its current status — only a full
  // refund invalidates the fee payment and requires the member to re-pay.
  if (fullyRefunded && payment.paymentId) {
    const rr = await db
      .collection("role_requests")
      .findOne({ paymentId: payment.paymentId });

    if (rr && ["awaiting_approval", "approved"].includes(rr.status as string)) {
      await db.collection("role_requests").updateOne(
        { paymentId: payment.paymentId },
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
        `[stripe-webhook] role_request "${rr.requestId as string}" reverted to ` +
        `pending_payment after full refund`,
      );
    }
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  // Subscription-oriented event — no active subscriptions yet.
  // Logged here and stored in stripe_events for future replay.
  //
  // `subscription` is not typed on Stripe.Invoice in API version
  // 2026-03-25.dahlia (it lives on the parent resource in newer versions),
  // so we access it via a loose cast for forward-compatibility.
  const subscriptionId =
    (invoice as unknown as Record<string, unknown>)["subscription"] ?? "n/a";

  console.warn(
    `[stripe-webhook] invoice.payment_failed: invoiceId="${invoice.id}" ` +
    `customer="${String(invoice.customer ?? "n/a")}" ` +
    `subscription="${String(subscriptionId)}"`,
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Read raw body ─────────────────────────────────────────────────────────
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  // ── Verify signature ──────────────────────────────────────────────────────
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe-webhook] signature verification failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // ── Open DB connection (shared across handlers) ───────────────────────────
  const client = await clientPromise;
  const db     = client.db(process.env.DB_NAME ?? "hockey-app");

  // ── Persist audit record (non-fatal) ─────────────────────────────────────
  await storeStripeEvent(db, event);

  // ── Dispatch ──────────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          db,
        );
        break;

      case "charge.refunded":
        await handleChargeRefunded(
          event.data.object as Stripe.Charge,
          db,
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      default:
        // Acknowledge all other events so Stripe doesn't mark them as failed
        console.debug(`[stripe-webhook] unhandled event type: ${event.type}`);
    }
  } catch (err: unknown) {
    // Return 500 — Stripe will retry the event (up to 24 hours, ~3 attempts)
    console.error("[stripe-webhook] handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed — will retry" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
