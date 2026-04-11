import type { Db } from "mongodb";

export type PaymentLineLike = {
  type?: string;
  name?: string;
  amount?: number;
  gstIncluded?: boolean;
  associationId?: string;
  clubId?: string;
  competitionId?: string;
  tournamentId?: string;
};

export function gstComponentFromLine(amount: number, gstIncluded: boolean): number {
  if (!gstIncluded) return 0;
  return amount - amount / 1.1;
}

export interface RegistrationPaymentSummary {
  scope: { seasonYear?: string; status?: string };
  totals: {
    paymentCount: number;
    lineItemCount: number;
    amount: number;
    gstComponent: number;
    byPaymentStatus: Record<string, { count: number; amount: number }>;
  };
  byClub: Array<{
    clubId: string;
    paymentCount: number;
    amount: number;
    gstComponent: number;
  }>;
  byAssociation: Array<{
    associationId: string;
    amount: number;
    gstComponent: number;
  }>;
}

function bump(
  map: Map<string, { paymentCount: number; amount: number; gstComponent: number }>,
  key: string,
  paymentId: string,
  seenPayments: Set<string>,
  amount: number,
  gst: number,
) {
  const cur = map.get(key) ?? {
    paymentCount: 0,
    amount: 0,
    gstComponent: 0,
  };
  if (!seenPayments.has(paymentId)) {
    cur.paymentCount += 1;
    seenPayments.add(paymentId);
  }
  cur.amount += amount;
  cur.gstComponent += gst;
  map.set(key, cur);
}

export function aggregateRegistrationPayments(
  payments: Array<{
    paymentId: string;
    clubId?: string;
    status?: string;
    amount?: number;
    lineItems?: PaymentLineLike[];
  }>,
  opts?: { seasonYear?: string },
): RegistrationPaymentSummary {
  const byPaymentStatus: Record<string, { count: number; amount: number }> = {};
  const clubMap = new Map<
    string,
    { paymentCount: number; amount: number; gstComponent: number }
  >();
  const assocMap = new Map<
    string,
    { amount: number; gstComponent: number }
  >();

  let lineItemCount = 0;
  let totalAmount = 0;
  let totalGst = 0;
  const paymentSeenByClub = new Map<string, Set<string>>();

  for (const pay of payments) {
    const status = pay.status ?? "unknown";
    byPaymentStatus[status] ??= { count: 0, amount: 0 };
    byPaymentStatus[status].count += 1;
    byPaymentStatus[status].amount += pay.amount ?? 0;

    const clubId = pay.clubId ?? "unknown";
    const clubSeen = paymentSeenByClub.get(clubId) ?? new Set<string>();
    paymentSeenByClub.set(clubId, clubSeen);

    const items = pay.lineItems ?? [];
    if (items.length === 0) {
      const amt = pay.amount ?? 0;
      totalAmount += amt;
      bump(clubMap, clubId, pay.paymentId, clubSeen, amt, 0);
      continue;
    }

    for (const line of items) {
      lineItemCount += 1;
      const amt = line.amount ?? 0;
      const gst = gstComponentFromLine(amt, line.gstIncluded ?? true);
      totalAmount += amt;
      totalGst += gst;
      bump(clubMap, clubId, pay.paymentId, clubSeen, amt, gst);

      if (line.type === "association" && line.associationId) {
        const a = assocMap.get(line.associationId) ?? {
          amount: 0,
          gstComponent: 0,
        };
        a.amount += amt;
        a.gstComponent += gst;
        assocMap.set(line.associationId, a);
      }
    }
  }

  const byClub = [...clubMap.entries()]
    .map(([clubId, v]) => ({
      clubId,
      paymentCount: v.paymentCount,
      amount: Math.round(v.amount * 100) / 100,
      gstComponent: Math.round(v.gstComponent * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  const byAssociation = [...assocMap.entries()]
    .map(([associationId, v]) => ({
      associationId,
      amount: Math.round(v.amount * 100) / 100,
      gstComponent: Math.round(v.gstComponent * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    scope: { seasonYear: opts?.seasonYear, status: undefined },
    totals: {
      paymentCount: payments.length,
      lineItemCount,
      amount: Math.round(totalAmount * 100) / 100,
      gstComponent: Math.round(totalGst * 100) / 100,
      byPaymentStatus: Object.fromEntries(
        Object.entries(byPaymentStatus).map(([k, v]) => [
          k,
          {
            count: v.count,
            amount: Math.round(v.amount * 100) / 100,
          },
        ]),
      ),
    },
    byClub,
    byAssociation,
  };
}

export async function buildScopedClubFilter(
  db: Db,
  session: {
    role: string;
    associationId?: string | null;
    clubId?: string | null;
    scopedRoles?: Array<{ role: string; scopeType: string; scopeId?: string }>;
  },
): Promise<Record<string, unknown>> {
  const ADMIN_ROLES = [
    "super-admin",
    "association-admin",
    "assoc-committee",
    "assoc-registrar",
    "club-admin",
    "club-committee",
    "registrar",
  ];

  const role = session.role;
  const scopedRoles = session.scopedRoles ?? [];

  if (role === "super-admin") {
    return {};
  }

  if (
    role === "association-admin" ||
    role === "assoc-committee" ||
    role === "assoc-registrar"
  ) {
    if (session.associationId) {
      const clubs = await db
        .collection("clubs")
        .find(
          { parentAssociationId: session.associationId },
          { projection: { id: 1 } },
        )
        .toArray();
      const clubIds = clubs.map((c) => c.id).filter(Boolean) as string[];
      if (clubIds.length === 0) return { clubId: "__none__" };
      return { clubId: { $in: clubIds } };
    }
  }

  if (role === "club-admin" || role === "club-committee" || role === "registrar") {
    if (session.clubId) return { clubId: session.clubId };
  }

  const scopeClubIds = new Set<string>();
  for (const sr of scopedRoles) {
    if (!sr.scopeId || !ADMIN_ROLES.includes(sr.role)) continue;
    if (sr.scopeType === "club") scopeClubIds.add(sr.scopeId);
    if (sr.scopeType === "association") {
      const clubs = await db
        .collection("clubs")
        .find(
          { parentAssociationId: sr.scopeId },
          { projection: { id: 1 } },
        )
        .toArray();
      for (const c of clubs) {
        if (c.id) scopeClubIds.add(c.id as string);
      }
    }
  }
  if (scopeClubIds.size > 0) return { clubId: { $in: [...scopeClubIds] } };

  return { clubId: "__none__" };
}
