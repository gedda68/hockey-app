import { describe, it, expect } from "vitest";
import { membershipCardQrPayload } from "@/lib/member/membershipCard";

describe("membershipCardQrPayload", () => {
  it("builds a stable, scanner-friendly payload", () => {
    expect(membershipCardQrPayload({ memberId: "m-123", seasonYear: "2026" })).toBe(
      "HA_CARD_v1|m-123|2026",
    );
  });
});

