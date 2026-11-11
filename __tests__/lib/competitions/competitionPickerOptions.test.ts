// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildCompetitionPicker, leagueOf } from "@/lib/competitions/competitionPickerOptions";

const sc = (id: string, season: string, name: string) => ({ seasonCompetitionId: id, season, competitionName: name, competitionId: id, href: `/x?id=${id}` });

describe("buildCompetitionPicker", () => {
  it("groups by season (newest first) then league, grades in natural order", () => {
    const out = buildCompetitionPicker([
      sc("a", "2025", "Men's Premier League"),
      sc("b", "2026", "BHL 10"),
      sc("c", "2026", "BHL 2"),
      sc("d", "2026", "Men's Premier League"),
      sc("e", "2026", "JHL U12A"),
      sc("f", "2026", "BHL 1"),
      sc("g", "2026", "MHL 1"),
    ]);
    expect(out.map((s) => s.season)).toEqual(["2026", "2025"]);
    expect(out[0]!.groups.map((g) => g.league)).toEqual(["BHL", "JHL", "MHL", "Other competitions"]);
    expect(out[0]!.groups[0]!.options.map((o) => o.label)).toEqual(["BHL 1", "BHL 2", "BHL 10"]);
    expect(out[0]!.firstHref).toBe("/x?id=f");
    expect(out[1]!.groups).toEqual([{ league: "Other competitions", options: [{ id: "a", label: "Men's Premier League", href: "/x?id=a" }] }]);
  });

  it("detects league acronyms", () => {
    expect(leagueOf("JHL Under 12 BYE Games")).toBe("JHL");
    expect(leagueOf("Women's Premier League")).toBe("Other competitions");
  });
});
