import { describe, it, expect, vi } from "vitest";

const sendEmail = vi.fn(async (_o: unknown) => ({ success: true }));
vi.mock("@/lib/email/client", () => ({ sendEmail: (o: unknown) => sendEmail(o), APP_URL: "http://localhost:3001" }));

import { notifyBlueCardVerifier } from "@/lib/notifications/blueCardVerification";

function fakeDb(verifier: any) {
  const inserted: any[] = [];
  return {
    inserted,
    db: {
      collection: (n: string) => ({
        findOne: async () => (n === "members" ? verifier : null),
        insertOne: async (d: any) => { inserted.push({ n, d }); },
      }),
    } as any,
  };
}

describe("notifyBlueCardVerifier", () => {
  const member = { memberId: "m1", personalInfo: { firstName: "Sam", lastName: "Lee" }, membership: { clubId: "c1" } };

  it("creates an in-app notification and emails the verifier", async () => {
    const { db, inserted } = fakeDb({ memberId: "adm1", personalInfo: { firstName: "Ada" }, contact: { primaryEmail: "ada@x.com" } });
    const r = await notifyBlueCardVerifier(db, { member, verifierMemberId: "adm1", requestedBy: "Reg", clubName: "CHC" });
    expect(r).toMatchObject({ inApp: true, email: true });
    expect(inserted[0].d).toMatchObject({ memberId: "adm1", type: "blue_card_verification", link: "/admin/members/m1/edit", dismissedAt: null });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "ada@x.com" }));
  });

  it("still creates the in-app notice when the verifier has no email", async () => {
    sendEmail.mockClear();
    const { db, inserted } = fakeDb({ memberId: "adm1", personalInfo: { firstName: "Ada" } });
    const r = await notifyBlueCardVerifier(db, { member, verifierMemberId: "adm1" });
    expect(r).toMatchObject({ inApp: true, email: false });
    expect(inserted).toHaveLength(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does nothing if the verifier does not exist", async () => {
    const { db, inserted } = fakeDb(null);
    expect((await notifyBlueCardVerifier(db, { member, verifierMemberId: "zzz" })).inApp).toBe(false);
    expect(inserted).toHaveLength(0);
  });
});
