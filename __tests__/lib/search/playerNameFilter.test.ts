import { describe, expect, it } from "vitest";
import {
  MAX_NAME_TOKENS,
  buildPlayerNameFilter,
  tokenizePlayerQuery,
} from "@/lib/search/playerNameFilter";

type NameClause = { $or: Array<Record<string, { $regex: RegExp }>> };

function clauses(q: string): NameClause[] {
  const f = buildPlayerNameFilter(q) as { $and: NameClause[] } | null;
  return f ? f.$and : [];
}

describe("tokenizePlayerQuery", () => {
  it("splits on whitespace and trims", () => {
    expect(tokenizePlayerQuery("  jane   smith ")).toEqual(["jane", "smith"]);
  });

  it("caps the number of tokens", () => {
    const toks = tokenizePlayerQuery("a1 b2 c3 d4 e5");
    expect(toks).toHaveLength(MAX_NAME_TOKENS);
  });
});

describe("buildPlayerNameFilter", () => {
  it("returns null for empty or whitespace-only input", () => {
    expect(buildPlayerNameFilter("")).toBeNull();
    expect(buildPlayerNameFilter("   ")).toBeNull();
  });

  it("returns null when any token is shorter than 2 characters", () => {
    expect(buildPlayerNameFilter("a")).toBeNull();
    expect(buildPlayerNameFilter("jane s")).toBeNull();
  });

  it("builds one AND clause per token, each OR-ing the name fields", () => {
    const c = clauses("jane smi");
    expect(c).toHaveLength(2);
    for (const clause of c) {
      const fields = clause.$or.map((o) => Object.keys(o)[0]);
      expect(fields).toEqual([
        "personalInfo.firstName",
        "personalInfo.lastName",
        "personalInfo.preferredName",
        "personalInfo.displayName",
      ]);
    }
  });

  it("matches on word prefix, case-insensitively", () => {
    const re = clauses("smi")[0].$or[1]["personalInfo.lastName"].$regex;
    expect(re.test("Smith")).toBe(true);
    expect(re.test("smithers")).toBe(true);
    expect(re.test("Blacksmith")).toBe(false); // mid-word fragments do not match
  });

  it("escapes regex metacharacters so input cannot widen the match", () => {
    const re = clauses(".*")[0].$or[0]["personalInfo.firstName"].$regex;
    expect(re.test("Jane")).toBe(false);
    expect(re.test(".*anything")).toBe(true);

    const re2 = clauses("a(b")[0].$or[0]["personalInfo.firstName"].$regex;
    expect(() => re2.test("x")).not.toThrow();
  });
});
