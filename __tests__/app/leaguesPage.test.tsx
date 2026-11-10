import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { PublicLeagueRow } from "@/lib/public/publicLeagues";

vi.mock("@/lib/public/publicLeagues", () => ({ listPublicLeagues: vi.fn() }));

import { listPublicLeagues } from "@/lib/public/publicLeagues";
import PublicLeaguesPage from "@/app/(website)/competitions/leagues/page";

const league = (over: Partial<PublicLeagueRow>): PublicLeagueRow => ({
  seasonCompetitionId: "sc-x",
  season: "2026",
  competitionId: "comp-x",
  competitionName: "Premier League",
  owningAssociationId: "assoc-1",
  status: "in_progress",
  sport: "hockey",
  country: "Australia",
  state: "QLD",
  region: null,
  ...over,
});

const ROWS: PublicLeagueRow[] = [
  league({ seasonCompetitionId: "sc-qld-26", competitionName: "QLD Premier", season: "2026", state: "QLD" }),
  league({ seasonCompetitionId: "sc-qld-25", competitionName: "QLD Premier", season: "2025", state: "QLD" }),
  league({ seasonCompetitionId: "sc-nsw-26", competitionName: "NSW Premier", season: "2026", state: "NSW" }),
];

async function render(
  searchParams: Record<string, string | string[] | undefined> = {},
): Promise<string> {
  const el = await PublicLeaguesPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(el);
}

describe("/competitions/leagues", () => {
  beforeEach(() => {
    vi.mocked(listPublicLeagues).mockResolvedValue(ROWS);
  });

  it("lists every league when no filter is set", async () => {
    const html = await render();
    expect(html).toContain("QLD Premier");
    expect(html).toContain("NSW Premier");
    expect(html).toContain("Showing 3 of 3 leagues");
    expect(html).not.toContain("Clear filters");
  });

  it("filters by state and says so", async () => {
    const html = await render({ state: "QLD" });
    expect(html).toContain("sc-qld-26");
    expect(html).toContain("sc-qld-25");
    expect(html).not.toContain("sc-nsw-26");
    expect(html).toContain("Showing 2 of 3 leagues");
    expect(html).toContain("Clear filters");
  });

  it("combines filters (season AND state)", async () => {
    const html = await render({ season: "2026", state: "NSW" });
    expect(html).toContain("sc-nsw-26");
    expect(html).not.toContain("sc-qld-26");
    expect(html).toContain("Showing 1 of 3 leagues");
  });

  it("shows a filter group only when it has two or more choices", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Season"');
    expect(html).toContain('aria-label="State"');
    // every league is hockey in Australia, so those groups would be noise
    expect(html).not.toContain('aria-label="Sport"');
    expect(html).not.toContain('aria-label="Country"');
  });

  it("shows the sport and country groups once the data has more than one value", async () => {
    vi.mocked(listPublicLeagues).mockResolvedValue([
      ...ROWS,
      league({ seasonCompetitionId: "sc-nz", state: "Auckland", country: "New Zealand", sport: "indoor hockey" }),
    ]);
    const html = await render();
    expect(html).toContain('aria-label="Sport"');
    expect(html).toContain('aria-label="Country"');
  });

  it("marks the active chip and links chips to canonical filter URLs", async () => {
    const html = await render({ state: "QLD" });
    expect(html).toContain('href="/competitions/leagues?state=QLD"');
    expect(html).toMatch(/<a[^>]*aria-current="true"[^>]*>[^<]*QLD/);
    // "All" for state clears just that facet
    expect(html).toContain('href="/competitions/leagues"');
  });

  it("explains an empty filtered result without telling visitors to run the seed script", async () => {
    const html = await render({ state: "TAS" });
    expect(html).toContain("No leagues match these filters");
    expect(html).not.toContain("seed:public-demo");
  });

  it("only suggests the seed script when there are no leagues at all", async () => {
    vi.mocked(listPublicLeagues).mockResolvedValue([]);
    const html = await render();
    expect(html).toContain("seed:public-demo");
    expect(html).not.toContain("No leagues match these filters");
  });

  it("keeps a stale selected value clearable instead of hiding the whole group", async () => {
    const html = await render({ state: "TAS" });
    expect(html).toContain('aria-label="State"');
    expect(html).toContain("Clear filters");
  });
});
