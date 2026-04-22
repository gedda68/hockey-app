/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook receiver.  Verifies the event signature and processes
 * `checkout.session.completed` to:
 *   1. Write a payment record to the `payments` collection.
 *   2. Advance the role-request from `pending_payment` → `awaiting_approval`.
 *
 * ── Security ──────────────────────────────────────────────────────────────────
 *   Every request is verified with `stripe.webhooks.constructEvent()` using
 *   STRIPE_WEBHOOK_SECRET.  Requests that fail verification receive a 400 and
 *   are not processed.
 *
 * ── Idempotency ───────────────────────────────────────────────────────────────
 *   `checkout.session.completed` can fire more than once (Stripe retries on
 *   5xx).  We guard with a `feePaid` check on the role-request — if it is
 *   already true we skip the write and return 200 so Stripe stops retrying.
 *
 * ── Raw body requirement ─────────────────────────────────────────────────────
 *   Stripe signature verification requires the EXACT bytes that Stripe sent.
 *   We use `await request.text()` which gives us the raw body before any
 *   JSON parsing.  `export const dynamic = "force-dynamic"` prevents Next.js
 *   from caching or pre-rendering this route.
 *
 * ── Local testing ─────────────────────────────────────────────────────────────
 *   Use the Stripe CLI:
 *     stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *   Then in a second terminal:
 *     stripe trigger checkout.session.completed
 *
 * ── Events handled ────────────────────────────────────────────────────────────
 *   checkout.session.completed  — advance role-request, record payment (P2)
 *   (P3 will add: charge.refunded, invoice.payment_failed)
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import clientPromise from "@/lib/mongodb";
import { constructWebhookEvent } from "@/lib/stripe/server";
import { recordRoleRequestPayment } from "@/app/api/checkout/route";

// Force dynamic rendering — no caching on a webhook receiver
export const dynamic = "force-dynamic";

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const requestId = session.client_reference_id;
  if (!requestId) {
    console.warn(
      "[stripe-webhook] checkout.session.completed missing client_reference_id — skipping",
    );
    return;
  }

  const client = await clientPromise;
  const db     = client.db(process.env.DB_NAME ?? "hockey-app");

  // ── Load role-request ──────────────────────────────────────────────────────
  const rr = await db
    .collection("role_requests")
    .findOne({ requestId });

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
    paymentMethod:          "stripe",
    transactionId:          stripePaymentIntentId ?? session.id,
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

  // ── Dispatch ──────────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      // P3 will handle charge.refunded and invoice.payment_failed here
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
