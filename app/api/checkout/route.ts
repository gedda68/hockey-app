/**
 * POST /api/checkout
 *
 * Creates a payment session for a role-request that is in `pending_payment`
 * status.  The caller is redirected to the returned `url`.
 *
 * ── Stripe mode (PAYMENT_GATEWAY_MODE=stripe) ─────────────────────────────────
 *   • Creates a Stripe Checkout Session with one line item.
 *   • Returns { url: checkoutSession.url } — the caller does
 *     `window.location.href = url` to hand off to Stripe-hosted checkout.
 *   • On success Stripe redirects back to
 *     `{APP_URL}/admin/my-registrations?payment=success`.
 *   • Stripe fires `checkout.session.completed` → `/api/webhooks/stripe`
 *     which writes the payment record and advances the request.
 *
 * ── Simulate mode (PAYMENT_GATEWAY_MODE=simulate, default in dev) ─────────────
 *   • Immediately performs the same DB writes as the webhook handler would.
 *   • Returns { url: "/admin/my-registrations?payment=success" } so the UI
 *     redirect works identically regardless of mode.
 *
 * ── Body ─────────────────────────────────────────────────────────────────────
 *   { requestId: string }
 *
 * ── Response ─────────────────────────────────────────────────────────────────
 *   200 { url: string }
 *   400 { error: string }
 *   401 Unauthenticated
 *   403 Request does not belong to caller / wrong status
 *   404 Request not found
 *   500 Internal
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { getPaymentGatewayMode } from "@/lib/payments/paymentGateway";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Base URL for Stripe redirect targets — must be an absolute URL. */
function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/**
 * Perform the DB writes that record a successful payment and advance the
 * role-request from `pending_payment` to `awaiting_approval`.
 *
 * Shared by simulate mode (called inline) and the Stripe webhook handler
 * (called after signature verification).  Exported so the webhook can import
 * it without duplicating logic.
 */
export async function recordRoleRequestPayment(opts: {
  requestId:             string;
  memberId:              string;
  amountCents:           number;
  paymentMethod:         string;
  transactionId:         string;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
  feeDescription?:       string;
  requestedRole?:        string;
  seasonYear?:           string;
}): Promise<{ paymentId: string }> {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME ?? "hockey-app");
  const now = new Date();

  const paymentId = `PAY-${uuidv4().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  // ── Insert payment record (mirrors simulate endpoint shape) ────────────────
  await db.collection("payments").insertOne({
    paymentId,
    memberId: opts.memberId,
    amount: opts.amountCents / 100,
    amountCents: opts.amountCents,
    lineItems: [
      {
        itemId:      `rr-${opts.requestId}`,
        feeId:       opts.requestId,
        type:        "other",
        name:        opts.feeDescription ??
                     `${opts.requestedRole ?? "Role"} registration fee`,
        amount:      opts.amountCents / 100,
        gstIncluded: false,
      },
    ],
    status:        "paid",
    seasonYear:    opts.seasonYear ?? new Date().getFullYear().toString(),
    paymentMethod: opts.paymentMethod,
    transactionId: opts.transactionId,
    ...(opts.stripePaymentIntentId
      ? { stripePaymentIntentId: opts.stripePaymentIntentId }
      : {}),
    ...(opts.stripeCheckoutSessionId
      ? { stripeCheckoutSessionId: opts.stripeCheckoutSessionId }
      : {}),
    paidDate:  now,
    createdAt: now,
    updatedAt: now,
  });

  // ── Advance the role request ───────────────────────────────────────────────
  await db.collection("role_requests").updateOne(
    { requestId: opts.requestId },
    {
      $set: {
        feePaid:     true,
        paymentId,
        paymentDate: now.toISOString(),
        status:      "awaiting_approval",
        updatedAt:   now.toISOString(),
      },
    },
  );

  return { paymentId };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const memberId = session.memberId ?? session.userId;
    if (!memberId) {
      return NextResponse.json(
        { error: "No member account linked to this session" },
        { status: 400 },
      );
    }

    // ── Validate body ────────────────────────────────────────────────────────
    let body: { requestId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { requestId } = body;
    if (!requestId?.trim()) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    // ── Load role-request ────────────────────────────────────────────────────
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME ?? "hockey-app");

    const rr = await db.collection("role_requests").findOne({
      requestId: requestId.trim(),
    });

    if (!rr) {
      return NextResponse.json({ error: "Role request not found" }, { status: 404 });
    }

    // Ownership — the request must belong to this member (or this user)
    if (rr.memberId !== memberId && rr.memberId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (rr.status !== "pending_payment") {
      return NextResponse.json(
        { error: `Request is already ${rr.status} — payment is not needed` },
        { status: 400 },
      );
    }

    if (rr.feePaid) {
      return NextResponse.json(
        { error: "Fee has already been recorded for this request" },
        { status: 400 },
      );
    }

    const feeAmountCents: number = (rr.feeAmountCents as number) ?? 0;

    if (feeAmountCents <= 0) {
      return NextResponse.json(
        {
          error:
            "No fee amount has been configured for this registration. " +
            "Please contact your club registrar — they can record payment manually.",
        },
        { status: 400 },
      );
    }

    const baseUrl     = appBaseUrl();
    const successUrl  = `${baseUrl}/admin/my-registrations?payment=success`;
    const cancelUrl   = `${baseUrl}/admin/my-registrations?payment=cancelled`;
    const gatewayMode = getPaymentGatewayMode();

    // ── Stripe mode ──────────────────────────────────────────────────────────
    if (gatewayMode === "stripe" && isStripeConfigured()) {
      const stripe      = getStripe();
      const description = (rr.feeDescription as string | undefined) ??
                          `${String(rr.requestedRole)} registration fee`;

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency:     "aud",
              unit_amount:  feeAmountCents,
              product_data: { name: description },
            },
          },
        ],
        client_reference_id: requestId,
        metadata: {
          requestId,
          memberId,
          requestedRole: String(rr.requestedRole ?? ""),
          seasonYear:    String(rr.seasonYear    ?? ""),
          feeAmountCents: String(feeAmountCents),
        },
        // success_url gets {CHECKOUT_SESSION_ID} appended so the page can
        // verify the session server-side if needed in future.
        success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  cancelUrl,
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    // ── Simulate mode (dev / staging) ────────────────────────────────────────
    if (gatewayMode === "simulate") {
      const transactionId = `SIM-${new Date().getFullYear()}-${
        Math.random().toString(36).toUpperCase().slice(2, 6)
      }`;

      await recordRoleRequestPayment({
        requestId,
        memberId,
        amountCents:    feeAmountCents,
        paymentMethod:  "simulated",
        transactionId,
        feeDescription: rr.feeDescription as string | undefined,
        requestedRole:  rr.requestedRole  as string | undefined,
        seasonYear:     rr.seasonYear     as string | undefined,
      });

      return NextResponse.json({ url: successUrl, simulated: true });
    }

    // ── Gateway disabled ─────────────────────────────────────────────────────
    return NextResponse.json(
      {
        error:
          "Online payment is not enabled. " +
          "Please contact your club registrar to record payment manually.",
      },
      { status: 503 },
    );
  } catch (err: unknown) {
    console.error("💥 /api/checkout error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout session creation failed" },
      { status: 500 },
    );
  }
}
