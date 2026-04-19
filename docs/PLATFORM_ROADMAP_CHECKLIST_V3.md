# Platform roadmap V3 — competition ops, venues, and value beyond core tenancy

This document **supersedes `PLATFORM_ROADMAP_CHECKLIST_V2.md` for forward planning** (what to build next and how to describe the product honestly). **Shipped inventory** remains authoritative in **`PLATFORM_ROADMAP_CHECKLIST.md`** (Epics A–K) and the **benchmark / tenancy** narrative in **V2** (many items there are now `[x]`).

**How to use:** Track V3 as `[ ]` → `[x]`. Epics are numbered **N** (next product), **V** (venues & surfaces), **O** (operations / commercial), **Q** (quality & scale), plus pointers to existing **B8**, **D4** follow-ups, and **L6** residual.

---

## 0. Snapshot: what the codebase already does well

| Area | Reality (as implemented) |
|------|---------------------------|
| **League engine (backend)** | `Competition` / `SeasonCompetition`, divisions, lifecycle, round-robin generation (`POST .../fixtures/generate`), fixtures with venue/time/publish, results, ladders, roll-ups, match events, tenant gates on public reads — see V1 Epics **C**, **E**, **L5/L6**. |
| **Tournaments (admin)** | Substantial **`/admin/tournaments`** UI: create/edit rep tournaments, entry rules, multi-division draws, fixture lists, results path — V1 **D**. |
| **Umpiring** | Official register, COI/availability checks, assignment notify, honoraria ledger, **`/admin/associations/[id]/officiating-report`** with **stacked “allocation mix” bar** (assigned / accepted / declined / unspecified) + club/region tables — V1 **F**. |
| **Public / fan** | This round, match centre, standings, fan prefs, push, pathways, tenant news/gallery/branding — V2 **B1–B7**, **P***, **L2–L4**. |

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

| V2 statement | Current state |
|--------------|----------------|
| News / all portals same | **Closed:** `scopeType` + `scopeId`, `lib/portal/newsScope.ts`, admin + public consumers (see V2 **L2** marked shipped). |
| Home gallery one for all | **Closed:** tenant disk segments + admin scope (V2 **L3**). |
| Competition UI for level policy | **Partially closed:** API enforces owning association + **stored `level > 1`** for new season leagues; **admin wizard copy / defaults** still **N2**. |

---

## Epic N — Next product: league operations UX

- [x] **N1** **League competition wizard (admin)** — **Shipped (baseline):** `/admin/associations/[associationId]/competitions` + `LeagueCompetitionWizard` — create or pick `Competition`, season year, optional display name + logo URL, divisions, extended ladder rules (incl. shootout/ET points, forfeit goal defaults for standings), `POST .../competitions` + `PATCH .../season-competitions`, round-robin `POST .../fixtures/generate` with replace warning + `isLeagueFixtureBulkReplaceEnabled()`, fixture grid (venue, datetime-local, status incl. postponed, published), publish / in-progress transitions. **API:** `GET .../associations/[id]/league-builder-teams` for team pickers. **Association-only** (route under association admin; club roles cannot hit competition POST). *Follow-up:* bulk venue apply, richer validation, super-admin-only multi-association picker polish. **TODO (deferred):** use persisted `blockoutPeriods`, `specialMatchPeriods`, and `finalsSeries` in automated scheduling / finals bracket generation and optional public “finals & specials” surfacing — intentionally not wired yet; revisit when prioritising scheduler or fan-facing finals UX.
- [x] **N2** **Policy-aligned defaults** — **Shipped:** wizard loads `associations.level`; national/state (`level <= 1`) shows `LeagueHierarchyPolicyCallout` (canonical hierarchy + season-league ownership, cite `docs/domain/CANONICAL_GRAPH.md`), links to `/admin/tournaments` and associations list; read-only **owningAssociationId** strip; POST bodies still use route `associationId`. **Session:** unauthenticated → `/login?next=…`; association-scoped users are redirected to `/admin/associations/{session.associationId}/competitions` if the URL association does not match (super-admin exempt). **Guard:** **Save & continue** disabled and client toast when creating a new `SeasonCompetition` at `level <= 1` (aligned with `POST /api/admin/competitions` season validation).
- [x] **N3** **Fixture operations console** — **Shipped:** `/admin/associations/[associationId]/fixtures-console` + `FixtureOperationsConsole` — season picker (optional `?seasonCompetitionId=` deep link), filters (round, club home/away, venue substring, scheduled date range), selectable rows, sequential bulk **Publish / Unpublish** via existing fixture `PATCH`, **CSV export** of filtered rows (UTF-8 BOM), per-row **Save scores** / **Approve result** (`PATCH .../result`), links to **Match events** with `?seasonCompetitionId=&fixtureId=`, **League setup** wizard, and **Bulk import → league fixture results**. Association hub + league wizard cross-links.
- [x] **N4** **Division ↔ team entry UX** — **Shipped:** `/admin/associations/[associationId]/division-teams` + `DivisionTeamOverviewClient`; **GET** `/api/admin/associations/[id]/division-team-overview` (registrar / competition / fixtures read); **PATCH** `/api/admin/associations/[id]/teams/[teamId]/league-context` (canonical link + optional **Sync label** from `competitions.name`). **Club team API:** `competitionDivisionId` on **CreateTeamRequestSchema** / **UpdateTeamRequestSchema** with validation against `season_competitions.divisions`; clearing `seasonCompetitionId` clears division; stale division cleared when season changes (`lib/competitions/teamLeagueContext.ts`). Explains **legacy `competition` string** vs **`seasonCompetitionId` + `competitionDivisionId`**; orphan-team linker; links to **League setup** + club admin.

---

## Epic V — Venues, pitches, and (optional) hire

- [x] **V1** **Venue & pitch master data** — **Shipped:** Mongo collection **`association_venues`** (`venueId`, `associationId`, `name`, optional `shortCode`, `status`, structured **`address`**, optional **`geo`**, **`pitches[]`** with `pitchId` + `label` + `surface` enum, `notes`); **GET/POST** `/api/admin/associations/[id]/venues`, **GET/PATCH/DELETE** `/api/admin/associations/[id]/venues/[venueId]` (`competitions.manage` **or** `competitions.fixtures` + association scope); **DELETE** blocked if **`league_fixtures`** reference `venueId`; audit category **`venue`**. **UI:** `/admin/associations/[id]/venues` + `AssociationVenuesClient`; association hub + league wizard **Venues** step link. **Indexes:** `scripts/setup-indexes.ts` (`venueId` unique, `associationId+name`, `associationId+status`).
- [x] **V2** **Fixture links to pitch** — **Shipped:** `league_fixtures.pitchId` (nullable) + **Schedule** step in `LeagueCompetitionWizard` + **Fixture operations console** pitch picker; `PATCH .../fixtures/[fixtureId]` resolves pitch to **`association_venues`** (active), syncs `venueId` / `venueName` / `addressLine`, rejects `venueId` mismatch vs pitch; **`assertPublishedPitchSchedule`** blocks overlapping **published** non-cancelled fixtures on the same pitch (trailing buffer via `VENUE_PITCH_SCHEDULE_BUFFER_MINUTES`, default 15; default slot length when end missing via `VENUE_PITCH_DEFAULT_SLOT_HOURS`). `POST .../fixtures/generate` stubs include `pitchId: null`. **Indexes:** `scripts/setup-indexes.ts` compound `owningAssociationId + pitchId + published + scheduledStart`. CSV export includes `pitchId`.
- [x] **V3** **Venue calendar (read)** — **Shipped:** Public **`GET /api/public/associations/[id]/pitch-week-calendar?weekStart=YYYY-MM-DD&venueId=`** (UTC week anchor; optional venue filter) merges **published league fixtures** with **`pitch_calendar_entries`**; tenant gate matches **`seasonCompetitionVisibleForPortalTenant`**. **Display:** **match** = home vs away + comp label; **training** = club name or association name only; **private** = label only (no hire/commercial text). **`/associations/[id]/venue-calendar`** + hub link. **Admin:** **`/admin/associations/[id]/venue-calendar`** + **`GET/POST .../pitch-calendar-entries`** + **`PATCH/DELETE .../[entryId]`** (same perms as venues). **Indexes:** `scripts/setup-indexes.ts` on **`pitch_calendar_entries`**. Tests: **`__tests__/lib/public/pitchWeekCalendar.test.ts`**.
- [ ] **V4** **Field hire / commercial (optional)** — Blocks for “hire period”, cost, invoicing hook, council permit doc upload — **only** if product commits; otherwise stay with **V1–V3** as operational scheduling.

---

## Epic O — Operations & value-add (cross-cutting)

- [ ] **O1** **Live / near-live scores** — Public match centre “live” state (websocket or short polling) for key comps; falls under federation benchmark aspirations (V2 **B8** adjacency).
- [ ] **O2** **Communications hub** — Extend beyond fixture change: curated digests per tenant (email templates + push topics).
- [ ] **O3** **Volunteer roster** — Link pathways to duty roster (canteen, goal judge) separate from umpire register — light CRM.
- [ ] **O4** **Sponsors analytics** — Partner strip click tracking (privacy-safe) for renewal conversations.
- [ ] **O5** **Programme PDF / ICS per team** — Bulk iCal already started (Epic **J2** in V1); add “download season for my team” from hub.

---

## Epic Q — Quality, scale, and trust

- [ ] **Q1** **Playwright tenant smoke (L6 residual)** — Subdomain news, gallery, fixtures denial for wrong tenant, login redirect — automate V2 **L6** manual sweep.
- [ ] **Q2** **Performance budgets** — Standings bundle, large fixture lists, image CDN headers for gallery/news.
- [ ] **Q3** **Admin observability** — Extend structured logs to competition mutations and fixture generate (correlate `seasonCompetitionId`, user).

---

## Carry-forward (no new epic id required)

| Source | Item |
|--------|------|
| V2 **B8** | Official app parity / deep links — still long-term. |
| V1 **D4** follow-up | Knockout from draw skeleton, declared champion field, rep `resultApprovalRequired` — keep in tournament backlog; **N1** should not duplicate draw engine work. |
| V2 **P1/P2** follow-ups | Richer pathways CMS, club “fixtures for visitors” — incremental. |
| V2 **B2** follow-up | oEmbed + playlists per tenant. |

---

## Suggested priority order (V3)

1. **N1 + N2** — Makes league operations **discoverable** and aligns with hierarchy policy (biggest gap vs tournament UX).
2. **N3** — Unlocks day-to-day comp managers without Postman.
3. **V1 + V2** — Stops “venue” being only free text; enables real **pitch conflict** detection later.
4. **Q1** — Protects multi-tenant releases.
5. **O1 / O5 / B8** — Fan and partner value when core ops UX is stable.

---

## Traceability

| Prior doc | V3 relationship |
|-----------|-----------------|
| **V1** A–K | Still the **feature shipped** checklist; V3 does not re-mark those boxes. |
| **V2** L/P/B/T/M | Tenancy + benchmark work largely complete; V3 **§1.4** corrects stale gap text. |
| **`docs/domain/CANONICAL_GRAPH.md`** | **N2** wizard must reference stored `level` vs stakeholder labels. |

---

*Last updated: 2026-04-18 — V3 created from codebase review (admin routes, competition/tournament APIs, officiating report UI, fixture/venue schema).*
