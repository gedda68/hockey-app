// lib/officiating/umpirePaymentLineStatus.ts
// Valid status transitions for persisted umpire payment lines.

import type { UmpirePaymentLineStatus } from "@/lib/db/schemas/umpireMatchPayment.schema";

export function isAllowedUmpirePaymentTransition(
  from: UmpirePaymentLineStatus,
  to: UmpirePaymentLineStatus,
): boolean {
  if (from === "pending" && to === "approved") return true;
  if (from === "approved" && to === "paid") return true;
  return false;
}
