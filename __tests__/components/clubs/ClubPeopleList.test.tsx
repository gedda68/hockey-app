// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import { renderToStaticMarkup } from "react-dom/server";
import ClubPeopleList, { pageWindow } from "@/components/clubs/ClubPeopleList";

const people = Array.from({ length: 60 }, (_, i) => ({
  memberId: `m${i}`, name: `Person ${i}`, firstName: "Person", lastName: String(i).padStart(2, "0"), photoUrl: null, roles: ["Player"], teams: [],
}));
const rows = (html: string) => (html.match(/Not selected in a team/g) ?? []).length;

describe("ClubPeopleList pagination", () => {
  it("shows at most 25 rows per page", () => {
    expect(rows(renderToStaticMarkup(<ClubPeopleList clubId="c" kind="player" people={people} />))).toBe(25);
    const last = renderToStaticMarkup(<ClubPeopleList clubId="c" kind="player" people={people} page={3} />);
    expect(rows(last)).toBe(10);
    expect(last).toContain("Showing 51–60 of 60");
    expect(last).toContain('href="/clubs/c/players?page=2"');
  });
  it("clamps out-of-range pages and hides the pager for one page", () => {
    expect(renderToStaticMarkup(<ClubPeopleList clubId="c" kind="player" people={people} page={99} />)).toContain("Showing 51–60 of 60");
    expect(renderToStaticMarkup(<ClubPeopleList clubId="c" kind="coach" people={people.slice(0, 5)} />)).not.toContain("Pagination");
  });
  it("windows page numbers", () => {
    expect(pageWindow(5, 10)).toEqual([1, "…", 4, 5, 6, "…", 10]);
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });
});

import { filterPeople, matchPeople } from "@/lib/clubs/peopleSearch";

describe("people search", () => {
  const opts = [
    { memberId: "a", name: "Zoë Adams", teams: ["CHC BHL 1"] },
    { memberId: "b", name: "Adam Brown", teams: ["CHC JHL U14A"] },
    { memberId: "c", name: "Carla Madam", teams: ["CHC Masters"] },
  ];
  it("suggests name prefix matches first, then contains, then team", () => {
    expect(matchPeople(opts, "adam").map((o) => o.memberId)).toEqual(["b", "a", "c"]);
    expect(matchPeople(opts, "zoe").map((o) => o.memberId)).toEqual(["a"]); // accent-insensitive
    expect(matchPeople(opts, "u14").map((o) => o.memberId)).toEqual(["b"]);
    expect(matchPeople(opts, "adams bhl").map((o) => o.memberId)).toEqual(["a"]);
    expect(matchPeople(opts, "  ")).toEqual([]);
  });
  it("filters the list by name or team words", () => {
    const people = opts.map((o) => ({ ...o, teams: o.teams.map((name) => ({ name })) }));
    expect(filterPeople(people, "masters").map((p) => p.memberId)).toEqual(["c"]);
    expect(filterPeople(people, "").length).toBe(3);
  });
  it("renders the search box and keeps the query in page links", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ memberId: `m${i}`, name: `Sam ${i}`, firstName: "Sam", lastName: String(i), photoUrl: null, roles: ["Player"], teams: [] }));
    const html = renderToStaticMarkup(<ClubPeopleList clubId="c" kind="player" people={many} query="sam" />);
    expect(html).toContain('role="combobox"');
    expect(html).toContain("30 matches for");
    expect(html).toContain('href="/clubs/c/players?q=sam&amp;page=2"');
  });
});
