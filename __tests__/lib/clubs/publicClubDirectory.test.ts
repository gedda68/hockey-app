// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getPublicClubs, toPublicClub } from "@/lib/clubs/publicClubDirectory";

describe("toPublicClub", () => {
  it("fills missing nested objects so the grid/modals don't crash", () => {
    const c = toPublicClub({ id: "club-1", name: "Valley Hockey Club", slug: "valleys-hockey" });
    expect(c.colors.primary).toBe("#06054e");
    expect(c.address.state).toBe("QLD");
    expect(c.contact.email).toBe("");
    expect(c.committee).toEqual([]);
    expect(c.active).toBe(true);
  });

  it("only exposes committee email/phone when the member opted in", () => {
    const c = toPublicClub({
      id: "x", name: "X", slug: "x",
      committee: [
        { id: "a", name: "Pat", position: "Secretary", email: "pat@x.au", phone: "0400 000 000" },
        { id: "b", name: "Sam", position: "President", email: "sam@x.au", phone: "0411 111 111",
          showEmailOnPublicSite: true, showPhoneOnPublicSite: true },
      ],
    });
    expect(c.committee[0]).toMatchObject({ name: "Pat", email: undefined, phone: undefined });
    expect(c.committee[1]).toMatchObject({ email: "sam@x.au", phone: "0411 111 111" });
  });

  it("falls back to the legacy iconSrc for the logo and marks inactive clubs", () => {
    expect(toPublicClub({ name: "A", iconSrc: "/icons/A.png" }).logo).toBe("/icons/A.png");
    expect(toPublicClub({ name: "A", active: false }).active).toBe(false);
    expect(toPublicClub({ name: "A", status: "inactive" }).active).toBe(false);
  });
});

describe("getPublicClubs", () => {
  it("queries active clubs sorted by name without sensitive admin fields", async () => {
    let seen: any = {};
    const db: any = {
      collection: () => ({
        find: (q: unknown, opts: any) => {
          seen = { q, projection: opts.projection };
          return { sort: () => ({ toArray: async () => [{ id: "1", name: "B", slug: "b" }] }) };
        },
      }),
    };
    const clubs = await getPublicClubs(db);
    expect(clubs).toHaveLength(1);
    expect(seen.q).toEqual({ active: { $ne: false }, status: { $ne: "inactive" } });
    expect(seen.projection.feeSchedule).toBeUndefined();
    expect(seen.projection.externalRefs).toBeUndefined();
  });
});
