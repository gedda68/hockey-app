import { describe, it, expect } from "vitest";
import { sanitizeSelfDetails, blockedByLocks } from "@/lib/members/selfDetails";

describe("sanitizeSelfDetails", () => {
  it("keeps emergency contacts, drops blank rows, numbers priorities and keeps ids", () => {
    const r = sanitizeSelfDetails(
      { emergencyContacts: [{ name: " Ann ", relationship: "Mother", phone: "0400" }, { name: "" }, { name: "Bob", contactId: "X1" }] },
      { emergencyContacts: [{ contactId: "OLD1" }] },
    );
    const list = r.$set.emergencyContacts as any[];
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ name: "Ann", priority: 1, contactId: "OLD1" });
    expect(list[1]).toMatchObject({ name: "Bob", priority: 2, contactId: "X1" });
    expect(r.touched).toContain("emergencyContacts");
  });

  it("rejects invalid emails", () => {
    expect(sanitizeSelfDetails({ contact: { primaryEmail: "nope" } }, {}).errors).toHaveLength(1);
    expect(sanitizeSelfDetails({ emergencyContacts: [{ name: "A", email: "bad" }] }, {}).errors).toHaveLength(1);
  });

  it("clears medicare when the number is blank", () => {
    const r = sanitizeSelfDetails({ healthcare: { medicare: { number: "" } } }, {});
    expect(r.$set["healthcare.medicare"]).toBeNull();
  });

  it("limits blue card enums and preserves stored verification fields", () => {
    const r = sanitizeSelfDetails(
      { blueCard: { cardType: "Bogus", cardNumber: "123", status: "Valid", expiryDate: "2030-01-01" } },
      { blueCard: { lastVerifiedDate: "2026-01-01", linkedToClub: true } },
    );
    const inc = r.$set.__blueCardIncoming as any;
    expect(inc.cardType).toBe("");
    expect(inc.cardNumber).toBe("123");
    expect(inc.lastVerifiedDate).toBe("2026-01-01");
  });

  it("caps contacts at 5", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `P${i}` }));
    expect((sanitizeSelfDetails({ emergencyContacts: many }, {}).$set.emergencyContacts as any[]).length).toBe(5);
  });
});

describe("blockedByLocks", () => {
  it("matches group and field locks", () => {
    expect(blockedByLocks(["healthcare", "medical.allergies"], ["healthcare"])).toEqual(["healthcare"]);
    expect(blockedByLocks(["medical.allergies"], ["medical"])).toEqual(["medical.allergies"]);
    expect(blockedByLocks(["blueCard"], ["address.street"])).toEqual([]);
  });
});
