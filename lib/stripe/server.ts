/**
 * lib/stripe/server.ts
 *
 * Server-only Stripe SDK singleton.
 *
 * ── Why a singleton? ─────────────────────────────────────────────────────────
 * The Stripe constructor opens a keep-alive HTTPS agent.  Constructing a new
 * instance per request in a serverless/edge environment wastes connections.
 * Lazy-initialising on first call and caching on `globalThis` (so it survives
 * Next.js hot-reloads in development) keeps one instance alive per worker.
 *
 * ── Environment variables ────────────────────────────────────────────────────
 *   STRIPE_SECRET_KEY          sk_live_… or sk_test_…  (required for Stripe mode)
 *   STRIPE_WEBHOOK_SECRET      whsec_…                 (required for webhook verification)
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  pk_live_… / pk_test_… (read by the browser)
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *   import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
 *
 *   if (!isStripeConfigured()) { ... }
 *   const stripe = getStripe();
 *   const session = await stripe.checkout.sessions.create({ ... });
 */

import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

// globalThis key keeps the instance alive across Next.js hot-reloads
const GLOBAL_KEY = "__stripe_server_instance__";

declare global {
  // eslint-disable-next-line no-var
  var __stripe_server_instance__: Stripe | undefined;
}

/**
 * Returns true when STRIPE_SECRET_KEY is set and non-empty.
 * Use this to decide whether to offer the Stripe payment path.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/**
 * Returns the shared Stripe instance.
 * Throws if STRIPE_SECRET_KEY is not set — always call `isStripeConfigured()`
 * first, or wrap in a try/catch.
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. " +
        "Set it in .env.local (sk_test_… for test, sk_live_… for production).",
    );
  }

  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }

  return globalThis[GLOBAL_KEY]!;
}

/**
 * Verifies a Stripe webhook signature and returns the parsed event.
 * Throws `Stripe.errors.StripeSignatureVerificationError` on bad signature.
 *
 * @param rawBody   The raw request body as a string (use `await req.text()`).
 * @param signature The `stripe-signature` header value.
 */
export function constructWebhookEvent(
  rawBody: string,
  signature: string,
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. " +
        "Obtain it from the Stripe Dashboard → Webhooks → your endpoint.",
    );
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
}
