import { describe, expect, it } from "vitest";
import { guardianCheckForRequest, MINOR_ALLOWED_LEGACY_ROLES } from "@/lib/access/guardians";

const NOW = new Date("2026-06-01T00:00:00Z");
const adult = { memberId: "m1", personalInfo: { dateOfBirth: "1990-01-01" } };
const child = (extra: Record<string, unknown> = {}) => ({
  memberId: "kid",
  personalInfo: { dateOfBirth: "2012-03-04", relatedMembers: [{ memberId: "mum", relationshipType: "Mother" }] },
  ...extra,
});
const db = { collection: () => ({ find: () => ({ toArray: async () => [] }) }) } as never;

describe("guardianCheckForRequest", () => {
  it("asks nothing of adults", async () => {
    expect(await guardianCheckForRequest(db, adult, "coach", undefined, NOW)).toEqual({ required: false });
  });

  it("limits under-18s to junior roles", async () => {
    for (const r of ["club-admin", "registrar", "coach", "manager", "assoc-committee", "team-selector"]) {
      const c = await guardianCheckForRequest(db, child(), r, undefined, NOW);
      expect(c).toMatchObject({ required: true, ok: false, status: 400 });
    }
    for (const r of MINOR_ALLOWED_LEGACY_ROLES) {
      expect((await guardianCheckForRequest(db, child(), r, undefined, NOW)).required).toBe(true);
    }
  });

  it("needs a linked guardian", async () => {
    const c = await guardianCheckForRequest(db, { memberId: "kid", personalInfo: { dateOfBirth: "2012-03-04" } }, "player", undefined, NOW);
    expect(c).toMatchObject({ ok: false, status: 400 });
  });

  it("is pending when the child or an admin submits", async () => {
    const own = await guardianCheckForRequest(db, child(), "player", { memberId: "kid" }, NOW);
    const admin = await guardianCheckForRequest(db, child(), "player", { memberId: "admin1" }, NOW);
    for (const c of [own, admin]) expect(c).toMatchObject({ ok: true, approval: { status: "pending", guardianIds: ["mum"] } });
  });

  it("is approved straight away when the parent submits it", async () => {
    const c = await guardianCheckForRequest(db, child(), "player", { memberId: "mum", name: "Mum" }, NOW);
    expect(c).toMatchObject({ ok: true, approval: { status: "approved", decidedBy: "mum", decidedByName: "Mum" } });
  });

  it("turns 18 on the day: no longer a minor", async () => {
    const t = { memberId: "k", personalInfo: { dateOfBirth: "2008-06-01" } };
    expect(await guardianCheckForRequest(db, t, "coach", undefined, NOW)).toEqual({ required: false });
    expect((await guardianCheckForRequest(db, t, "coach", undefined, new Date("2026-05-31T00:00:00Z"))).required).toBe(true);
  });
});
