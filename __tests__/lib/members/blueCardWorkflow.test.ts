import { describe, it, expect } from "vitest";
import { applyBlueCardUpdate, canVerifyBlueCard } from "@/lib/members/blueCardWorkflow";

const member = { membership: { clubId: "club-1" } };
const clubAdmin = { role: "club-admin", clubId: "club-1", memberId: "adm1", firstName: "Ada", lastName: "Admin" };

describe("canVerifyBlueCard", () => {
  it("allows the member's club admin and super-admin only", () => {
    expect(canVerifyBlueCard(clubAdmin, member)).toBe(true);
    expect(canVerifyBlueCard({ role: "super-admin" }, member)).toBe(true);
    expect(canVerifyBlueCard({ role: "club-admin", clubId: "club-2" }, member)).toBe(false);
    expect(canVerifyBlueCard({ role: "registrar", clubId: "club-1" }, member)).toBe(false);
    expect(canVerifyBlueCard({ role: "player", scopedRoles: [{ role: "club-admin", scopeType: "club", scopeId: "club-1" }] }, member)).toBe(true);
    expect(canVerifyBlueCard(null, member)).toBe(false);
  });
});

describe("applyBlueCardUpdate", () => {
  const stored = { cardNumber: "111", expiryDate: "2028-01-01", linkedToClub: true, lastVerifiedDate: "2026-01-01", verifiedBy: "Ada Admin", verificationStatus: "verified", verifierMemberId: "adm1" };

  it("ignores edits to the locked fields from non club admins", () => {
    const r = applyBlueCardUpdate({ existing: stored, incoming: { ...stored, linkedToClub: false, lastVerifiedDate: "2030-01-01", verifiedBy: "Me" }, canVerify: false, actor: { role: "registrar" } });
    expect(r.blueCard).toMatchObject({ linkedToClub: true, lastVerifiedDate: "2026-01-01", verifiedBy: "Ada Admin" });
    expect(r.notifyVerifier).toBe(false);
  });

  it("clears the verification and re-requests it when the card changes", () => {
    const r = applyBlueCardUpdate({ existing: stored, incoming: { ...stored, cardNumber: "222" }, canVerify: false, actor: { role: "registrar", firstName: "Reg" } });
    expect(r.blueCard).toMatchObject({ linkedToClub: false, lastVerifiedDate: "", verificationStatus: "requested", verificationRequestedBy: "Reg" });
    expect(r.notifyVerifier).toBe(true);
    expect(r.verifierMemberId).toBe("adm1");
  });

  it("notifies when a verifier is first nominated, not on unrelated saves", () => {
    const base = { cardNumber: "1", expiryDate: "2028-01-01" };
    const first = applyBlueCardUpdate({ existing: base, incoming: { ...base, verifierMemberId: "adm1" }, canVerify: false, actor: { role: "registrar" } });
    expect(first.notifyVerifier).toBe(true);
    const again = applyBlueCardUpdate({ existing: first.blueCard, incoming: { ...first.blueCard, notes: "x" }, canVerify: false, actor: { role: "registrar" } });
    expect(again.notifyVerifier).toBe(false);
    const changed = applyBlueCardUpdate({ existing: first.blueCard, incoming: { ...first.blueCard, verifierMemberId: "adm2" }, canVerify: false, actor: { role: "registrar" } });
    expect(changed.notifyVerifier).toBe(true);
  });

  it("lets a club admin verify and stamps who did it", () => {
    const existing = { cardNumber: "1", verifierMemberId: "adm1", verificationStatus: "requested" };
    const r = applyBlueCardUpdate({ existing, incoming: { ...existing, linkedToClub: true, lastVerifiedDate: "2026-11-14" }, canVerify: true, actor: clubAdmin });
    expect(r.blueCard).toMatchObject({ linkedToClub: true, lastVerifiedDate: "2026-11-14", verifiedBy: "Ada Admin", verifiedByMemberId: "adm1", verificationStatus: "verified" });
    expect(r.notifyVerifier).toBe(false);
  });
});
