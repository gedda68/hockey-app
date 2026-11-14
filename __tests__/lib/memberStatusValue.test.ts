import { describe, it, expect } from "vitest";
import { memberStatusString } from "@/lib/members/statusValue";

describe("memberStatusString", () => {
  it("reads strings, objects and falls back to membership.status", () => {
    expect(memberStatusString({ status: "Active" })).toBe("active");
    expect(memberStatusString({ status: { current: "Active", since: "2020" } })).toBe("active");
    expect(memberStatusString({ status: { active: false } })).toBe("inactive");
    expect(memberStatusString({ status: { weird: 1 }, membership: { status: "Lapsed" } })).toBe("lapsed");
    expect(memberStatusString({})).toBe("");
    expect(memberStatusString(null)).toBe("");
  });
});
