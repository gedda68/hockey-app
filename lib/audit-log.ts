// lib/audit-log.ts
// System for tracking all member changes

import clientPromise from "@/lib/mongodb";

export interface AuditLogEntry {
  auditId: string;
  timestamp: string;
  userId: string; // Who made the change
  userName?: string; // Optional: name of user who made change
  memberId: string; // Which member was changed
  clubId: string; // Which club
  action: "create" | "update" | "delete" | "renew" | "status_change";
  changes?: {
    field: string; // e.g., "personalInfo.firstName"
    oldValue: any;
    newValue: any;
  }[];
  before?: any; // Complete snapshot before change (for major changes)
  after?: any; // Complete snapshot after change (for major changes)
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    reason?: string; // Optional reason for change
    [key: string]: any;
  };
}

/**
 * Log a member change to the audit log
 */
export async function logMemberChange(
  entry: Omit<AuditLogEntry, "auditId" | "timestamp">,
) {
  try {
    const client = await clientPromise;
    const db = client.db("hockey");
    const auditCollection = db.collection("member_audit_log");

    const auditEntry: AuditLogEntry = {
      auditId: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    await auditCollection.insertOne(auditEntry);

    console.log(`✅ Audit log created: ${auditEntry.auditId}`);
    return auditEntry;
  } catch (error) {
    console.error("❌ Failed to create audit log:", error);
    // Don't throw - we don't want audit logging to break the main operation
    return null;
  }
}

/**
 * Get audit history for a specific member
 */
export async function getMemberAuditHistory(
  memberId: string,
  options?: {
    limit?: number;
    skip?: number;
    action?: AuditLogEntry["action"];
  },
) {
  try {
    const client = await clientPromise;
    const db = client.db("hockey");
    const auditCollection = db.collection("member_audit_log");

    const query: any = { memberId };
    if (options?.action) {
      query.action = options.action;
    }

    const logs = await auditCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100)
      .skip(options?.skip || 0)
      .toArray();

    return logs as AuditLogEntry[];
  } catch (error) {
    console.error("❌ Failed to fetch audit history:", error);
    return [];
  }
}

/**
 * Detect changes between two objects
 */
export function detectChanges(
  oldData: any,
  newData: any,
  prefix = "",
): AuditLogEntry["changes"] {
  const changes: AuditLogEntry["changes"] = [];

  function compareObjects(old: any, updated: any, path: string) {
    // Handle null/undefined
    if (old === null || old === undefined) {
      if (updated !== null && updated !== undefined) {
        changes.push({
          field: path,
          oldValue: old,
          newValue: updated,
        });
      }
      return;
    }

    if (updated === null || updated === undefined) {
      if (old !== null && old !== undefined) {
        changes.push({
          field: path,
          oldValue: old,
          newValue: updated,
        });
      }
      return;
    }

    // Handle arrays
    if (Array.isArray(old) || Array.isArray(updated)) {
      if (JSON.stringify(old) !== JSON.stringify(updated)) {
        changes.push({
          field: path,
          oldValue: old,
          newValue: updated,
        });
      }
      return;
    }

    // Handle objects
    if (typeof old === "object" && typeof updated === "object") {
      const allKeys = new Set([...Object.keys(old), ...Object.keys(updated)]);

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;
        compareObjects(old[key], updated[key], newPath);
      }
      return;
    }

    // Handle primitives
    if (old !== updated) {
      changes.push({
        field: path,
        oldValue: old,
        newValue: updated,
      });
    }
  }

  compareObjects(oldData, newData, prefix);
  return changes;
}

/**
 * Create indexes for audit log collection
 */
export async function createAuditLogIndexes() {
  try {
    const client = await clientPromise;
    const db = client.db("hockey");
    const auditCollection = db.collection("member_audit_log");

    await auditCollection.createIndex({ memberId: 1, timestamp: -1 });
    await auditCollection.createIndex({ clubId: 1, timestamp: -1 });
    await auditCollection.createIndex({ userId: 1, timestamp: -1 });
    await auditCollection.createIndex({ action: 1 });
    await auditCollection.createIndex({ timestamp: -1 });

    console.log("✅ Audit log indexes created");
  } catch (error) {
    console.error("❌ Failed to create audit log indexes:", error);
  }
}

/**
 * Get audit statistics for a club
 */
export async function getAuditStatistics(clubId: string, days = 30) {
  try {
    const client = await clientPromise;
    const db = client.db("hockey");
    const auditCollection = db.collection("member_audit_log");

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const stats = await auditCollection
      .aggregate([
        {
          $match: {
            clubId,
            timestamp: { $gte: sinceDate.toISOString() },
          },
        },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    return stats;
  } catch (error) {
    console.error("❌ Failed to fetch audit statistics:", error);
    return [];
  }
}
