import { request as playwrightRequest } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/** API requests as if the browser Host were `hostHeader` (e.g. `bha.localhost:3000`). */
export async function createHostApiContext(
  hostHeader: string,
): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL,
    extraHTTPHeaders: {
      host: hostHeader,
      "x-forwarded-host": hostHeader,
    },
  });
}

export async function getTenantId(
  ctx: APIRequestContext,
): Promise<string | undefined> {
  const res = await ctx.get("/api/public/tenant");
  if (!res.ok()) return undefined;
  const j = (await res.json()) as { tenant?: { id?: string } | null };
  return j?.tenant?.id;
}

export async function getFirstSeasonCompetitionId(
  ctx: APIRequestContext,
): Promise<string | null> {
  const res = await ctx.get("/api/public/leagues");
  if (!res.ok()) return null;
  const j = (await res.json()) as { leagues?: { seasonCompetitionId?: string }[] };
  const leagues = Array.isArray(j?.leagues) ? j.leagues : [];
  const id = leagues[0]?.seasonCompetitionId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export async function getFirstFixtureId(
  ctx: APIRequestContext,
  seasonCompetitionId: string,
): Promise<string | null> {
  const res = await ctx.get(
    `/api/fixtures?seasonCompetitionId=${encodeURIComponent(seasonCompetitionId)}`,
  );
  if (!res.ok()) return null;
  const j = (await res.json()) as { fixtures?: { fixtureId?: string }[] };
  const fixtures = Array.isArray(j?.fixtures) ? j.fixtures : [];
  const id = fixtures[0]?.fixtureId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}
