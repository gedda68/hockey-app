import { itemsFromMedical, UNASSIGNED_LABEL } from "@/lib/members/medicalItems";
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

describe("related people", () => {
  it("keeps linked people, one row each, and generates ids", () => {
    const r = sanitizeSelfDetails(
      { relatedMembers: [{ memberId: "M1", name: "Lee A", relationshipType: "rel-parent" }, { memberId: "M1", name: "dup" }, { name: "Unlinked Person", relationshipType: "Friend" }, { name: "" }] },
      {},
    );
    const list = r.$set["personalInfo.relatedMembers"] as any[];
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ memberId: "M1", relationshipType: "rel-parent" });
    expect(list[1].memberId).toBeUndefined();
    expect(list[1].id).toBeTruthy();
    expect(r.touched).toContain("personalInfo.relatedMembers");
  });
});

describe("medical items", () => {
  it("links medications to a condition/allergy and syncs the legacy strings", () => {
    const r = sanitizeSelfDetails({ medical: { items: [
      { kind: "condition", name: "Asthma", medications: [{ name: "Ventolin", dose: "as needed" }, { name: "Flixotide", dose: "" }, { name: "" }] },
      { kind: "allergy", name: "Peanuts", medications: [{ name: "EpiPen" }] },
      { name: "", medications: [] },
    ] } }, {});
    const items = r.$set["medical.items"] as any[];
    expect(items).toHaveLength(2);
    expect(items[0].medications).toHaveLength(2);
    expect(r.$set["medical.conditions"]).toBe("Asthma");
    expect(r.$set["medical.allergies"]).toBe("Peanuts");
    expect(r.$set["medical.medications"]).toBe("Ventolin (as needed) — for Asthma\nFlixotide — for Asthma\nEpiPen — for Peanuts");
    expect(r.touched).toEqual(expect.arrayContaining(["medical.items", "medical.conditions", "medical.medications", "medical.allergies"]));
  });
  it("builds items from legacy strings", () => {
    const one = itemsFromMedical({ conditions: "Asthma", medications: "Ventolin", allergies: "Peanuts" });
    expect(one.find((i) => i.name === "Asthma")?.medications[0].name).toBe("Ventolin");
    const many = itemsFromMedical({ conditions: "Asthma\nDiabetes", medications: "Insulin" });
    expect(many.some((i) => i.name === UNASSIGNED_LABEL && i.medications[0].name === "Insulin")).toBe(true);
  });
});

describe("related people from another club", () => {
  it("keeps only the club id (name/city are filled in by the server)", () => {
    const r = sanitizeSelfDetails({ relatedMembers: [{ name: "Sam", relationshipType: "Friend", clubId: "club-9", clubName: "Spoofed", city: "Nowhere" }] }, {});
    const e = (r.$set["personalInfo.relatedMembers"] as any[])[0];
    expect(e.clubId).toBe("club-9");
    expect(e.clubName).toBeUndefined();
    expect(e.city).toBeUndefined();
  });
});

describe("privacy flag and linked emergency contacts", () => {
  it("accepts the contact privacy toggle", () => {
    const r = sanitizeSelfDetails({ privacy: { contactPrivate: true } }, {});
    expect(r.$set["privacy.contactPrivate"]).toBe(true);
    expect(r.touched).toContain("privacy.contactPrivate");
    expect(sanitizeSelfDetails({ privacy: { contactPrivate: "yes" } }, {}).touched).toHaveLength(0);
  });
  it("keeps the member link on an emergency contact", () => {
    const r = sanitizeSelfDetails({ emergencyContacts: [{ name: "Lee", memberId: "M9", relationshipType: "x" }] }, {});
    expect((r.$set.emergencyContacts as any[])[0].memberId).toBe("M9");
  });
});

describe("single emergency contact list", () => {
  it("keeps the legacy contact in step with priority 1", () => {
    const r = sanitizeSelfDetails({ emergencyContacts: [{ name: "Ann", relationship: "Mother", mobile: "0400" }, { name: "Bob" }] }, {});
    expect(r.$set["contact.emergencyContact"]).toMatchObject({ name: "Ann", relationship: "Mother", phone: "0400" });
    expect(r.touched).toContain("contact.emergencyContact");
    const none = sanitizeSelfDetails({ emergencyContacts: [] }, {});
    expect((none.$set["contact.emergencyContact"] as any).name).toBe("");
  });
});

describe("medical notes", () => {
  it("accepts notes and the opt-out flag", () => {
    const r = sanitizeSelfDetails({ medical: { notes: " asthma ", optOut: true } }, {});
    expect(r.$set["medical.notes"]).toBe("asthma");
    expect(r.$set["medical.optOut"]).toBe(true);
    expect(r.touched).toEqual(expect.arrayContaining(["medical.notes", "medical.optOut"]));
  });
});
