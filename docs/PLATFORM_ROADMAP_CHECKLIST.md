# Platform roadmap — trackable checklist

Multi-level association → club → team operations, independent portals, competitions, tournaments, stats, officiating, fees, and registrations.

**How to use:** Check items off as you complete them (`[ ]` → `[x]`). Group by epic; order within an epic is suggested, not mandatory.

---

## Epic A — Hierarchy & domain model

- [X] **A1** Document canonical graph: Association (tree) → Club (single parent) → Team/Roster (club + season + competition context). See `docs/domain/CANONICAL_GRAPH.md`.
- [X] **A2** Enforce no orphan teams; define migration rules for club/association changes. See `docs/domain/OWNERSHIP_MIGRATIONS.md`. Enforced: prevent hard-delete of referenced clubs; allow `mode=archive`.
- [X] **A3** Persist association `level`, `parentAssociationId`, and geography/jurisdiction fields (e.g. region/city codes).
- [X] **A4** Model `materializedPath` or equivalent for fast subtree queries (optional but recommended at scale). Implemented via `associations.hierarchy[]` path + `parentAssociationId`.
- [X] **A5** Rules for multi-club members, transfers, and which association’s fees/registrations apply. See `docs/domain/MULTI_CLUB_AND_TRANSFERS.md` (policy baseline; enforcement in APIs is incremental).
- [X] **A6** Stable team identity across seasons; promotion/relegation history. Implemented: `canonicalTeamId`, `promotionHistory[]` + `TeamPromotionRecordSchema` on `TeamSchema`; `PATCH /api/admin/teams/by-id/[teamId]/lineage` for canonical id + history append (audited).
- [X] **A7** First-class dimensions: age group, gender, division/grade on team and competition entries. Implemented: `TeamSchema` + `MemberTeamRegistrationSchema` (`ageGroupLabel`, `competitionDivisionId`, optional `gender`/`grade` on registrations); `TeamTournamentEntry` + list summaries carry `ageGroupLabel`, `grade`, `competitionDivisionId`; team-tournament create copies dimensions from the team document (falls back to tournament where needed).

---

## Epic B — Portals, auth & RBAC

- [X] **B1** Clear URL/layout split: association admin/public vs club admin/member (including branding). Implemented via App Router route groups: `app/(admin)/admin/**` (admin shell + branding provider) and `app/(website)/**` (public site). Consolidated legacy duplicate `/admin` tree under `app/(admin)/admin`.
- [X] **B2** Role matrix: registrar, treasurer, competition manager, umpire coordinator, coach coordinator, media, committee read-only — mapped to API + UI. See `docs/domain/ROLE_MATRIX.md` (Operational personas); API uses `ROLE_DEFINITIONS` / `requirePermission`; UI uses `menuConfig.ts` + `lib/auth/adminRouteAccess.ts`.
- [X] **B3** Central policy layer: every mutating API validates `(user, associationId|clubId|resource)`; no trust of IDs from body alone. Implemented: `requireResourceAccess` + `resourceAccessDb`, `sessionAssignments`, `memberRouteScope`, association/club list guards where added; **`/api/admin/*` route.ts files use `requirePermission` / `requireRole` / `requireAnalyticsAccess`** with resource checks on scoped routes (full sweep across config, clubs, associations, players, rosters, nominations, bulk-import, ballots, etc.).
- [X] **B3a** Apply RBAC to team-tournament fee distribution routes (registrar/finance roles only).
- [X] **B3b** Apply RBAC to role request approval flows (list + view + approve/reject/payment record) via `registration.manage`.
- [X] **B4** Extend middleware/route rules to all domains (not only admin shell): competitions, tournaments, results, fees. **`/api/admin/*`** requires an admin-area role via `evaluateAdminRouteAccess` (`lib/auth/adminRouteAccess.ts`); deny returns **403 JSON** for API paths (not redirect). **Public read:** `/api/events`, `/api/news` added to middleware public allowlist (with existing `/api/competitions`, `/api/tournaments`, etc.).
- [X] **B5** Delegation / sub-permissions: permission `competitions.fixtures` + role `assoc-competition` (association scope) — fixtures list/generate/PATCH, divisions **GET**, admin standings, competition/season **GET**; **excluded**: `POST /api/admin/competitions` (create), `PATCH .../season-competitions/[id]` (lifecycle/ladder), `association.fees` / honoraria / official-register mutations. `competitions.manage` implies `competitions.fixtures`. Helper `requireAnyPermission`. Docs: `docs/domain/ROLE_MATRIX.md`.
- [X] **B6** Audit log coverage for competitions, tournaments, results, ladder changes, fee rule changes (beyond member-only). Baseline: `lib/audit/platformAuditLog.ts` → Mongo `platform_audit_log` in `hockey-app`; wired to season competition PATCH, competition/season POST, fees POST, tournament PUT/DELETE, team lineage PATCH, fixture generation POST, umpire honoraria (schedule, lines, amount adjust, official register CRUD).

---

## Epic C — Seasons & competitions (city/region league layer)

- [X] **C1** `Competition` / `SeasonCompetition` entity: owning association, geographic scope (city/region), season year, sport, format. Implemented: `lib/db/schemas/competition.schema.ts` + `/api/admin/competitions`.
- [X] **C2** Explicit product rule: “primary season league” competition scope is **city/region association** (document in UI + API errors if violated). Enforced in `/api/admin/competitions` ownership checks.
- [X] **C2a** Team competition context anchor: teams support `seasonCompetitionId` (validated against `season_competitions`) while retaining legacy `competition` string for back-compat.
- [X] **C3** Single source for divisions/grades and eligibility for a competition. Implemented: `season_competitions.divisions[]` and update via `/api/admin/season-competitions/[seasonCompetitionId]`.
- [X] **C4** Lifecycle: draft → published → in progress → completed → archived; optional lock after deadline. Implemented for season competitions via `/api/admin/season-competitions/[seasonCompetitionId]` status transitions.
- [X] **C5** APIs and UI to create/edit/publish competitions scoped to the correct association level. Implemented API: `/api/admin/competitions` + `/api/admin/season-competitions/[seasonCompetitionId]`.

---

## Epic D — Tournaments (association + club hosts)

- [X] **D1** `hostType: association | club`, `hostId`, plus branding parent association for permissions. Implemented on `rep_tournaments`: `hostType`, `hostId`, `brandingAssociationId` (normalized on write via `lib/tournaments/resolveRepTournamentHost.ts`); RBAC in `lib/auth/repTournamentScope.ts` (list filtered on GET; GET/PUT/DELETE require host scope; club host allows club **or** parent branding association access; association host allows access if user can reach host **or** branding association). Admin UI: `/admin/tournaments` modal (host selectors + optional branding association). Legacy rows without host: list visible to anyone with `selection.manage` until migrated; **PUT must include `hostType` + `hostId` once** to persist host. Schemas: `lib/db/schemas/repTournament.schema.ts`.
- [X] **D2** Entry rules: who may enter, fees, withdrawal deadlines, max teams. Implemented: `rep_tournaments.entryRules` (`entryEligibility`, `allowedClubIds`, `maxTeams`, `entryOpensAt` / `entryClosesAt`, `withdrawalDeadline`, `entryFeeCents`) validated via `lib/db/schemas/repTournament.schema.ts` + `lib/tournaments/tournamentEntryRules.ts`. **POST** `/api/admin/team-tournaments` enforces window, eligibility vs host/branding/explicit list, max non-withdrawn teams; seeds default **entry** `TeamFeeItem` when `entryFeeCents` set. **PUT** entry blocks `status: withdrawn` after `withdrawalDeadline` (calendar day). Admin UI: tournament modal section “Team entry rules”. Tests: `__tests__/lib/tournaments/tournamentEntryRules.test.ts`.
- [X] **D3** Draw formats: pools, knockout, cross-pool finals; manual seeding + optional import from standings. Extended: **multi-division** draws (`structure`, `divisions[]`, per-division pool counts including single-pool divisions), rep-style **rank order** (seed then team-name alpha), playoff **skeleton templates** (same-place crosses, 4-pool QF from top-two, 2-pool semis, pool-winner pairs), `priorYearTournamentId` placeholder; admin UI division editor + generators; tests `tournamentDraw.test.ts`.
- [X] **D4** Full lifecycle: create → entries → draw → fixtures → results → winner (align with existing team-tournament flows). Baseline: Mongo `rep_tournament_fixtures` (`RepTournamentFixtureSchema`), `lib/tournaments/repTournamentFixtureGenerate.ts` (pool round-robin from legacy or multi-division draw via `collectPoolsFromDraw` + `generateRoundRobin`), `GET/POST /api/admin/tournaments/[id]/fixtures`, `GET/PATCH .../fixtures/[fixtureId]`, `PATCH .../fixtures/[fixtureId]/result` (result correction rules, auto-complete match on approve), public `GET /api/rep-tournament-fixtures?tournamentId=` (published only); admin page `/admin/tournaments/[tournamentId]/fixtures`; links from tournament cards + edit modal. *Follow-up:* knockout fixtures from draw skeleton, declared winner/champion field, tighter public result visibility, optional `resultApprovalRequired` on rep tournaments.
- [ ] **D5** Avoid duplicate team records; link tournament entries to canonical team/club entities.

---

## Epic E — Matches, results, ladders, statistics

- [X] **E1** Fixture generation (round-robin, double, byes) tied to competition config. Implemented: `lib/competitions/roundRobin.ts` (circle method, optional double round-robin, odd-team byes); `POST /api/admin/season-competitions/[seasonCompetitionId]/fixtures/generate` persists stubs to `league_fixtures` (scoped by `competitions.manage` + association resource access).
- [X] **E2** Venues, times, publish/unpublish to public site. Schema: `lib/db/schemas/leagueFixture.schema.ts` (`venueId`, `venueName`, `addressLine`, `scheduledStart`/`scheduledEnd`, `timezone`, `published`/`publishedAt`). Admin: `GET/PATCH` under `/api/admin/season-competitions/[seasonCompetitionId]/fixtures` (+ `PATCH .../fixtures/[fixtureId]`). Public: `GET /api/fixtures?seasonCompetitionId=` (middleware allowlist); returns only `published` fixtures when season competition status is published/in_progress/completed. Generate defaults in `fixtures/generate`.
- [X] **E3** Result entry: final score, forfeit, abandoned, shootout; role-gated approval if required. Schema: `league_fixtures.result` + `resultStatus` fields (`lib/db/schemas/leagueFixture.schema.ts`). Admin: `PATCH /api/admin/season-competitions/[seasonCompetitionId]/fixtures/[fixtureId]/result` (permission `results.manage`; approval gated by `results.approve` if `season_competitions.resultApprovalRequired === true`; audited with category `result`). Public: `GET /api/fixtures?seasonCompetitionId=` includes `result` only when approved (or when approval not required and match is completed).
- [X] **E4** Ladder rules: points, GD, head-to-head, tie-breakers; pool vs league tables. Config on `season_competitions.ladderRules` (`lib/db/schemas/competition.schema.ts`, editable via `PATCH /api/admin/season-competitions/[seasonCompetitionId]`). Standings compute from (approved) fixture results: public `GET /api/standings?seasonCompetitionId=` (middleware allowlisted) and admin preview `GET /api/admin/season-competitions/[seasonCompetitionId]/standings` (option `includeUnpublished=1`).
- [X] **E5** Team / club / association roll-ups: `lib/competitions/seasonStatsRollup.ts` (`computeSeasonCompetitionRollups`, `enrichRollupsFromRowMap`); public `GET /api/standings?includeRollups=1` and admin `GET .../standings?includeRollups=1` return `rollups: { teams, clubs, association }` (club totals sum teams; association summary = matches played, total goals, team/club counts). Shares one fixture pass with standings via `standingsBundle.ts`.
- [X] **E6** Player stats: `league_fixtures.matchEvents[]` (`FixtureMatchEventSchema` — field goal, **penalty stroke / shootout** outcomes, **gk_save**, cards; `assistMemberId` only on `goal`). **Roster validation** on PATCH via `lib/competitions/matchEventRoster.ts` (optional `skipRosterValidation`). **Admin UI:** `/admin/associations/[associationId]/match-events` + `GET .../fixtures/[fixtureId]/match-events-context`. **Career:** `GET /api/competitions/player-career?memberId=&owningAssociationId=`. Admin `PATCH .../match-events`; public `GET /api/competitions/player-stats`, `GET /api/fixtures`, `lib/data/matches.ts`. Aggregation: `playerSeasonStats.ts`, `playerCareerStats.ts`.
- [X] **E7** Result corrections: `lib/competitions/resultCorrection.ts` — changing **submitted** scores requires `correctionReason` (10–2000 chars); changing **approved** results requires `results.approve` + reason. Optional `replayOfFixtureId` on PATCH body for audit metadata. Audit `metadata`: `isCorrection`, `correctionReason`, `replayOfFixtureId`.
- [X] **E8** Standings read cache: `lib/competitions/standingsReadCache.ts` (in-process TTL 120s, keyed by season + published/approval/ladder/rollups variant); `invalidateStandingsBundleCache` on result PATCH, fixture PATCH, fixture generate, season competition PATCH. `lib/competitions/standingsBundle.ts` wires cache to public + admin standings.

---

## Epic F — Umpiring & officiating

- [X] **F1** Official register (baseline): Mongo `association_official_register`; `GET/POST .../official-register`, `PATCH/DELETE .../official-register/[recordId]` (`association.fees`); UI `/admin/associations/[associationId]/official-register`. Used to resolve `umpireId` → display name (plus member-id fallback in `lib/officiating/resolveUmpireDisplay.ts`). **Follow-up:** club/region fields, imports, validation against national register.
- [X] **F2** Availability and conflict-of-interest (club) flags. Implemented: `association_official_register` fields `primaryClubId`, `allocationAvailability` (`available` / `limited` / `unavailable`), `availabilityNote`, `unavailableUntil`; fixture umpire slots `coiOverride` + `coiOverrideReason` (min 15); `PATCH .../fixtures/[fixtureId]` returns **409** `UMPIRE_COI_OR_AVAILABILITY` when a slot conflicts unless override+reason; evaluation in `lib/officiating/umpireCoiAndAvailability.ts` (own club vs team `clubId`, immediate family on active roster from member `familyRelationships`, unavailable officials). Preview: `POST .../fixtures/[fixtureId]/umpire-assignment-check`. Audit: fixture patch `metadata.coiOverrides` when overrides used.
- [X] **F3** Allocation workflow (schema baseline): `league_fixtures.umpires[]` supports `allocationStatus` (`assigned` | `accepted` | `declined`), `dateDeclined`, `dateNotified` (`lib/db/schemas/leagueFixture.schema.ts`); set via existing fixture `PATCH`. **Follow-up:** notifications (email/push), umpire self-service endpoints, standby slots.
- [X] **F4** Umpire match honoraria (tiered): rate matrix + ledger + treasurer UI. Schedule: `association_umpire_payment_schedules`; lines: `umpire_match_payment_lines` (`pending` → `approved` → `paid`). APIs: `GET/PUT .../umpire-payment-schedule`; `GET/PATCH/DELETE .../umpire-payment-lines` (JSON includes `displayName`; `?format=csv` export; pending `amountCents` via PATCH); `POST .../umpire-payments/lines`; `GET .../umpire-payments/preview`; `GET .../associations/[id]/season-competitions`; fixtures list also allows `association.fees`. UI: `/admin/associations/[associationId]/umpire-payments`. Lib: `lib/officiating/umpireMatchPayment.ts`, `umpirePaymentLineStatus.ts`.
- [X] **F5** Reporting (baseline): `GET .../associations/[associationId]/officiating-report?seasonCompetitionId=` (`association.fees` or `competitions.manage`); fixture slot counts by allocation status, honoraria counts by status, top umpires by fixture coverage; UI `/admin/associations/[associationId]/officiating-report`. **Follow-up:** region/club breakdown, date range, CSV, charts.

---

## Epic G — Coaching & team staff

- [ ] **G1** Staff roles (head coach, assistant, manager, physio, etc.) linked to members where possible.
- [ ] **G2** Credential/WWCC tracking with expiry and compliance reporting.
- [ ] **G3** Public-safe display vs private contact details (especially juniors).

---

## Epic H — Fees, registration, membership

- [ ] **H1** Fee stack model: association + club + competition + tournament; rules for who collects and in what order.
- [ ] **H2** Registration flows: returning player, eligibility, transfer windows, insurance flags.
- [ ] **H3** Financial reporting: per club, per association, GST, exports, reconciliation.

---

## Epic I — Public site & UX

- [ ] **I1** Public hubs: association, club, competition (season), team.
- [ ] **I2** Fixtures & results; standings; stat leaders (as data exists).
- [ ] **I3** Stable URLs and basic SEO for entities above.
- [ ] **I4** Mobile-friendly fixture/result views.

---

## Epic J — Platform, integrations, ops

- [ ] **J1** Notifications: fixture change, allocation, payment due (email; SMS optional).
- [ ] **J2** Calendar export (iCal) for teams/competitions.
- [ ] **J3** Payment gateway consistency across products.
- [ ] **J4** Backups, monitoring, and member data export/delete (compliance).

---

## Epic K — Quality & delivery

- [X] **K1** Architecture diagram checked into repo (hierarchy + competitions + tournaments). See `docs/domain/ARCHITECTURE.md` (Mermaid: associations, clubs, teams, competitions, tournaments, public/admin/API).
- [X] **K2** Role matrix doc kept next to code and updated when roles change. See `docs/domain/ROLE_MATRIX.md` (source: `lib/types/roles.ts`).
- [X] **K3** API contract or integration tests for scoped routes (association vs club). Covered by Vitest on `evaluateAdminRouteAccess` (`__tests__/lib/auth/adminRouteAccess.test.ts`) — same rules as edge middleware for `/admin` + `/portal` prefixes.
- [ ] **K4** E2E smoke: login → create competition → fixture → result → ladder updates.
- [ ] **K5** Feature flags for risky competition/tournament features.

---

## Suggested phases (dependency order)

1. **Phase 1 — Foundation:** A (model clarity), B (RBAC + audit baseline), K2–K3.
2. **Phase 2 — League:** C, E1–E5, E7–E8.
3. **Phase 3 — Tournaments:** D (on top of stable teams/clubs).
4. **Phase 4 — People ops:** F, G.
5. **Phase 5 — Money:** H aligned with registrations.
6. **Phase 6 — Public & polish:** I, J, K4–K5.

---

*Last updated: generated for multi-level sport operations platform scope.*
