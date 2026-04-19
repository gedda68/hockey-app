import { test, expect } from "@playwright/test";
import {
  createHostApiContext,
  getTenantId,
  getFirstSeasonCompetitionId,
  getFirstFixtureId,
} from "./helpers/tenantApiContext";

/**
 * Epic L6 / Q1 — public tenant leakage + season visibility smoke (API).
 *
 * Requires a running dev server (`pnpm dev` / `npm run dev`) and tiered demo tenants
 * (e.g. `bha.localhost`, `ha.localhost` resolving to 127.0.0.1).
 * Run: `pnpm test:e2e` (or `npm run test:e2e`)
 */

test("tenant host constrains /api/public/associations/[associationId]", async () => {
  let bha;
  let ha;
  try {
    bha = await createHostApiContext("bha.localhost:3000");
    ha = await createHostApiContext("ha.localhost:3000");
    await bha.get("/api/public/tenant");
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
    return;
  }

  try {
    const bhaId = await getTenantId(bha);
    const haId = await getTenantId(ha);

    test.skip(!bhaId || !haId, "tenant ids not resolvable in current DB");

    const ok = await bha.get(`/api/public/associations/${bhaId}`);
    expect(ok.status()).toBe(200);

    const wrong = await bha.get(`/api/public/associations/${haId}`);
    expect(wrong.status()).toBe(404);
  } finally {
    await bha?.dispose();
    await ha?.dispose();
  }
});

test("tenant host defaults / constrains /api/public/leagues owningAssociationId", async () => {
  let bha;
  try {
    bha = await createHostApiContext("bha.localhost:3000");
    await bha.get("/api/public/tenant");
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
    return;
  }

  try {
    const bhaId = await getTenantId(bha);
    test.skip(!bhaId, "tenant id not resolvable in current DB");

    const res = await bha.get("/api/public/leagues");
    expect(res.ok()).toBeTruthy();
    const j = await res.json();
    const leagues: { owningAssociationId?: string }[] = Array.isArray(j?.leagues)
      ? j.leagues
      : [];
    for (const l of leagues) {
      expect(String(l.owningAssociationId ?? "")).toBe(bhaId);
    }

    const mismatch = await bha.get(
      "/api/public/leagues?owningAssociationId=some-other-association",
    );
    expect(mismatch.ok()).toBeTruthy();
    const mj = await mismatch.json();
    expect(Array.isArray(mj?.leagues) ? mj.leagues.length : 0).toBe(0);
  } finally {
    await bha?.dispose();
  }
});

test("tenant host constrains GET /api/tournaments", async () => {
  let bha;
  let ha;
  try {
    bha = await createHostApiContext("bha.localhost:3000");
    ha = await createHostApiContext("ha.localhost:3000");
    await bha.get("/api/public/tenant");
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
    return;
  }

  try {
    const bhaId = await getTenantId(bha);
    const haId = await getTenantId(ha);
    test.skip(!bhaId || !haId, "tenant ids not resolvable in current DB");

    for (const [ctx, id] of [
      [bha, bhaId],
      [ha, haId],
    ] as const) {
      const res = await ctx.get("/api/tournaments");
      expect(res.ok()).toBeTruthy();
      const j = await res.json();
      const list: { brandingAssociationId?: string; hostId?: string }[] =
        Array.isArray(j?.tournaments) ? j.tournaments : [];
      for (const t of list) {
        const branding = String(t.brandingAssociationId ?? "");
        const host = String(t.hostId ?? "");
        expect(branding === id || host === id).toBeTruthy();
      }
    }
  } finally {
    await bha?.dispose();
    await ha?.dispose();
  }
});

test("wrong tenant host cannot read fixtures / standings / calendar for another tenant season", async () => {
  let bha;
  let ha;
  try {
    bha = await createHostApiContext("bha.localhost:3000");
    ha = await createHostApiContext("ha.localhost:3000");
    await bha.get("/api/public/tenant");
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
    return;
  }

  try {
    const bhaId = await getTenantId(bha);
    const haId = await getTenantId(ha);
    test.skip(!bhaId || !haId, "tenant ids not resolvable in current DB");

    const seasonCompetitionId = await getFirstSeasonCompetitionId(bha);
    test.skip(seasonCompetitionId == null, "no leagues returned for BHA tenant");

    const q = `seasonCompetitionId=${encodeURIComponent(seasonCompetitionId!)}`;

    for (const path of [
      `/api/fixtures?${q}`,
      `/api/standings?${q}`,
      `/api/calendar/league?${q}`,
    ]) {
      const ok = await bha.get(path);
      expect(
        ok.status(),
        `${path} should succeed on owning tenant host`,
      ).toBeLessThan(500);

      const denied = await ha.get(path);
      expect(denied.status(), `${path} should not leak on other tenant host`).toBe(
        404,
      );
    }
  } finally {
    await bha?.dispose();
    await ha?.dispose();
  }
});

test("wrong tenant host cannot read public match centre for another tenant fixture", async () => {
  let bha;
  let ha;
  try {
    bha = await createHostApiContext("bha.localhost:3000");
    ha = await createHostApiContext("ha.localhost:3000");
    await bha.get("/api/public/tenant");
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
    return;
  }

  try {
    const bhaId = await getTenantId(bha);
    const haId = await getTenantId(ha);
    test.skip(!bhaId || !haId, "tenant ids not resolvable in current DB");

    const scId = await getFirstSeasonCompetitionId(bha);
    test.skip(scId == null, "no leagues returned for BHA tenant");

    const fixtureId = await getFirstFixtureId(bha, scId!);
    test.skip(fixtureId == null, "no fixtures returned for BHA season");

    const ok = await bha.get(
      `/api/public/match-centre/${encodeURIComponent(fixtureId!)}`,
    );
    expect(ok.status()).toBeLessThan(500);

    const denied = await ha.get(
      `/api/public/match-centre/${encodeURIComponent(fixtureId!)}`,
    );
    expect(denied.status()).toBe(404);
  } finally {
    await bha?.dispose();
    await ha?.dispose();
  }
});

test("/api/news on tenant host returns JSON array (smoke)", async () => {
  let bha;
  try {
    bha = await createHostApiContext("bha.localhost:3000");
    await bha.get("/api/public/tenant");
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
    return;
  }

  try {
    const bhaId = await getTenantId(bha);
    test.skip(!bhaId, "tenant id not resolvable in current DB");

    const res = await bha.get("/api/news");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data)).toBeTruthy();
  } finally {
    await bha?.dispose();
  }
});
