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
- [ ] **B5** Delegation / sub-permissions (e.g. fixtures without finance).
- [X] **B6** Audit log coverage for competitions, tournaments, results, ladder changes, fee rule changes (beyond member-only). Baseline: `lib/audit/platformAuditLog.ts` → Mongo `platform_audit_log` in `hockey-app`; wired to season competition PATCH, competition/season POST, fees POST, tournament PUT/DELETE, team lineage PATCH, fixture generation POST.

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

- [ ] **D1** `hostType: association | club`, `hostId`, plus branding parent association for permissions.
- [ ] **D2** Entry rules: who may enter, fees, withdrawal deadlines, max teams.
- [ ] **D3** Draw formats: pools, knockout, cross-pool finals; manual seeding + optional import from standings.
- [ ] **D4** Full lifecycle: create → entries → draw → fixtures → results → winner (align with existing team-tournament flows).
- [ ] **D5** Avoid duplicate team records; link tournament entries to canonical team/club entities.

---

## Epic E — Matches, results, ladders, statistics

- [X] **E1** Fixture generation (round-robin, double, byes) tied to competition config. Implemented: `lib/competitions/roundRobin.ts` (circle method, optional double round-robin, odd-team byes); `POST /api/admin/season-competitions/[seasonCompetitionId]/fixtures/generate` persists stubs to `league_fixtures` (scoped by `competitions.manage` + association resource access).
- [ ] **E2** Venues, times, publish/unpublish to public site.
- [ ] **E3** Result entry: final score, forfeit, abandoned, shootout; role-gated approval if required.
- [ ] **E4** Ladder rules: points, GD, head-to-head, tie-breakers; pool vs league tables.
- [ ] **E5** Team stats roll-up; club roll-up; association roll-up.
- [ ] **E6** Player stats (goals, cards, etc.) where captured; season career views.
- [ ] **E7** Validation + audit on corrections/replays.
- [ ] **E8** Caching or precomputation strategy for heavy read paths (standings, leaders).

---

## Epic F — Umpiring & officiating

- [ ] **F1** Official register: qualifications, levels, expiry.
- [ ] **F2** Availability and conflict-of-interest (club) flags.
- [ ] **F3** Allocation workflow: assign → notify → accept/decline → standby (extend current allocation work).
- [ ] **F4** Optional: honoraria/payments linked to fees or separate ledger.
- [ ] **F5** Reporting: appointments history, coverage by region/club.

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
