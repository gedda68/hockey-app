# Platform roadmap V3 — competition ops, venues, and value beyond core tenancy

This document **supersedes `PLATFORM_ROADMAP_CHECKLIST_V2.md` for forward planning** (what to build next and how to describe the product honestly). **Shipped inventory** remains authoritative in **`PLATFORM_ROADMAP_CHECKLIST.md`** (Epics A–K) and the **benchmark / tenancy** narrative in **V2** (many items there are now `[x]`).

**How to use:** Track V3 as `[ ]` → `[x]`. Epics are numbered **N** (next product), **V** (venues & surfaces), **O** (operations / commercial), **Q** (quality & scale), plus pointers to existing **B8**, **D4** follow-ups, and **L6** residual.

---

## 0. Snapshot: what the codebase already does well

| Area                        | Reality (as implemented)                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **League engine (backend)** | `Competition` / `SeasonCompetition`, divisions, lifecycle, round-robin generation (`POST .../fixtures/generate`), fixtures with venue/time/publish, results, ladders, roll-ups, match events, tenant gates on public reads — see V1 Epics **C**, **E**, **L5/L6**. |
| **Tournaments (admin)**     | Substantial **`/admin/tournaments`** UI: create/edit rep tournaments, entry rules, multi-division draws, fixture lists, results path — V1 **D**.                                                                                                                   |
| **Umpiring**                | Official register, COI/availability checks, assignment notify, honoraria ledger, **`/admin/associations/[id]/officiating-report`** with **stacked “allocation mix” bar** (assigned / accepted / declined / unspecified) + club/region tables — V1 **F**.           |
| **Public / fan**            | This round, match centre, standings, fan prefs, push, pathways, tenant news/gallery/branding — V2 **B1–B7**, **P\***, **L2–L4**.                                                                                                                                   |

---

## 1. Honest gaps (product + UX)

### 1.1 League “competition builder” UI

- **APIs exist** (`POST /api/admin/competitions` for `kind: "competition"` | `"seasonCompetition"`, `PATCH .../season-competitions/[id]`, fixture list/generate/result routes).
- **There is no dedicated admin route** (e.g. `/admin/competitions` or an association “Season setup” wizard) that walks a competition manager through: create base competition → create season competition → divisions → generate fixtures → review grid → publish. Association admin today is **feature-scattered** (match events, umpire payments, officiating report, etc.) and **creation is likely API/script-driven**.
- **V3 recommendation:** treat **guided league setup** as a first-class UX epic (**N1**), not only documentation.

### 1.2 Tournaments vs leagues (parity)

- **Tournaments** have a rich builder surface in admin; **leagues** are stronger on engine + APIs than on **guided UI**.
- **V3 recommendation:** reuse patterns from `/admin/tournaments` (steps, validation copy, preview) for **N1**.

### 1.3 Field hire / pitch allocation / “field blocks”

- **League fixtures** carry `venueId`, `venueName`, `addressLine` (free text / nullable IDs) — **no** first-class **venue registry**, **pitch inventory**, **hire contracts**, **council slot booking**, or **conflict engine** (double-book pitch across comps).
- **Umpire** allocation has schema + workflows + **report visuals**; **field** allocation does not.
- **V3 recommendation:** new **Epic V** — start with **venue directory + pitch list per venue** (master data), then **fixture ↔ pitch** linking, then optional **hire / cost** module if product wants commercial ops.

### 1.4 V2 “gap list” status (correction)

The following bullets in **V2 §1.3** are **out of date** relative to the current repo; V3 carries the correction:

| V2 statement                    | Current state                                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| News / all portals same         | **Closed:** `scopeType` + `scopeId`, `lib/portal/newsScope.ts`, admin + public consumers (see V2 **L2** marked shipped).                              |
| Home gallery one for all        | **Closed:** tenant disk segments + admin scope (V2 **L3**).                                                                                           |
| Competition UI for level policy | **Partially closed:** API enforces owning association + **stored `level > 1`** for new season leagues; **admin wizard copy / defaults** still **N2**. |

---

## Epic N — Next product: league operations UX

- [x] **N1** **League competition wizard (admin)** — **Shipped (baseline):** `/admin/associations/[associationId]/competitions` + `LeagueCompetitionWizard` — create or pick `Competition`, season year, optional display name + logo URL, divisions, extended ladder rules (incl. shootout/ET points, forfeit goal defaults for standings), `POST .../competitions` + `PATCH .../season-competitions`, round-robin `POST .../fixtures/generate` with replace warning + `isLeagueFixtureBulkReplaceEnabled()`, fixture grid (venue, datetime-local, status incl. postponed, published), publish / in-progress transitions. **API:** `GET .../associations/[id]/league-builder-teams` for team pickers. **Association-only** (route under association admin; club roles cannot hit competition POST). _Follow-up:_ bulk venue apply, richer validation, super-admin-only multi-association picker polish. **TODO (deferred):** use persisted `blockoutPeriods`, `specialMatchPeriods`, and `finalsSeries` in automated scheduling / finals bracket generation and optional public “finals & specials” surfacing — intentionally not wired yet; revisit when prioritising scheduler or fan-facing finals UX.
- [x] **N2** **Policy-aligned defaults** — **Shipped:** wizard loads `associations.level`; national/state (`level <= 1`) shows `LeagueHierarchyPolicyCallout` (canonical hierarchy + season-league ownership, cite `docs/domain/CANONICAL_GRAPH.md`), links to `/admin/tournaments` and associations list; read-only **owningAssociationId** strip; POST bodies still use route `associationId`. **Session:** unauthenticated → `/login?next=…`; association-scoped users are redirected to `/admin/associations/{session.associationId}/competitions` if the URL association does not match (super-admin exempt). **Guard:** **Save & continue** disabled and client toast when creating a new `SeasonCompetition` at `level <= 1` (aligned with `POST /api/admin/competitions` season validation).
- [x] **N3** **Fixture operations console** — **Shipped:** `/admin/associations/[associationId]/fixtures-console` + `FixtureOperationsConsole` — season picker (optional `?seasonCompetitionId=` deep link), filters (round, club home/away, venue substring, scheduled date range), selectable rows, sequential bulk **Publish / Unpublish** via existing fixture `PATCH`, **CSV export** of filtered rows (UTF-8 BOM), per-row **Save scores** / **Approve result** (`PATCH .../result`), links to **Match events** with `?seasonCompetitionId=&fixtureId=`, **League setup** wizard, and **Bulk import → league fixture results**. Association hub + league wizard cross-links.
- [x] **N4** **Division ↔ team entry UX** — **Shipped:** `/admin/associations/[associationId]/division-teams` + `DivisionTeamOverviewClient`; **GET** `/api/admin/associations/[id]/division-team-overview` (registrar / competition / fixtures read); **PATCH** `/api/admin/associations/[id]/teams/[teamId]/league-context` (canonical link + optional **Sync label** from `competitions.name`). **Club team API:** `competitionDivisionId` on **CreateTeamRequestSchema** / **UpdateTeamRequestSchema** with validation against `season_competitions.divisions`; clearing `seasonCompetitionId` clears division; stale division cleared when season changes (`lib/competitions/teamLeagueContext.ts`). Explains **legacy `competition` string** vs **`seasonCompetitionId` + `competitionDivisionId`**; orphan-team linker; links to **League setup** + club admin.

---

## Epic V — Venues, pitches, and (optional) hire

- [x] **V1** **Venue & pitch master data** — **Shipped:** Mongo collection **`association_venues`** (`venueId`, `associationId`, `name`, optional `shortCode`, `status`, structured **`address`**, optional **`geo`**, **`pitches[]`** with `pitchId` + `label` + `surface` enum, `notes`); **GET/POST** `/api/admin/associations/[id]/venues`, **GET/PATCH/DELETE** `/api/admin/associations/[id]/venues/[venueId]` (`competitions.manage` **or** `competitions.fixtures` + association scope); **DELETE** blocked if **`league_fixtures`** reference `venueId`; audit category **`venue`**. **UI:** `/admin/associations/[id]/venues` + `AssociationVenuesClient`; association hub + league wizard **Venues** step link. **Indexes:** `scripts/setup-indexes.ts` (`venueId` unique, `associationId+name`, `associationId+status`).
- [x] **V2** **Fixture links to pitch** — **Shipped:** `league_fixtures.pitchId` (nullable) + **Schedule** step in `LeagueCompetitionWizard` + **Fixture operations console** pitch picker; `PATCH .../fixtures/[fixtureId]` resolves pitch to **`association_venues`** (active), syncs `venueId` / `venueName` / `addressLine`, rejects `venueId` mismatch vs pitch; **`assertPublishedPitchSchedule`** blocks overlapping **published** non-cancelled fixtures on the same pitch (trailing buffer via `VENUE_PITCH_SCHEDULE_BUFFER_MINUTES`, default 15; default slot length when end missing via `VENUE_PITCH_DEFAULT_SLOT_HOURS`). `POST .../fixtures/generate` stubs include `pitchId: null`. **Indexes:** `scripts/setup-indexes.ts` compound `owningAssociationId + pitchId + published + scheduledStart`. CSV export includes `pitchId`.
- [x] **V3** **Venue calendar (read)** — **Shipped:** Public **`GET .../pitch-week-calendar`** — **`weekStart=YYYY-MM-DD`** (UTC week) **or** **`month=YYYY-MM`** (UTC month summary: counts + short preview lines per day/pitch); optional **`venueId`**. Same merge of **published league fixtures** + **`pitch_calendar_entries`**; tenant gate **`seasonCompetitionVisibleForPortalTenant`**. **Display:** **match** / **training** / **private** (no hire labels). **`/associations/[id]/venue-calendar`** (week/month toggle) + hub link. **Admin:** **`/admin/associations/[id]/venue-calendar`** + pitch-calendar-entries CRUD. **Indexes:** **`pitch_calendar_entries`**. Tests: **`__tests__/lib/public/pitchWeekCalendar.test.ts`**.
- [ ] **V4** **Field hire / commercial (optional)** — Blocks for “hire period”, cost, invoicing hook, council permit doc upload — **only** if product commits; otherwise stay with **V1–V3** as operational scheduling.

---

## Epic O — Operations & value-add (cross-cutting)

- [x] **O1** **Live / near-live scores** — Public match centre short polling (`GET /api/public/match-centre/[fixtureId]`, `PublicMatchCentreClient`) plus running scores/timeline while fixture `in_progress`; websockets optional later.
- [ ] **O2** **Communications hub** — Extend beyond fixture change: curated digests per tenant (email templates + push topics).
- [ ] **O3** **Volunteer roster** — Link pathways to duty roster (canteen, goal judge) separate from umpire register — light CRM.
- [ ] **O4** **Sponsors analytics** — Partner strip click tracking (privacy-safe) for renewal conversations.
- [ ] **O5** **Programme PDF / ICS per team** — Bulk iCal already started (Epic **J2** in V1); add “download season for my team” from hub.

---

## Epic Q — Quality, scale, and trust

- [x] **Q1** **Playwright tenant smoke (L6 residual)** — **Shipped:** `e2e/helpers/tenantApiContext.ts` + expanded **`epic-l6-tenant-public-api-smoke`** (wrong-host **fixtures / standings / calendar / match-centre** for another tenant’s `seasonCompetitionId` / fixture; **`/api/news`** array smoke) + **`epic-q1-browser-tenant-smoke`** (unauthenticated **`/admin/...` → login** or SSO; **`bha.localhost`** home + **`/news`** load). Requires **`pnpm dev`** and tiered demo hosts (**`bha.localhost`**, **`ha.localhost`**); run **`pnpm test:e2e`**.
- [ ] **Q2** **Performance budgets** — Standings bundle, large fixture lists, image CDN headers for gallery/news.
- [ ] **Q3** **Admin observability** — Extend structured logs to competition mutations and fixture generate (correlate `seasonCompetitionId`, user).

---

## Carry-forward (no new epic id required)

| Source                  | Item                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V2 **B8**               | Official app parity / deep links — still long-term.                                                                                                            |
| V1 **D4** follow-up     | Knockout from draw skeleton, declared champion field, rep `resultApprovalRequired` — keep in tournament backlog; **N1** should not duplicate draw engine work. |
| V2 **P1/P2** follow-ups | Richer pathways CMS, club “fixtures for visitors” — incremental.                                                                                               |
| V2 **B2** follow-up     | oEmbed + playlists per tenant.                                                                                                                                 |

---

## Suggested priority order (V3)

1. **N1 + N2** — Makes league operations **discoverable** and aligns with hierarchy policy (biggest gap vs tournament UX).
2. **N3** _(shipped)_ — Fixture operations console (`/admin/.../fixtures-console`): filters, bulk publish/unpublish, CSV export, scores / approve — **day-to-day comp managers without Postman** (see Epic **N**).
3. **V1 + V2** — Stops “venue” being only free text; enables real **pitch conflict** detection later.
4. **Q1** _(shipped)_ — Playwright tenant + admin redirect smoke (`pnpm test:e2e` with dev server).
5. **O1 / O5 / B8** — Fan and partner value when core ops UX is stable.

---

## Traceability

| Prior doc                            | V3 relationship                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| **V1** A–K                           | Still the **feature shipped** checklist; V3 does not re-mark those boxes.       |
| **V2** L/P/B/T/M                     | Tenancy + benchmark work largely complete; V3 **§1.4** corrects stale gap text. |
| **`docs/domain/CANONICAL_GRAPH.md`** | **N2** wizard must reference stored `level` vs stakeholder labels.              |

---

## Future Enhancements

- [ ] Live scores in-app: your current short polling is fine for MVP; WebSockets (or managed realtime) are an upgrade path when you need faster updates or less HTTP churn, and they need a clear publish path from fixture writes (or change streams), not just a socket server.
- [ ] Push notifications: plan around FCM / APNs / Web Push, not WebSockets as the primary channel; sockets only for toasts while the app is open if you want that.
- [ ] Chat / WhatsApp-class IM: expect persistent realtime (often WebSockets or a vendor abstraction) plus persistence, receipts, moderation, etc.; heavy lifting is product and backend, not only the wire protocol.
- [ ] Club and association financials (e.g. sponsorship, venue hire, registrations, merchandise/uniforms and other income sources, with costs out, uniforms, tournament payments etc...) with reporting and simple cost centres with budgeting profit and loss statements and ledgers. Including graphs, revenue and spend analysis, ability to integrate with xero and other platforms. Full transparency of what comes in and what goes out and align all in/out costs. e,g, uniform costs in and revenue for sales. This leads into auto generations of end of year financials

_Last updated: 2026-04-19 — O1 match-centre polling; Q1 Playwright tenant smoke._
