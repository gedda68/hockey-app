import { describe, expect, it } from "vitest";
import { planLinks, resolveManual } from "@/lib/auth/linkUsers";
import { createStaffUserSession } from "@/lib/auth/createAppSession";

const member = (id: string, first: string, last: string, email?: string, clubId = "c1") => ({ _id: `oid-${id}`, memberId: id, clubId, personalInfo: { firstName: first, lastName: last }, contact: { primaryEmail: email } });
const user = (username: string, over: Record<string, unknown> = {}) => ({ _id: `u-${username}`, userId: `U-${username}`, username, ...over });

describe("planLinks", () => {
  const members = [member("MBR-1", "Pat", "Lee", "Pat@Club.com"), member("MBR-2", "Sam", "Roe", "dup@x.com"), member("MBR-3", "Al", "Poe", "dup@x.com"), member("MBR-4", "Jo", "Kay")];

  it("links on a single email match, ignoring case", () => {
    const [d] = planLinks([user("pat", { email: "pat@club.com" })], members);
    expect(d).toMatchObject({ status: "link", memberId: "MBR-1", memberObjectId: "oid-MBR-1", reason: "Same email address" });
  });
  it("uses the member a login already names", () => {
    const [d] = planLinks([user("pat", { linkedMembers: ["MBR-4"], email: "pat@club.com" })], members);
    expect(d).toMatchObject({ status: "link", memberId: "MBR-4", reason: expect.stringContaining("linkedMembers") });
    expect(planLinks([user("x", { linkedMembers: ["MBR-1", "MBR-4"] })], members)[0].status).toBe("none");
  });
  it("won't guess when several members share the email", () => {
    const [d] = planLinks([user("x", { email: "dup@x.com" })], members);
    expect(d.status).toBe("ambiguous");
    expect(d.memberId).toBeUndefined();
  });
  it("only suggests, never links, on name and club", () => {
    const [d] = planLinks([user("jo", { email: "other@x.com", firstName: "Jo", lastName: "Kay", clubId: "c1" })], members);
    expect(d.status).toBe("name-suggestion");
    expect(d.memberId).toBe("MBR-4");
    expect(planLinks([user("jo", { firstName: "Jo", lastName: "Kay", clubId: "other" })], members)[0].status).toBe("none");
  });
  it("leaves already-linked and unmatched logins alone", () => {
    expect(planLinks([user("a", { memberId: "oid-MBR-1", email: "pat@club.com" })], members)[0].status).toBe("already");
    expect(planLinks([user("super", { email: "boss@x.com" })], members)[0].status).toBe("none");
  });
});

describe("resolveManual", () => {
  const members = [member("MBR-9", "Zed", "Ng")];
  const users = [user("zed"), user("done", { memberId: "x" })];
  it("links by hand when both exist", () => {
    expect(resolveManual("ZED", "MBR-9", users, members)).toMatchObject({ status: "link", memberObjectId: "oid-MBR-9" });
  });
  it("explains why it can't", () => {
    expect(resolveManual("nobody", "MBR-9", users, members).status).toBe("none");
    expect(resolveManual("zed", "MBR-0", users, members).status).toBe("none");
    expect(resolveManual("done", "MBR-9", users, members).status).toBe("already");
  });
});

describe("staff login session", () => {
  const db = { collection: () => ({ findOne: async () => null, updateOne: async () => ({}) }) } as never;
  const base = { _id: "u1", userId: "U1", username: "boss", role: "club-admin", status: "active", firstName: "B", lastName: "Oss", email: "b@x.com" };
  it("carries the linked member's id, so matrix roles and personal screens work", async () => {
    const r = await createStaffUserSession(db, { ...base, memberId: "64b0c0ffee64b0c0ffee64b0" });
    expect(r.ok && r.sessionData.memberId).toBe("64b0c0ffee64b0c0ffee64b0");
  });
  it("is unchanged for logins that aren't linked", async () => {
    const r = await createStaffUserSession(db, base);
    expect(r.ok && r.sessionData.memberId).toBeUndefined();
  });
});
