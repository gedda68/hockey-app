// @vitest-environment node
import { describe, expect, it } from "vitest";
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
