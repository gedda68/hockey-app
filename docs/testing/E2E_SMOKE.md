# E2E smoke (Epic K4)

## Automated (Playwright)

1. Start the app: `pnpm dev`
2. One-time browsers: `pnpm exec playwright install`
3. Optional: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm test:e2e`

`e2e/epic-k-admin-smoke.spec.ts` checks that `/admin/login` renders the branded sign-in form.

## Contract tests (Vitest, no server)

`pnpm test` includes `__tests__/integration/epicK4-league-smoke.test.ts` — round-robin pairing plus standings accumulation after an approved result (same ladder rules as production code paths).

## Optional full manual chain

With a super-admin or association-admin account and seeded data:

1. Sign in at `/admin/login`
2. Create or open a season competition under competitions admin
3. Generate fixtures (`POST .../fixtures/generate` or UI)
4. Enter a result on a fixture (`PATCH .../fixtures/[fixtureId]/result`)
5. Confirm standings / ladder reflect the result (admin preview or public `GET /api/standings?seasonCompetitionId=`)
