/**
 * J3 — Single place to describe which payment path is active.
 *
 * @see docs/platform/PAYMENTS.md
 */

export type PaymentGatewayMode = "simulate" | "stripe" | "none";

/**
 * `PAYMENT_GATEWAY_MODE`:
 *   - `simulate` — test / demo card flow via POST /api/member/payments/simulate
 *   - `stripe`   — production: client checkout + webhooks (wire separately)
 *   - `none`     — simulate endpoint disabled; no live provider configured
 *
 * Default: `simulate` in development, `none` in production (fail closed for dummy payments).
 */
export function getPaymentGatewayMode(): PaymentGatewayMode {
  const raw = process.env.PAYMENT_GATEWAY_MODE?.trim().toLowerCase();
  if (raw === "stripe") return "stripe";
  if (raw === "simulate") return "simulate";
  if (raw === "none") return "none";
  return process.env.NODE_ENV === "development" ? "simulate" : "none";
}

export function isSimulatePaymentEndpointEnabled(): boolean {
  return getPaymentGatewayMode() === "simulate";
}
