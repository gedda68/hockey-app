import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import { resolveSessionMemberId } from "@/lib/auth/sessionMember";

const oid = new ObjectId();
const db = {
  collection: () => ({ findOne: async (q: any) => (String(q._id) === String(oid) ? { memberId: "MBR-ALT-STAFF-CHC-AITCHISON-GED" } : null) }),
} as any;

describe("resolveSessionMemberId", () => {
  it("maps the session's Mongo _id to the member's memberId", async () => {
    expect(await resolveSessionMemberId(db, { memberId: String(oid) })).toBe("MBR-ALT-STAFF-CHC-AITCHISON-GED");
  });
  it("leaves a MBR- style id alone and handles empty", async () => {
    expect(await resolveSessionMemberId(db, { memberId: "MBR-1" })).toBe("MBR-1");
    expect(await resolveSessionMemberId(db, {})).toBe("");
  });
  it("falls back to the raw id when the member isn't found", async () => {
    expect(await resolveSessionMemberId(db, { memberId: String(new ObjectId()) })).toHaveLength(24);
  });
});
