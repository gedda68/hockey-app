import { describe, expect, it } from "vitest";
import {
  containsId,
  dobOf,
  findDuplicateGroups,
  mergeMemberDocs,
  nameKeyOf,
  pickSurvivor,
  rewriteIds,
  type Doc,
  type MemberLite,
} from "@/lib/members/dedupe";

const mk = (memberId: string, over: Doc = {}): MemberLite => ({
  memberId,
  doc: {
    memberId,
    clubId: "",
    roles: [],
    personalInfo: { firstName: "Mitchell", lastName: "Aitchison", dateOfBirth: "2001-05-04" },
    ...over,
  },
});

describe("name and date normalisation", () => {
  it("ignores case, accents, punctuation and spacing", () => {
    expect(nameKeyOf({ personalInfo: { firstName: " MÉLANIE ", lastName: "O'Brien" } })).toBe(
      nameKeyOf({ personalInfo: { firstName: "melanie", lastName: "o brien" } }),
    );
  });
  it("normalises dates of birth", () => {
    expect(dobOf({ personalInfo: { dateOfBirth: "2001-05-04T00:00:00.000Z" } })).toBe("2001-05-04");
    expect(dobOf({ personalInfo: {} })).toBe("");
  });
});

describe("findDuplicateGroups", () => {
  it("groups same name + same birthday as an automatic duplicate", () => {
    const g = findDuplicateGroups([
      mk("MBR-ALT-11226", { clubId: "commercial" }),
      mk("MBR-ALT-OFF-AITCHISON-MITCHELL"),
      mk("MBR-1", { personalInfo: { firstName: "Sam", lastName: "Other", dateOfBirth: "1990-01-01" } }),
    ]);
    expect(g).toHaveLength(1);
    expect(g[0].tier).toBe("auto");
    expect(g[0].memberIds.sort()).toEqual(["MBR-ALT-11226", "MBR-ALT-OFF-AITCHISON-MITCHELL"]);
  });

  it("never merges namesakes with different birthdays", () => {
    const other = { personalInfo: { firstName: "Mitchell", lastName: "Aitchison", dateOfBirth: "1975-02-02" } };
    expect(findDuplicateGroups([mk("A"), mk("B", other)])).toEqual([]);
  });

  it("sends a record with no birthday to review instead of guessing", () => {
    const g = findDuplicateGroups([mk("A"), mk("B", { personalInfo: { firstName: "Mitchell", lastName: "Aitchison" } })]);
    expect(g).toHaveLength(1);
    expect(g[0].tier).toBe("review");
  });

  it("--allow-missing-dob attaches undated records only when unambiguous", () => {
    const undated = { personalInfo: { firstName: "Mitchell", lastName: "Aitchison" } };
    const ok = findDuplicateGroups([mk("A"), mk("B", undated)], { allowMissingDob: true });
    expect(ok[0].tier).toBe("auto");
    // two different birthdays + an undated one: still ambiguous
    const amb = findDuplicateGroups(
      [mk("A"), mk("C", { personalInfo: { firstName: "Mitchell", lastName: "Aitchison", dateOfBirth: "1975-02-02" } }), mk("B", undated)],
      { allowMissingDob: true },
    );
    expect(amb.every((x) => x.tier === "review")).toBe(true);
  });

  it("finds multiple independent groups", () => {
    const sam = (id: string) => mk(id, { personalInfo: { firstName: "Sam", lastName: "Lee", dateOfBirth: "2000-01-01" } });
    expect(findDuplicateGroups([mk("A"), mk("B"), sam("C"), sam("D")])).toHaveLength(2);
  });
});

describe("pickSurvivor", () => {
  const sig = (m: Record<string, { inboundRefs?: number; hasUserAccount?: boolean }>) =>
    new Map(Object.entries(m).map(([k, v]) => [k, { inboundRefs: 0, hasUserAccount: false, ...v }]));

  it("keeps the player record over a staff-only one (Blair Brown)", () => {
    const player = mk("MBR-ALT-19761", { roles: ["role-player"] });
    const coach = mk("MBR-ALT-STAFF-RDC-BROWN-BLAIR", { roles: ["role-coach"] });
    const { survivor, losers } = pickSurvivor([coach, player], sig({}));
    expect(survivor.memberId).toBe("MBR-ALT-19761");
    expect(losers.map((l) => l.memberId)).toEqual(["MBR-ALT-STAFF-RDC-BROWN-BLAIR"]);
  });

  it("prefers the record other data points at when neither is distinguishable", () => {
    const { survivor } = pickSurvivor(
      [mk("A"), mk("B")],
      sig({ B: { inboundRefs: 6 } }),
    );
    expect(survivor.memberId).toBe("B");
  });

  it("prefers a record with a club", () => {
    const { survivor } = pickSurvivor([mk("NOCLUB"), mk("WITHCLUB", { clubId: "commercial" })], sig({}));
    expect(survivor.memberId).toBe("WITHCLUB");
  });

  it("is deterministic on a full tie", () => {
    expect(pickSurvivor([mk("B"), mk("A")], sig({})).survivor.memberId).toBe("A");
  });
});

describe("mergeMemberDocs", () => {
  it("keeps survivor values, fills gaps, unions roles, and records the merge", () => {
    const survivor = mk("KEEP", {
      _id: "keep-oid",
      roles: ["role-player"],
      clubId: "commercial",
      contact: { primaryEmail: "", mobile: "0400" },
    }).doc;
    const loser = mk("DROP", {
      _id: "drop-oid",
      roles: ["role-coach", "role-player"],
      clubId: "other",
      contact: { primaryEmail: "m@x.com", mobile: "0999" },
      playerInfo: { jerseyNumber: "9" },
    }).doc;

    const m = mergeMemberDocs(survivor, [loser], "2026-11-12T00:00:00.000Z") as Doc & {
      contact: Doc;
    };
    expect(m._id).toBe("keep-oid");
    expect(m.memberId).toBe("KEEP");
    expect(m.roles).toEqual(["role-player", "role-coach"]);
    expect(m.clubId).toBe("commercial");
    expect(m.contact).toEqual({ primaryEmail: "m@x.com", mobile: "0400" });
    expect(m.playerInfo).toEqual({ jerseyNumber: "9" });
    expect(m.mergedFromMemberIds).toEqual(["DROP"]);
  });

  it("does not mutate its inputs", () => {
    const s = mk("KEEP", { roles: ["a"] }).doc;
    const l = mk("DROP", { roles: ["b"] }).doc;
    mergeMemberDocs(s, [l], "t");
    expect(s.roles).toEqual(["a"]);
  });
});

describe("rewriteIds", () => {
  const map = new Map([["DROP", "KEEP"]]);

  it("re-points exact matches anywhere, including nested and arrays", () => {
    const doc = {
      memberId: "DROP",
      captain: { memberId: "DROP", name: "x" },
      players: ["DROP", "OTHER"],
      note: "contains DROP inside text",
    };
    const { value, replaced } = rewriteIds(doc, map);
    expect(replaced).toBe(3);
    expect(value).toEqual({
      memberId: "KEEP",
      captain: { memberId: "KEEP", name: "x" },
      players: ["KEEP", "OTHER"],
      note: "contains DROP inside text",
    });
  });

  it("collapses a roster that listed both duplicates", () => {
    const { value } = rewriteIds({ memberIds: ["KEEP", "DROP", "ZED"] }, map);
    expect(value).toEqual({ memberIds: ["KEEP", "ZED"] });
  });

  it("merges duplicate roster entries (objects) into one", () => {
    const { value } = rewriteIds(
      { roster: [{ memberId: "KEEP", position: "" }, { memberId: "DROP", position: "GK" }] },
      map,
    );
    expect(value).toEqual({ roster: [{ memberId: "KEEP", position: "GK" }] });
  });

  it("never rewrites _id", () => {
    const { value, replaced } = rewriteIds({ _id: "DROP" }, map);
    expect(replaced).toBe(0);
    expect(value).toEqual({ _id: "DROP" });
  });

  it("does not collapse arrays it did not change", () => {
    const { value } = rewriteIds({ tags: ["a", "a"] }, map);
    expect(value).toEqual({ tags: ["a", "a"] });
  });
});

describe("containsId", () => {
  it("counts exact string hits and skips _id", () => {
    const ids = new Set(["DROP"]);
    expect(containsId({ _id: "DROP", a: "DROP", b: ["DROP", { c: "DROP" }], d: "xDROP" }, ids)).toBe(3);
  });
});

describe("mergeGeneratedShadows (data with no birthdays)", () => {
  const noDob = (id: string, first: string, last: string, over: Doc = {}): MemberLite => ({
    memberId: id,
    doc: { memberId: id, roles: [], personalInfo: { firstName: first, lastName: last }, ...over },
  });

  it("is off by default: nothing merges without birthdays", () => {
    const g = findDuplicateGroups([
      noDob("MBR-ALT-19761", "Blair", "Brown"),
      noDob("MBR-ALT-STAFF-RDC-BROWN-BLAIR", "Blair", "Brown"),
    ]);
    expect(g.every((x) => x.tier === "review")).toBe(true);
  });

  it("merges generated staff/official records into the single player record", () => {
    const g = findDuplicateGroups(
      [
        noDob("MBR-ALT-19761", "Blair", "Brown"),
        noDob("MBR-ALT-STAFF-RDC-BROWN-BLAIR", "Blair", "Brown"),
        noDob("MBR-ALT-OFF-BROWN-BLAIR", "Blair", "Brown"),
      ],
      { mergeGeneratedShadows: true },
    );
    expect(g).toHaveLength(1);
    expect(g[0].tier).toBe("auto");
    expect(g[0].memberIds).toEqual([
      "MBR-ALT-19761",
      "MBR-ALT-STAFF-RDC-BROWN-BLAIR",
      "MBR-ALT-OFF-BROWN-BLAIR",
    ]);
  });

  it("leaves ambiguous groups for review: two player records with the same name", () => {
    const g = findDuplicateGroups(
      [
        noDob("MBR-ALT-10515", "Steven", "Green"),
        noDob("MBR-ALT-16141", "Steven", "Green"),
        noDob("MBR-ALT-STAFF-CHC-GREEN-STEVEN", "Steven", "Green"),
      ],
      { mergeGeneratedShadows: true },
    );
    expect(g).toHaveLength(1);
    expect(g[0].tier).toBe("review");
  });

  it("leaves staff-only groups for review", () => {
    const g = findDuplicateGroups(
      [noDob("MBR-ALT-STAFF-A-X-JO", "Jo", "X"), noDob("MBR-ALT-OFF-X-JO", "Jo", "X")],
      { mergeGeneratedShadows: true },
    );
    expect(g.every((x) => x.tier === "review")).toBe(true);
  });

  it("makes the player record the survivor", () => {
    const player = noDob("MBR-ALT-19761", "Blair", "Brown", { roles: ["role-player"] });
    const coach = noDob("MBR-ALT-STAFF-RDC-BROWN-BLAIR", "Blair", "Brown", { roles: ["role-coach"] });
    expect(pickSurvivor([coach, player], new Map()).survivor.memberId).toBe("MBR-ALT-19761");
  });
});

describe("attachUndatedToDated (--merge-undated)", () => {
  const rec = (id: string, dob?: string, over: Doc = {}): MemberLite => ({
    memberId: id,
    doc: { memberId: id, roles: [], personalInfo: { firstName: "Jo", lastName: "Lee", ...(dob ? { dateOfBirth: dob } : {}) }, ...over },
  });

  it("is off by default", () => {
    expect(findDuplicateGroups([rec("A", "2000-01-01"), rec("B")]).every((g) => g.tier === "review")).toBe(true);
  });

  it("merges the undated record into the dated one and keeps the dated one", () => {
    const members = [rec("UNDATED", undefined, { roles: ["role-player"] }), rec("DATED", "2000-01-01")];
    const g = findDuplicateGroups(members, { attachUndatedToDated: true });
    expect(g).toHaveLength(1);
    expect(g[0].tier).toBe("auto");
    expect(g[0].keepFrom).toEqual(["DATED"]);
    const { survivor, losers } = pickSurvivor(members, new Map(), g[0].keepFrom);
    // even though the undated record has the player role, the dated record is kept
    expect(survivor.memberId).toBe("DATED");
    expect(losers.map((l) => l.memberId)).toEqual(["UNDATED"]);
  });

  it("does not guess when the dated records have different birthdays", () => {
    const g = findDuplicateGroups([rec("A", "2000-01-01"), rec("B", "1975-05-05"), rec("C")], {
      attachUndatedToDated: true,
    });
    expect(g.every((x) => x.tier === "review")).toBe(true);
  });

  it("does nothing when nobody has a birthday", () => {
    const g = findDuplicateGroups([rec("A"), rec("B")], { attachUndatedToDated: true });
    expect(g.every((x) => x.tier === "review")).toBe(true);
  });

  it("merges several undated records and extra dated copies with the same birthday", () => {
    const g = findDuplicateGroups([rec("D1", "2000-01-01"), rec("D2", "2000-01-01"), rec("U1"), rec("U2")], {
      attachUndatedToDated: true,
    });
    expect(g).toHaveLength(1);
    expect([...g[0].memberIds].sort()).toEqual(["D1", "D2", "U1", "U2"]);
    expect([...(g[0].keepFrom ?? [])].sort()).toEqual(["D1", "D2"]);
  });
});

describe("same-name merging for data without birthdays", () => {
  const m = (memberId: string, clubId = "", extra: Record<string, unknown> = {}) => ({
    memberId,
    doc: { memberId, clubId, roles: [], personalInfo: { firstName: "Hugh", lastName: "Abrahams", dateOfBirth: "" }, ...extra },
  });

  it("merges two numeric records plus a staff shadow when they share a club", () => {
    const g = findDuplicateGroups(
      [m("MBR-ALT-10833", "nth"), m("MBR-ALT-19718", "nth"), m("MBR-ALT-STAFF-NTH-ABRAHAMS-HUGH", "nth")],
      { mergeGeneratedShadows: true, mergeSameName: true },
    );
    expect(g).toHaveLength(1);
    expect(g[0].tier).toBe("auto");
    expect(g[0].memberIds).toHaveLength(3);
  });

  it("keeps same name in different clubs for review", () => {
    const g = findDuplicateGroups([m("MBR-ALT-1", "a"), m("MBR-ALT-2", "b")], { mergeSameName: true });
    expect(g[0].tier).toBe("review");
    expect(g[0].reason).toMatch(/different clubs/);
  });

  it("sends a staff record at another club than the player to review instead of merging", () => {
    const g = findDuplicateGroups(
      [m("MBR-ALT-11107", "kwc"), m("MBR-ALT-STAFF-VAL-KERR-MATTHEW", "val")],
      { mergeGeneratedShadows: true },
    );
    expect(g[0].tier).toBe("review");
  });

  it("still merges a staff record with no club, or the same club", () => {
    expect(findDuplicateGroups([m("MBR-ALT-1", "a"), m("MBR-ALT-OFF-X", "")], { mergeGeneratedShadows: true })[0].tier).toBe("auto");
    expect(findDuplicateGroups([m("MBR-ALT-1", "a"), m("MBR-ALT-STAFF-A-X", "a")], { mergeGeneratedShadows: true })[0].tier).toBe("auto");
  });
});
