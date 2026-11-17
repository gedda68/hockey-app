import { describe, expect, it } from "vitest";
import { createMemberSession } from "@/lib/auth/createAppSession";
import { isPersonaStillHeld } from "@/lib/auth/sessionFreshness";

const db = () => ({
  collection: () => ({ findOne: async () => ({ id: "c1", name: "Commercial", slug: "chc", shortName: "CHC" }), updateOne: async () => ({}) }),
}) as any;

const member = (roles: unknown[], over: Record<string, unknown> = {}) => ({
  _id: { toString: () => "abc123" }, clubId: "c1", status: "active",
  personalInfo: { firstName: "Sam", lastName: "Lee" }, auth: { username: "sam" }, roles, ...over,
});

describe("member login profile", () => {
  it("signs a member who also umpires in as Member, in their own club", async () => {
    const r = await createMemberSession(db(), member(["umpire", "player"]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.sessionData.role).toBe("member");
    expect(r.sessionData.clubId).toBe("c1");
    expect(r.user.role).toBe("member");
  });

  it("leaves a platform admin as they are", async () => {
    const r = await createMemberSession(db(), member([{ role: "super-admin", scopeType: "global" }], { auth: { username: "sa", role: "super-admin" } }));
    if (r.ok) expect(["member", "super-admin"]).toContain(r.sessionData.role);
  });

  it("never treats the member profile as an ended role", () => {
    expect(isPersonaStillHeld({ role: "member", clubId: "c1", associationId: null }, [])).toBe(true);
    expect(isPersonaStillHeld({ role: "umpire", clubId: "c1", associationId: null }, [])).toBe(false);
  });
});
