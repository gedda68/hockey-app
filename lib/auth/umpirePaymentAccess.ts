// lib/auth/umpirePaymentAccess.ts
// Permission helpers for umpire honoraria APIs (preview vs treasurer mutations).

import type { UserSession } from "@/lib/db/schemas/user";

export function canPreviewUmpirePayments(user: UserSession): boolean {
  const p = user.permissions as string[];
  return (
    p.includes("association.fees") ||
    p.includes("competitions.manage") ||
    p.includes("competitions.fixtures")
  );
}

export function canManageUmpirePaymentLines(user: UserSession): boolean {
  return (user.permissions as string[]).includes("association.fees");
}
