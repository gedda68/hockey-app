// lib/audit/platformAuditLog.ts
// Append-only audit trail for competitions, season competitions, tournaments, fees, umpire payments, fixtures (B6).

import clientPromise from "@/lib/mongodb";

export type PlatformAuditCategory =
  | "competition"
  | "season_competition"
  | "tournament"
  | "fee_rules"
  | "umpire_payment"
  | "fixture"
  | "result"
  | "ladder"
  | "team_lineage"
  | "competition_awards"
  | "venue";

export interface PlatformAuditEntry {
  auditId: string;
  timestamp: string;
  userId: string;
  userEmail?: string;
  category: PlatformAuditCategory;
  action: string;
  resourceType: string;
  resourceId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export async function logPlatformAudit(
  entry: Omit<PlatformAuditEntry, "auditId" | "timestamp">,
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db("hockey-app");
    const doc: PlatformAuditEntry = {
      auditId: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    await db.collection("platform_audit_log").insertOne(doc);
  } catch (e) {
    console.error("platform audit log failed:", e);
  }
}
