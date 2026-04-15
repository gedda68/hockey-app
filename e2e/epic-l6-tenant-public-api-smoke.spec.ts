import { test, expect } from "@playwright/test";

/**
 * Epic L6 — public tenant leakage smoke.
 *
 * Requires a running dev server (`pnpm dev` / `npm run dev`).
 * Run: `pnpm test:e2e` (or `npm run test:e2e`)
 */

async function ctxForHost(request: any, hostHeader: string) {
  return request.newContext({
    baseURL: "http://localhost:3000",
    extraHTTPHeaders: {
      host: hostHeader,
      "x-forwarded-host": hostHeader,
    },
  });
}

async function getTenantId(ctx: any) {
  const res = await ctx.get("/api/public/tenant");
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  return j?.tenant?.id as string | undefined;
}

test("tenant host constrains /api/public/associations/[associationId]", async ({
  request,
}) => {
  let bha: any;
  let ha: any;
  try {
    bha = await ctxForHost(request, "bha.localhost:3000");
    ha = await ctxForHost(request, "ha.localhost:3000");
    // Sanity ping
    await bha.get("/api/public/tenant");
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
  }

  const bhaId = await getTenantId(bha);
  const haId = await getTenantId(ha);

  test.skip(!bhaId || !haId, "tenant ids not resolvable in current DB");

  const ok = await bha.get(`/api/public/associations/${bhaId}`);
  expect(ok.status()).toBe(200);

  const wrong = await bha.get(`/api/public/associations/${haId}`);
  expect(wrong.status()).toBe(404);
});

test("tenant host defaults / constrains /api/public/leagues owningAssociationId", async ({
  request,
}) => {
  let bha: any;
  try {
    bha = await ctxForHost(request, "bha.localhost:3000");
    await bha.get("/api/public/tenant");
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
  }

  const bhaId = await getTenantId(bha);
  test.skip(!bhaId, "tenant id not resolvable in current DB");

  // Default should act like owningAssociationId={tenant.id}
  const res = await bha.get("/api/public/leagues");
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  const leagues: any[] = Array.isArray(j?.leagues) ? j.leagues : [];
  for (const l of leagues) {
    expect(String(l.owningAssociationId ?? "")).toBe(bhaId);
  }

  // Explicit mismatch should not leak
  const mismatch = await bha.get(
    "/api/public/leagues?owningAssociationId=some-other-association",
  );
  expect(mismatch.ok()).toBeTruthy();
  const mj = await mismatch.json();
  expect(Array.isArray(mj?.leagues) ? mj.leagues.length : 0).toBe(0);
});

