import { describe, it, expect } from "vitest";
import { redactSensitive, protectMember, canSeeSensitive, preserveSensitiveFields, hasRelease } from "@/lib/members/sharing";

const yr = new Date().getFullYear();
const base = () => ({
  _id: "abc",
  memberId: "M1",
  personalInfo: { firstName: "A" },
  contact: { phone: "1", emergencyContact: { name: "Mum" } },
  medical: { conditions: "asthma" },
  healthcare: { medicare: { number: "123" } },
  blueCard: { cardNumber: "9" },
  emergencyContacts: [{ name: "Mum" }],
  sharing: { releases: [{ releaseId: "r", purpose: "team-acceptance", audience: "club", scopeId: "chc", label: "CHC J1", seasonYear: yr, grantedAt: "" }] },
});

describe("sensitive data is private unless released", () => {
  it("hides medical, healthcare, blue card and emergency contacts from strangers and the public", () => {
    const r: any = redactSensitive(base(), null);
    expect(r.medical).toBeUndefined();
    expect(r.healthcare).toBeUndefined();
    expect(r.blueCard).toBeUndefined();
    expect(r.emergencyContacts).toBeUndefined();
    expect(r.contact.emergencyContact).toBeUndefined();
    expect(r.sensitiveWithheld).toBe(true);
    expect(r.personalInfo.firstName).toBe("A");
  });
  it("shows the owner and super-admin everything", () => {
    expect(canSeeSensitive(base(), { memberId: "abc" })).toBe(true);
    expect(canSeeSensitive(base(), { memberId: "M1" })).toBe(true);
    expect(canSeeSensitive(base(), { role: "super-admin" })).toBe(true);
  });
  it("releases data to club staff of the team's club for the season only", () => {
    expect(hasRelease(base(), { role: "coach", clubSlug: "chc" })).toBe(true);
    expect(hasRelease(base(), { role: "club-admin", clubId: "chc" })).toBe(true);
    expect(hasRelease(base(), { role: "coach", clubSlug: "other" })).toBe(false);
    expect(hasRelease(base(), { role: "player", clubSlug: "chc" })).toBe(false);
    expect(hasRelease(base(), { role: "coach", clubSlug: "chc" }, yr + 1)).toBe(false); // expired
  });
  it("association releases honour scope and the wildcard", () => {
    const m: any = base();
    m.sharing.releases = [{ audience: "association", scopeId: "*", seasonYear: yr }];
    expect(hasRelease(m, { role: "assoc-selector", associationId: "x" })).toBe(true);
    expect(hasRelease(m, { role: "club-admin", clubId: "chc" })).toBe(false);
  });
  it("protectMember also applies contact privacy", () => {
    const m: any = { ...base(), privacy: { contactPrivate: true } };
    const r: any = protectMember(m, { role: "coach", clubSlug: "chc" });
    expect(r.medical).toBeDefined(); // released
    expect(r.contact.phone).toBe(""); // private
  });
  it("preserves withheld fields on save", () => {
    const upd: any = { medical: {}, emergencyContacts: [], contact: { phone: "5" }, notes: "n" };
    const out: any = preserveSensitiveFields(base(), upd, { role: "club-admin", clubId: "other" });
    expect(out.medical).toEqual({ conditions: "asthma" });
    expect(out.emergencyContacts).toEqual([{ name: "Mum" }]);
    expect(out.contact.emergencyContact).toEqual({ name: "Mum" });
    expect(out.notes).toBe("n");
  });
});

describe("medical notes opt-out", () => {
  it("keeps free-text notes private from released staff, but not from the owner", () => {
    const m: any = { ...base(), medical: { conditions: "asthma", notes: "private note", optOut: true } };
    const staff: any = redactSensitive(m, { role: "coach", clubSlug: "chc" });
    expect(staff.medical.conditions).toBe("asthma");
    expect(staff.medical.notes).toBeNull();
    expect((redactSensitive(m, { memberId: "M1" }) as any).medical.notes).toBe("private note");
  });
});
