import { describe, it, expect } from "vitest";
import { redactPrivateContact, shareableContact, isContactPrivate } from "@/lib/members/privacy";

const member = (priv: boolean) => ({
  memberId: "M1",
  personalInfo: { firstName: "A", lastName: "B" },
  contact: { email: "a@b.com", primaryEmail: "a@b.com", phone: "07 1", mobile: "04 1", emergencyContact: { name: "X", phone: "9" } },
  address: { street: "1 St", suburb: "Town", state: "QLD", postcode: "4000", country: "AU" },
  privacy: { contactPrivate: priv },
});

describe("contact privacy", () => {
  it("leaves public members untouched", () => {
    const m = member(false);
    expect(redactPrivateContact(m)).toBe(m);
  });
  it("blanks phone, email and address for others when private", () => {
    const r: any = redactPrivateContact(member(true), "someone-else");
    expect(r.contact.email).toBe("");
    expect(r.contact.phone).toBe("");
    expect(r.contact.mobile).toBe("");
    expect(r.address.street).toBe("");
    expect(r.contactPrivate).toBe(true);
    expect(r.personalInfo.firstName).toBe("A"); // name stays
    expect(r.contact.emergencyContact.name).toBe("X"); // emergency contacts stay
  });
  it("shows the owner their own details", () => {
    const m = member(true);
    expect(redactPrivateContact(m, "M1")).toBe(m);
  });
  it("offers nothing to prefill when private", () => {
    expect(shareableContact(member(true))).toBeNull();
    expect(shareableContact(member(false))).toMatchObject({ phone: "07 1", email: "a@b.com" });
    expect(isContactPrivate({})).toBe(false);
  });
});

import { preservePrivateFields } from "@/lib/members/privacy";
describe("preservePrivateFields", () => {
  const existing = member(true);
  it("stops admins wiping or changing private contact, address and privacy", () => {
    const out: any = preservePrivateFields(existing, { contact: { email: "" }, address: {}, privacy: { contactPrivate: false }, notes: "x" }, false);
    expect(out.contact).toBe(existing.contact);
    expect(out.address).toBe(existing.address);
    expect(out.privacy).toBe(existing.privacy);
    expect(out.notes).toBe("x");
  });
  it("lets the owner change them, and leaves non-private members alone", () => {
    const upd = { contact: { email: "n@x.com" } };
    expect(preservePrivateFields(existing, upd, true)).toBe(upd);
    expect(preservePrivateFields(member(false), upd, false)).toBe(upd);
  });
});
