import { describe, it, expect } from "vitest";
import {
  collectStaffComplianceRows,
  daysUntilExpiry,
  wwccComplianceStatus,
} from "@/lib/coaching/teamStaffCompliance";

describe("wwccComplianceStatus", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");

  it("returns missing when unset", () => {
    expect(wwccComplianceStatus(undefined, now)).toBe("missing");
    expect(wwccComplianceStatus(null, now)).toBe("missing");
    expect(wwccComplianceStatus("", now)).toBe("missing");
  });

  it("returns expired before now", () => {
    expect(wwccComplianceStatus("2025-01-01", now)).toBe("expired");
  });

  it("returns expiring within window", () => {
    expect(wwccComplianceStatus("2026-07-01", now, 90)).toBe("expiring");
  });

  it("returns ok when far future", () => {
    expect(wwccComplianceStatus("2030-01-01", now, 90)).toBe("ok");
  });
});

describe("daysUntilExpiry", () => {
  it("returns null when missing", () => {
    expect(daysUntilExpiry(null, new Date())).toBeNull();
  });
});

describe("collectStaffComplianceRows", () => {
  it("skips staff without id or memberId", () => {
    const rows = collectStaffComplianceRows(
      {
        teams: [
          {
            name: "U14 A",
            staff: [
              { id: "", memberId: "M1", wwccExpiresAt: "2030-01-01" },
              { id: "s1", memberId: "", wwccExpiresAt: "2030-01-01" },
              {
                id: "s2",
                memberId: "M2",
                memberName: "Pat",
                role: "Coach",
                wwccExpiresAt: "2025-01-01",
              },
            ],
          },
        ],
      },
      new Date("2026-01-01"),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].staffId).toBe("s2");
    expect(rows[0].wwccStatus).toBe("expired");
  });
});
