import { describe, expect, it } from "vitest";
import { cleanAvailability, coversDay } from "@/lib/member/availability";
import { holdingState } from "@/lib/member/myAppointments";
import { childrenOf } from "@/lib/access/guardians";
import { evaluateAdminRouteAccess } from "@/lib/auth/adminRouteAccess";

const TODAY = "2026-11-17";

describe("cleanAvailability", () => {
  it("accepts a single day and a range", () => {
    expect(cleanAvailability({ kind: "unavailable", from: "2026-12-01" }, TODAY)).toEqual({ ok: true, value: { kind: "unavailable", from: "2026-12-01", to: "2026-12-01" } });
    expect(cleanAvailability({ kind: "available", from: "2026-12-01", to: "2026-12-10", note: " away " }, TODAY)).toMatchObject({ ok: true, value: { to: "2026-12-10", note: "away" } });
  });

  it("rejects bad input", () => {
    const bad = (b: unknown) => cleanAvailability(b, TODAY).ok;
    expect(bad(null)).toBe(false);
    expect(bad({ kind: "maybe", from: "2026-12-01" })).toBe(false);
    expect(bad({ kind: "unavailable", from: "01/12/2026" })).toBe(false);
    expect(bad({ kind: "unavailable", from: "2026-02-30" })).toBe(false);
    expect(bad({ kind: "unavailable", from: "2026-12-10", to: "2026-12-01" })).toBe(false);
    expect(bad({ kind: "unavailable", from: "2026-01-01", to: "2026-01-05" })).toBe(false);
    expect(bad({ kind: "unavailable", from: "2026-12-01", to: "2028-01-01" })).toBe(false);
  });

  it("allows a period that is already under way", () => {
    expect(cleanAvailability({ kind: "unavailable", from: "2026-11-10", to: "2026-11-20" }, TODAY).ok).toBe(true);
  });

  it("trims long notes", () => {
    const r = cleanAvailability({ kind: "unavailable", from: "2026-12-01", note: "x".repeat(500) }, TODAY);
    expect(r.ok && r.value.note?.length).toBe(200);
  });

  it("coversDay is inclusive", () => {
    const e = { from: "2026-12-01", to: "2026-12-03" };
    expect([coversDay(e, "2026-11-30"), coversDay(e, "2026-12-01"), coversDay(e, "2026-12-03"), coversDay(e, "2026-12-04")]).toEqual([false, true, true, false]);
  });
});

describe("holdingState", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  it("reads status and expiry", () => {
    expect(holdingState({ status: "active" }, now)).toBe("active");
    expect(holdingState({}, now)).toBe("active");
    expect(holdingState({ status: "pending" }, now)).toBe("pending");
    expect(holdingState({ status: "ended" }, now)).toBe("ended");
    expect(holdingState({ status: "active", expiresAt: "2026-01-01T00:00:00Z" }, now)).toBe("expired");
    expect(holdingState({ status: "ended", expiresAt: "2099-01-01T00:00:00Z" }, now)).toBe("ended");
  });
});

describe("childrenOf", () => {
  const kid = (extra: Record<string, unknown> = {}) => ({
    memberId: "kid", personalInfo: { dateOfBirth: "2014-01-01", relatedMembers: [{ memberId: "mum", relationshipType: "Mother" }] }, ...extra,
  });
  const dbWith = (linked: unknown[], me: unknown = { memberId: "mum" }, family: unknown[] = []) =>
    ({
      collection: () => ({
        find: (q: Record<string, unknown>) => ({ toArray: async () => ("family.familyId" in q ? family : "personalInfo.relatedMembers.memberId" in q ? linked : []) }),
        findOne: async () => me,
      }),
    }) as never;

  it("returns children whose record names me as a parent/guardian", async () => {
    expect((await childrenOf(dbWith([kid()]), "mum")).map((c) => c.memberId)).toEqual(["kid"]);
  });

  it("ignores a link that isn't a parent/guardian relationship", async () => {
    const sibling = kid({ personalInfo: { dateOfBirth: "2014-01-01", relatedMembers: [{ memberId: "mum", relationshipType: "Sibling" }] } });
    expect(await childrenOf(dbWith([sibling]), "mum")).toEqual([]);
  });

  it("includes family members when I am the primary contact", async () => {
    const famKid = { memberId: "kid2", family: { familyId: "f1" }, personalInfo: { dateOfBirth: "2015-01-01" } };
    const me = { memberId: "mum", family: { familyId: "f1", isPrimaryContact: true } };
    // guardianIdsFor looks up the family's primary contacts; the fake returns the family list for that query too.
    const db = dbWith([], me, [famKid, { memberId: "mum", family: { familyId: "f1", isPrimaryContact: true }, personalInfo: { dateOfBirth: "1985-01-01" } }]);
    expect((await childrenOf(db, "mum")).map((c) => c.memberId)).toContain("kid2");
  });

  it("is empty without an id", async () => {
    expect(await childrenOf(dbWith([kid()]), "")).toEqual([]);
  });
});

describe("personal screens are open to any signed-in role", () => {
  for (const role of ["player", "parent", "volunteer", "coach", "club-admin", "assoc-committee"]) {
    it(role, () => {
      for (const p of ["/admin/my-appointments", "/admin/my-duties", "/admin/my-availability", "/admin/my-children", "/admin/guardian-approvals"]) {
        expect(evaluateAdminRouteAccess(p, { role, scopedRoles: [{ role, scopeType: "global" }] }), `${role} ${p}`).toBe("allow");
      }
    });
  }
});
