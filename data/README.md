# /data — Static Seed / Bootstrap Data

This directory contains **seed data** used for local development and
initial database migrations. It is **not** served to the browser and
is **not** imported directly by application code.

## Authoritative sources

| Data | Authoritative file | How it's used |
|------|--------------------|---------------|
| Clubs | `data/clubs/clubs.json` | Imported by `lib/data/clubs.ts` → served via SSR |
| Matches | `data/matches/matches.json` | Imported by `lib/data/matches.ts` → served via SSR |
| Standings | `data/standings/standings.json` | Imported by `lib/data/standings.ts` → served via SSR |
| Statistics | `data/statistics/match-stats.json` | Imported by `lib/data/stats.ts` |
| Umpires | `data/umpires/umpire-list.json` | Imported by `lib/data/umpires.ts` |
| Events | `public/data/events.json` | Fetched client-side at `/data/events.json` |
| Rosters | MongoDB (`rosters` collection) | Seeded once via `scripts/migrate-rosters.ts` |

## Rules

1. **Never duplicate** — each JSON file lives in exactly one place.
2. **`public/data/`** is for files that must be served statically to the browser.
   Currently: `events.json`, `rosters.json` (legacy static fallback only).
3. **`lib/data/*.ts`** are TypeScript wrappers that import from `data/`
   and expose typed accessor functions to the Next.js app.
4. **Rosters** are managed in MongoDB after the initial migration. Do not
   edit `public/data/rosters.json` directly — re-run the migration script.

## MongoDB public demo (Epic I)

Tiered seed writes **HA → HQ → BHA / GHA / RHA** (BHA, GHA, RHA are siblings under HQ; Brisbane clubs should use `parentAssociationId: brisbane-hockey`). Run `npm run seed:tiered-demo` first, then `npm run seed:public-demo` (with `MONGODB_URI` in `.env.local`) to load **sample league and tournament data** for **2025** and **2026** under **Brisbane Hockey Association** (`brisbane-hockey` by default). The tiered seed does not create clubs; it links BHA club-role users to an existing club under BHA (auto-pick or `SEED_TIERED_BHA_CLUB_ID`). The public demo uses clubs already under that association and does not create placeholder clubs. Optional env `DEMO_SEED_ASSOCIATION_ID` to target another association. See `scripts/seed-public-demo.ts` for collection keys and IDs.
