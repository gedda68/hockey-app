import { describe, expect, it } from "vitest";
import { dayInZone, todayInZone } from "@/lib/member/availability";
import { unavailableForClubOnDay, unavailableOnDay, upcomingUnavailability } from "@/lib/member/availabilityLookup";
import { evaluateFixtureUmpireAssignments } from "@/lib/officiating/umpireCoiAndAvailability";

type Row = Record<string, any>;
/** Tiny in-memory db: availability rows, members, an official register. */
function fakeDb(avail: Row[], members: Row[] = [], register: Row[] = []) {
  const cover = (r: Row, q: Row) =>
    (!q.memberId?.$in || q.memberId.$in.includes(r.memberId)) &&
    (!q.kind || r.kind === q.kind) &&
    (!q.from?.$lte || r.from <= q.from.$lte) &&
    (!q.to?.$gte || r.to >= q.to.$gte);
  return {
    collection: (n: string) => ({
      find: (q: Row) => {
        const rows = n === "member_availability" ? avail.filter((r) => cover(r, q)) : n === "members" ? members.filter((m) => q.memberId.$in.includes(m.memberId) && (m.clubId === q.$or?.[1]?.clubId || m.membership?.clubId === q.$or?.[0]?.["membership.clubId"])) : [];
        const c: any = { sort: () => { rows.sort((x: Row, y: Row) => String(x.from).localeCompare(String(y.from))); return c; }, toArray: async () => rows };
        return c;
      },
      findOne: async (q: Row) => {
        if (n === "association_official_register") return register.find((r) => r.memberId === q.$or?.[0]?.memberId || r.umpireNumber === q.$or?.[1]?.umpireNumber) ?? null;
        return null;
      },
    }),
  } as never;
}
const away = (memberId: string, from: string, to: string, note?: string): Row => ({ memberId, kind: "unavailable", from, to, ...(note ? { note } : {}) });

describe("days in the app's time zone", () => {
  it("uses Brisbane's calendar day, not UTC's", () => {
    expect(dayInZone("2026-03-14T20:00:00Z")).toBe("2026-03-15"); // 6am Sunday in Brisbane
    expect(dayInZone("2026-03-14T10:00:00Z")).toBe("2026-03-14");
    expect(dayInZone(null)).toBeNull();
    expect(dayInZone("junk")).toBeNull();
    expect(todayInZone(new Date("2026-11-17T15:00:00Z"))).toBe("2026-11-18");
  });
});

describe("unavailableOnDay", () => {
  it("returns only people unavailable that day", async () => {
    const db = fakeDb([away("a", "2026-12-01", "2026-12-05", "away"), away("b", "2026-12-10", "2026-12-12"), { ...away("c", "2026-12-01", "2026-12-05"), kind: "available" }]);
    const r = await unavailableOnDay(db, ["a", "b", "c"], "2026-12-03");
    expect([...r.keys()]).toEqual(["a"]);
    expect(r.get("a")?.note).toBe("away");
  });
  it("is empty without a day or people", async () => {
    const db = fakeDb([away("a", "2026-12-01", "2026-12-05")]);
    expect((await unavailableOnDay(db, ["a"], null)).size).toBe(0);
    expect((await unavailableOnDay(db, [], "2026-12-03")).size).toBe(0);
  });
});

describe("unavailableForClubOnDay", () => {
  it("only shows players of that club", async () => {
    const db = fakeDb(
      [away("mine", "2026-12-01", "2026-12-05"), away("theirs", "2026-12-01", "2026-12-05")],
      [{ memberId: "mine", clubId: "c1" }, { memberId: "theirs", clubId: "c2" }],
    );
    expect(Object.keys(await unavailableForClubOnDay(db, "c1", "2026-12-02"))).toEqual(["mine"]);
  });
});

describe("upcomingUnavailability", () => {
  it("lists unfinished periods starting within the window, soonest first", async () => {
    const db = fakeDb([away("a", "2026-12-20", "2026-12-22"), away("a", "2026-11-18", "2026-11-19"), away("a", "2025-01-01", "2025-01-02"), away("a", "2028-01-01", "2028-01-02")]);
    const r = await upcomingUnavailability(db, ["a"], "2026-11-17", 120);
    expect(r.get("a")?.map((e) => e.from)).toEqual(["2026-11-18", "2026-12-20"]);
  });
});

describe("umpire allocation warns about self-reported unavailability", () => {
  const input = (umpireId: string, scheduledStart: string | null) => ({
    associationId: "assoc", homeTeamId: "h", awayTeamId: "a", proposedUmpires: [{ umpireType: "umpire", umpireId }], scheduledStart,
  });
  const register = [{ memberId: "u1", umpireNumber: "U-1", associationId: "assoc" }];

  it("adds a warning, never a block", async () => {
    const db = fakeDb([away("u1", "2026-12-01", "2026-12-05", "wedding")], [], register);
    const { slots } = await evaluateFixtureUmpireAssignments(db, input("u1", "2026-12-03T00:00:00Z"));
    expect(slots[0].warnings.map((w) => w.code)).toContain("member_marked_unavailable");
    expect(slots[0].warnings.find((w) => w.code === "member_marked_unavailable")?.message).toContain("wedding");
    expect(slots[0].blockingIssues.map((b) => b.code)).not.toContain("member_marked_unavailable");
  });

  it("finds them by umpire number too", async () => {
    const db = fakeDb([away("u1", "2026-12-01", "2026-12-05")], [], register);
    const { slots } = await evaluateFixtureUmpireAssignments(db, input("U-1", "2026-12-03T00:00:00Z"));
    expect(slots[0].warnings.map((w) => w.code)).toContain("member_marked_unavailable");
  });

  it("is quiet on other days or when the match has no date", async () => {
    const db = fakeDb([away("u1", "2026-12-01", "2026-12-05")], [], register);
    for (const when of ["2026-12-20T00:00:00Z", null]) {
      const { slots } = await evaluateFixtureUmpireAssignments(db, input("u1", when));
      expect(slots[0].warnings.map((w) => w.code)).not.toContain("member_marked_unavailable");
    }
  });
});
