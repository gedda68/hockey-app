import { describe, it, expect } from "vitest";
import { findPossibleDuplicates, similarFirst, editDistance } from "@/lib/members/possibleDuplicates";

const m = (memberId: string, firstName: string, lastName: string, dateOfBirth = "", extra: Record<string, any> = {}) => ({ memberId, personalInfo: { firstName, lastName, dateOfBirth }, ...extra });

describe("name helpers", () => {
  it("matches short forms and one-letter typos", () => {
    expect(similarFirst("matt", "matthew")).toBe(true);
    expect(similarFirst("jon", "john")).toBe(true);
    expect(similarFirst("sam", "tom")).toBe(false);
    expect(editDistance("kitten", "sitting")).toBe(3);
  });
});

describe("findPossibleDuplicates", () => {
  it("finds same birthday + short first name", () => {
    const r = findPossibleDuplicates([m("a", "Matt", "Smith", "2001-02-03"), m("b", "Matthew", "Smith", "2001-02-03")]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ confidence: "high", memberIds: ["a", "b"] });
  });
  it("finds swapped names and typo surnames on the same birthday", () => {
    expect(findPossibleDuplicates([m("a", "Lee", "Chris", "2000-01-01"), m("b", "Chris", "Lee", "2000-01-01")])[0].reason).toMatch(/swapped/);
    expect(findPossibleDuplicates([m("a", "Ann", "Jonson", "2000-01-01"), m("b", "Ann", "Johnson", "2000-01-01")])[0].confidence).toBe("high");
  });
  it("ignores exact same-name pairs (the dedupe tool handles them) and unrelated people", () => {
    expect(findPossibleDuplicates([m("a", "Sam", "Lee", "2000-01-01"), m("b", "Sam", "Lee", "2000-01-01")])).toEqual([]);
    expect(findPossibleDuplicates([m("a", "Sam", "Lee", "2000-01-01"), m("b", "Tom", "Wong", "2000-01-01")])).toEqual([]);
  });
  it("flags a shared email as low unless the names match", () => {
    const c = (id: string, f: string, l: string) => m(id, f, l, "", { contact: { primaryEmail: "x@y.com" } });
    expect(findPossibleDuplicates([c("a", "Amy", "Park"), c("b", "Ben", "Park")])[0].confidence).toBe("low");
    expect(findPossibleDuplicates([c("a", "Amy", "Park"), c("b", "Amyy", "Park")])[0].confidence).toBe("high");
  });
});
