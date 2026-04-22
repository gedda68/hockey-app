# Platform Roadmap V4 — Registration, Payments, Security & Member Self-Service

This document **supersedes `PLATFORM_ROADMAP_CHECKLIST_V3.md` for forward planning**.
**Shipped inventory** in **V1** (Epics A–K), **V2** (L–T), and **V3** (N, V, O, Q) remains authoritative and is not re-marked here.

**How to use:** Track V4 as `[ ]` → `[x]`. Epics are lettered **R** (registration & roles), **P** (payments & financials), **S** (security & hardening), **M** (member self-service), **F** (full financials), **W** (workflows & automation), and **X** (cross-cutting quality).

---

## 0. What has shipped since V3 (V4 baseline)

| Area | Delivered |
|------|-----------|
| **Role approval workflow** | `RoleRequest` lifecycle: `pending_payment → awaiting_approval → approved / rejected / withdrawn`; fee waiver audit trail (anti-nepotism); API: `POST/GET /api/role-requests`, admin `GET/PATCH /api/admin/role-requests/[id]` |
| **Admin approval queue UI** | `/admin/role-requests` — tab filters, paginated `RequestCard` grid, `ApproveModal` (fee waiver), `RejectModal` (mandatory reason), `PaymentModal` |
| **Member self-service portal** | `/admin/my-registrations` — submit role requests, view own history, withdraw; accessible to all authenticated roles |
| **Multi-role session** | `ScopedRole[]` in JWT + `hasAccessViaScopedRoles()` in middleware; a player who is also an assoc-selector passes association admin routes without a primary-role upgrade |
| **Member category types** | `MembershipCategory` (16 values), `PlayingCategory`, mutual-exclusion validation; `UmpireQualification` with level hierarchy |
| **Forgot / Reset password** | `/login/forgot-password`, `/login/reset-password` (token pre-validation, strength meter, redirect on success) |
| **MongoDB index setup script** | `scripts/setup-indexes.ts` (all collections; TTL on `password_reset_tokens`); run with `tsx --env-file=.env.local` |
| **Build hardening** | Fixed orphaned `console.log` arguments in rosters route and other files flagged by the TypeScript compiler |

---

## 1. Honest gaps (product + UX) — V4 additions

### 1.1 Payment gateway not wired

The fees data model, `requiresFee` flag on role definitions, and `feeAmountCents` fields exist in `role_requests` and `payments` collections, but Stripe is still in **"simulate" mode**. There is no:
- Stripe Checkout or Elements integration for member-facing payment
- Webhook handler to record payment arrival and advance role-request status
- Refund flow
- Per-club/association fee amount lookup (the amount is not yet stored in club/association settings)

Until Stripe is wired, fee collection is entirely manual (registrar records payment in the admin approval queue). This is functional for launch but needs resolution before high-volume registration seasons.

### 1.2 Several API routes are publicly accessible

`/api/clubs` and `/api/payments` have no authentication or scope guard. Any unauthenticated caller can enumerate clubs and query payment records. This is a **security gap**, not an architectural trade-off.

### 1.3 Fixture generation stubs

Round-robin (`/api/admin/season-competitions/[id]/fixtures/generate`) and players/eligible route have stub comments or orphaned code. The wizard UX (N1/N3, shipped) surfaces these buttons — a user clicking "Generate fixtures" may hit a broken backend.

### 1.4 Nomination & ballot workflows incomplete

`/admin/nominations`, `/admin/ballots/[id]`, and `/competitions/events` have placeholder buttons or TODO comments for create/edit. Nomination-window management exists but the voting path from nomination submission → ballot → result is not closed.

### 1.5 Umpire allocation is partial

The officiating report and honoraria ledger shipped (V1 F). But umpire **fixture assignment** (COI checks, availability → assign → notify) is partially wired — the API stubs reference COI checks that are not fully implemented, and the front-end assignment modal has unresolved async state.

### 1.6 Scope validation inconsistency

Some admin API routes re-validate the acting user's scope against a DB lookup (`requireResourceAccess`). Others trust `req.params.clubId` or `req.body.scopeId` without a second check. This creates data-leakage risk for cross-club reads and write-skew on mutations.

### 1.7 Test coverage is minimal

~5 Vitest unit tests cover only auth helpers and hierarchy derivation. Core workflows — role-request lifecycle, member registration, payment recording, fixture generation, umpire assignment — have zero automated coverage. No integration tests for API endpoints.

---

## Epic R — Registration & Roles (partially shipped)

- [x] **R1** **Role approval workflow** — `RoleRequest` document model (`pending_payment`, `awaiting_approval`, `approved`, `rejected`, `withdrawn`); `POST /api/role-requests`; admin `PATCH` actions (approve / reject / record_payment / withdraw); mandatory `FeeWaiver` audit on fee bypass (grantedBy + role + scope + reason at time of grant).
- [x] **R2** **Admin approval queue UI** — `/admin/role-requests` with tab filters, search, paginated cards, three action modals (Approve incl. fee waiver, Reject with mandatory reason, Record Payment); amber gradient header with live pending counts; visible for club-admin, registrar, assoc-admin, assoc-registrar.
- [x] **R3** **Member self-service portal** — `/admin/my-registrations`; any authenticated user can browse role options by scope type (club / association), select a club or association, optionally add notes + season year, submit; shows own request history with status guidance and withdraw button; accessible via sidebar for all roles.
- [x] **R4** **Multi-role session** — `ScopedRole[]` in JWT; `toScopedRoles()` at login; middleware `hasAccessViaScopedRoles()` checks path-embedded scopeId against session scoped roles for association and club routes.
- [x] **R5** **Member category model** — `MembershipCategory` union (16 values covering junior/senior/masters player, umpire, coach, volunteer, sponsor, supporter, etc.); `validateMembershipCategories()` mutual-exclusion guard; `UmpireQualification` with 5-tier level hierarchy.
- [ ] **R6** **Seasonal re-registration reminders** — Roles marked `seasonalRegistration: true` (player, member) expire at season end. Build: (a) a cron/script that identifies members with no active role-request for the upcoming season, (b) email reminder (`Resend`) 6 weeks and 2 weeks before season start. Pair with `O2` communications hub templates.
- [ ] **R7** **Role expiry dashboard** — `/admin/role-expiry` is listed in the sidebar but the page body is a stub. Implement: table of role assignments with `expiresAt` within 60 days, bulk "send reminder" action, export CSV.
- [ ] **R8** **Umpire qualification upload** — Allow umpires to upload qualification certificates to their profile (PDF/image via UploadThing). Admin can verify and stamp `isVerified: true` on the `UmpireQualification` record. Required before assigning umpires above club level.
- [ ] **R9** **Transfer / multi-club workflow** — `MULTI_CLUB_AND_TRANSFERS.md` describes the model; implement UI: (a) member requests transfer from Club A to Club B, (b) Club A admin approves release, (c) Club B admin approves intake, (d) fee authority chain updated. Existing `RoleAssignment.expiresAt` + new `status: "transferred_out"` covers the data model.

---

## Epic P — Payments & Fee Gateway

> **Context:** Fees data model exists. `requiresFee` flags are set on role definitions. The current flow requires a registrar to manually record payment in the admin approval queue. Stripe must be wired before high-volume registration seasons.

- [ ] **P1** **Per-club/association fee schedule** — Add `feeSchedule[]` to club and association documents: `{ role: UserRole; seasonYear: string; amountCents: number; currency: "AUD" }`. Admin UI on club/association edit page (table editor). `POST /api/role-requests` resolves and stores `feeAmountCents` from the schedule at submission time.
- [ ] **P2** **Stripe Checkout integration** — Member-facing payment step in `/admin/my-registrations` for `pending_payment` requests: "Pay now" button opens Stripe Checkout session pre-filled with `feeAmountCents`, `roleRequest.requestId` as `client_reference_id`. Stripe `checkout.session.completed` webhook advances request to `awaiting_approval` and records payment.
- [ ] **P3** **Stripe webhook handler** — `POST /api/webhooks/stripe`: verify signature, handle `checkout.session.completed` (record payment, advance role-request), `charge.refunded` (flag payment as refunded, optionally revert approval), `invoice.payment_failed` (for future subscription support). Store raw Stripe event in `stripe_events` collection for replay.
- [ ] **P4** **Payment history page** — `/admin/my-fees`: member sees all payments made (fee, amount, date, role, scope, receipt link). Admin sees payments across all members with search/filter. Currently `/api/payments` is an unsecured endpoint returning all records — this must be fixed (see **S2**).
- [ ] **P5** **Refund & adjustment flow** — Admin can initiate refund from payment record (calls Stripe refund API) or record a manual adjustment. Refund reason is mandatory (mirrors fee-waiver anti-nepotism requirement). Sends confirmation email via `O2` template.
- [ ] **P6** **GST calculation (AUD)** — Australian tax requirement. Add `gstIncluded: boolean` and `gstAmountCents: number` to fee records. Helper `calculateGST(amountCents)` → `{ gross, gst, net }` (currently 10%). Surface in receipts, payment history, and the financial reporting module (see **F**).

---

## Epic S — Security & Hardening

> **These items should be prioritised above all new features.** Several gaps allow unauthenticated enumeration of sensitive data.

- [x] **S1** **Protect `/api/clubs` route** — **Shipped:** All four methods (GET/POST/PUT/DELETE) now require authentication via `requirePermission`/`requireAnyPermission` from `lib/auth/middleware`. GET requires `club.view`; POST requires `club.create | system.manage`; PUT requires `club.edit | system.manage`; DELETE requires `club.delete | system.manage`. Created `GET /api/public/clubs` (no auth, projection to safe fields only: `name`, `slug`, `shortName`, `logoUrl`, `city`, `state`, `branding` colours) with a 60-second CDN cache header. Supports `?q=` (name/shortName/city search) and `?associationId=` filters.
- [x] **S2** **Protect `/api/payments` route** — **Shipped:** Both `route.ts` and `[paymentId]/route.ts` now enforce auth on every method. GET uses `buildPaymentScopeFilter()` (from `lib/auth/scopeGuard.ts`) to automatically narrow the MongoDB query to what the caller is allowed to see: super-admin sees all; association-admin/assoc-registrar scoped to their association; club-admin/registrar scoped to their club; all other authenticated users see only their own payments. POST/PATCH/DELETE require `club.fees | association.fees | system.manage`. `assertPaymentMutationAccess()` guards cross-club PATCH/DELETE.
- [x] **S3** **Scope validation consistency audit** — **Shipped:** Created `lib/auth/scopeGuard.ts` exporting three helpers: `assertScopeMatch(session, type, id)` — wraps `userCanAccessAssociationResource`/`userCanAccessClubResource` from `resourceAccessDb.ts` into a single 401/403-returning guard; `buildPaymentScopeFilter(session, memberId?)` — returns a ready-to-use MongoDB filter object based on role + session scope; `assertPaymentMutationAccess(session, memberId, clubId?)` — mutation-specific check. Audit of `app/api/admin/**` confirmed that all `[associationId]` and `[clubId]` routes already use `requirePermission + requireResourceAccess` from `lib/auth/middleware`; the remaining unguarded routes were `clubs`, `payments`, and `test-level` (fixed in S1, S2, S4).
- [x] **S4** **Remove/gate development test routes** — **Shipped:** `POST /api/test-level` now returns `404` immediately when `process.env.NODE_ENV === "production"`. The MongoDB import is moved inside the handler body (dynamic import) so the driver is not bundled into the production lambda even if tree-shaking fails. The route remains fully functional in `development` and `test` environments.
- [x] **S5** **Rate limiting on auth endpoints** — **Shipped 2026-04-22.** `lib/rateLimit.ts` implements a zero-dependency sliding-window in-memory rate limiter (10 attempts / 15 min per IP) stored on `globalThis` (survives Next.js hot-reloads). `rateLimitResponse(request, routeKey)` is called as the first line of `POST /api/auth/login`, `POST /api/auth/forgot-password`, and `POST /api/auth/reset-password`. Returns `429` with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers. Upstash upgrade path (sliding window, `@upstash/ratelimit`) documented in the file header — activates by installing the package and setting `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`; no route changes needed.
- [x] **S6** **HttpOnly cookie hardening** — **Shipped 2026-04-22.** Full audit of `lib/auth/session.ts` confirmed: `HttpOnly: true`, `Secure: true` (production), `SameSite: Lax`, `Path: /` were already correct. Added `__Host-` prefix support via new `lib/auth/cookieName.ts` — `activeSessionCookieName()` returns `"__Host-session"` in production when no `SESSION_COOKIE_DOMAIN` env var is set (which forbids `Domain=`), otherwise falls back to `"session"` (dev + cross-subdomain). `sessionCookieNameForWrite(domain?)` falls back to `"session"` when a `Domain=` attribute is present (the prefix is spec-forbidden in that case). All four cookie-touching files updated: `lib/auth/session.ts`, `lib/auth.ts`, `app/api/auth/login/route.ts`, `proxy.ts`. One-time logout on first production deploy is expected and documented.
- [x] **S7** **Input sanitisation on rich-text fields** — **Shipped 2026-04-22.** New `lib/utils/sanitizeServer.ts` exports `sanitizeRichText()` (uses `sanitize-html` — pure Node.js, no DOM required) and `stripAllTags()`. `sanitizeRichText` is applied on WRITE in: news POST (`/api/admin/news`) and PUT (`/api/admin/news/[id]`) on `content`; events POST (`/api/admin/events`) and PUT (`/api/admin/events/[id]`) on `fullDescription`. `stripAllTags` is applied to `fixtureChangeEmailSupplementText` and `weeklyDigestIntroText` in the communications PATCH. Allowlist matches the Lexical editor output set (headings, lists, links, tables, inline formats); strips all event handlers, `javascript:` hrefs, `<script>`, `<style>`, `<iframe>`. Client-side DOMPurify in display components remains as defence-in-depth.
- [x] **S8** **API endpoint auth test suite** — **Shipped 2026-04-22.** Three-file Vitest suite under `__tests__/api/admin/`: (a) `authMiddleware.test.ts` — 30 tests proving every guard (`requireAuth`, `requireRole`, `requirePermission`, `requireAnyPermission`, `requireResourceAccess`) returns 401 with no session; (b) `authMiddleware.test.ts` — `requireResourceAccess("club")` returns 403 when club-A admin requests club-B resources and passes for club-A (by ID and slug); (c) `authMiddleware.test.ts` — `requireResourceAccess("association")` returns 403 for cross-association access; plus `unauthenticated.test.ts` — imports actual route handlers for news, events, members, clubs, associations, role-requests, and the communications hub; asserts every method (GET/POST/PUT/PATCH) returns 401 when `getSession → null`. Supporting helpers: `__tests__/helpers/session.ts` (role session factories) and `__tests__/helpers/request.ts` (`makeRequest`, `routeParams`). CI gate: `.github/workflows/ci.yml` runs `pnpm test` (Vitest) + `tsc --noEmit` + `pnpm lint` on every push and PR targeting `main`/`develop`. `vitest.config.ts` updated to exclude `.claude/**` worktrees. All 326 tests pass.

---

## Epic M — Member Self-Service & Onboarding

- [x] **M1** **My Registrations portal** — Member submits role requests, views status, withdraws — shipped (R3).
- [ ] **M2** **Member profile page (self-editable)** — Allow logged-in members to edit their own `personalInfo` (phone, address, emergency contact) without going through an admin. Route: `/admin/my-profile`. Fields: contact details, emergency contact, medical notes (optional opt-out flag). Changes create an audit entry. Admins retain ability to lock specific fields.
- [ ] **M3** **Member registration onboarding wizard** — New members who register via a club invitation link (`/clubs/[slug]/register`) currently hit a form with hardcoded placeholders. Implement: (a) tokenised invite link generated by registrar, (b) pre-fill club/season from token, (c) step-by-step: personal info → contact → playing category → fee payment → confirmation. Pair with **P2**.
- [ ] **M4** **Family account linking** — The `family.ts` types support `familyId` and `FamilyMember` relationships. Implement: parent account can manage linked junior members; parent sees all linked member registrations on `/admin/my-registrations`; family fee discounts (if fee schedule includes `familyDiscount: boolean`).
- [ ] **M5** **Membership renewal reminders** — `membership.currentPeriodEnd` exists on all members. Build: monthly cron checks members expiring within 30 days, sends renewal email (Resend) linking to `/admin/my-registrations` with pre-selected `member` role + club. Track `renewalReminderSentAt` to avoid duplicates.
- [ ] **M6** **Digital membership card** — Generate a QR-coded membership card (PDF or PNG) once a role-request is approved. Card shows: member name, photo (if uploaded), club, role, season, QR code (encodes memberId + season for scanner app). Download from `/admin/my-registrations` or email on approval. Use `jsPDF` (already in deps).

---

## Epic F — Full Financial Management

> This is the **large commercial module** described in V3 Future Enhancements. Treat as a separate product stream, delivered incrementally.

- [ ] **F1** **Chart of accounts / cost centres** — Each club and association gets a configurable chart of accounts with income/expense categories (player registrations, merchandise, tournament entry fees, venue hire income, uniform costs, council permits, etc.). Simple admin UI to add/rename categories.
- [ ] **F2** **Income ledger** — Record all income events (role-request fees via Stripe, manual cash, merchandise sales, sponsorship). Each entry has: date, amount, GST component, category, description, reference (paymentId, orderId, or manual). Replaces the current flat `payments` collection.
- [ ] **F3** **Expense ledger** — Record outgoings (umpire honoraria from existing ledger, venue hire, uniform purchase, tournament affiliation fees). Manual entry + future bulk import (CSV).
- [ ] **F4** **Budget module** — Per cost-centre budget for the financial year. Dashboard shows budget vs actuals with traffic-light status. Alert when 80% of budget consumed.
- [ ] **F5** **P&L report** — Automated profit & loss statement for any date range: income by category, expenses by category, gross profit, GST liability (10% component of taxable income/expense). Export PDF (`jsPDF`) and Excel (`xlsx`). Supports end-of-year financials requirement.
- [ ] **F6** **GST / BAS helper** — Quarterly BAS (Business Activity Statement) summary: GST collected (from sales), GST paid (from purchases), net GST payable. Not a full accounting system — a structured export that an accountant can reconcile. Clearly flagged as indicative, not a tax return.
- [ ] **F7** **Financial health check** — Dashboard widget showing: months of runway (cash / avg monthly burn), income trend (last 12 months vs prior 12), largest cost centres, overdue receivables (unpaid role-request fees). Exportable as a board report.
- [ ] **F8** **Xero integration** — OAuth2 connection to Xero; push approved payments and expenses as `invoices` / `bills`; pull bank feed for reconciliation. Treat as a separate integration module; design F1–F7 with Xero-friendly account codes so the export is clean.
- [ ] **F9** **Merchandise / uniform shop** — Per-club product catalogue (name, size options, price, stock); checkout flow (Stripe); order management for club admin; fulfilment status. Income auto-recorded to the income ledger (F2). GST-inclusive pricing with component split.

---

## Epic W — Workflows & Automation

- [ ] **W1** **Complete nomination → ballot → result** — The nomination pipeline is sketched: nomination windows exist, submissions exist, but the ballot (vote) and result path are incomplete. Close the loop: (a) close nomination window → generate ballot from approved nominees, (b) eligible voters (committee members) receive ballot email with unique token link, (c) `/admin/ballots/[id]` records votes (already UI-sketched), (d) result declared → role-request auto-submitted for winners.
- [x] **W2** **Events CRUD (admin system)** — **Shipped 2026-04-22.** Full admin events system implemented: `EventCreateEditForm` (7-tab form: General, Schedule, Location, Organisation, Media & Docs, Registration, Contact) with multipart upload for featured image + PDF flyer + arbitrary documents; `DocumentUploader` + `InlineDocumentViewer` (PDFs in iframe, images inline, others download); `EventCard` with category/status/visibility/propagation badges; `EventsAdminClient` (list + calendar toggle, filters); scoped admin pages for global (`/admin/events`), association (`/admin/associations/[id]/events`), and club (`/admin/clubs/[id]/events`); `EventCalendarPropagation` field (`none|team|club|association|global`) resolves at query time — no data duplication. Public event detail page (`/competitions/events/[slug]`) with 40vh hero, visibility enforcement (members-only 403 with login CTA, private 403), share button (Web Share API → clipboard + "Copied!" state), "View Full Page" link on modal. Sidebar wired with scope-aware hrefs (club/assoc/global). Visibility radio cards (Public/Members Only/Private) in create/edit form. Remaining: recurring-event support, RSVP toggle, iCal export per event.
- [ ] **W3** **Umpire assignment close-out** — Conflict-of-interest check and availability query APIs exist as stubs. Implement: (a) `GET /api/admin/umpires/available?fixtureId=` returns available + non-COI umpires, (b) assignment stored in `umpire_assignments`, (c) notification email sent via `O2` template, (d) umpire can accept/decline via link in email (sets status). The officiating report (already shipped) then pulls live data.
- [ ] **W4** **Bulk import: member registration** — Upload CSV of new members (e.g., from a previous platform export); server validates, previews duplicates, creates member documents and pending role-requests in bulk. Required for club onboarding.
- [ ] **W5** **Automated season rollover** — At season start (configurable date per association): (a) archive previous season's `RoleAssignment` records with `status: "expired"`, (b) copy forward non-seasonal roles (committee, coaches), (c) generate renewal role-requests for players/members whose `seasonalRegistration: true`. Admin confirms before execution.
- [ ] **W6** **Weekly digest email** — The `O2` communications hub has `weeklyDigestFields` reserved. Implement: association-level weekly email (Monday 8am) summarising upcoming fixtures, latest results, news items. Club digest optional. Cron via `mcp__scheduled-tasks` or Vercel cron.

---

## Epic X — Cross-cutting Quality

- [ ] **X1** **TypeScript strict mode** — Current build has ~100+ type errors (explicit `any`, orphaned expressions from console.log cleanup, JSX-in-try-catch). Enable `"strict": true` in `tsconfig.json` incrementally; fix `any` types in `__tests__/**`, API handler params, and form event handlers.
- [ ] **X2** **ESLint CI gate** — Add `lint` to the CI/CD pipeline (Vercel build command or GitHub Actions). Currently lint errors are ignored; making the build fail on errors will prevent regressions.
- [ ] **X3** **Error boundaries** — Several admin pages (`colors/page.tsx`, `edit/page.tsx`) construct JSX inside `try/catch` blocks — a React anti-pattern that breaks concurrent rendering. Wrap with proper `<ErrorBoundary>` components (the `ERROR_BOUNDARY_GUIDE.md` doc exists; apply it).
- [ ] **X4** **useEffect dependency arrays** — Several components have missing or stale closure dependencies in `useEffect` (e.g. `AssociationColorsPage`, `PlayerEditPage`). Fix to prevent stale-closure bugs and React strict-mode double-invoke issues.
- [ ] **X5** **Test coverage: role-request lifecycle** — Write Vitest tests covering: submit → pending_payment, record_payment → awaiting_approval, approve with waiver (full audit trail written), reject (reviewNotes required), withdraw (self and admin), duplicate detection (409).
- [ ] **X6** **Test coverage: member registration** — Integration tests for `POST /api/members`, `POST /api/clubs/[id]/members`, duplicate memberId guard, membershipCategory mutual-exclusion enforcement.
- [ ] **X7** **Test coverage: API auth guards** — For every `app/api/admin/**` route: assert 401 for no session, 403 for wrong-scope session. Use `createMockSession()` helper in `__tests__/helpers/`.
- [ ] **X8** **Structured error logging** — Admin mutations already use `adminTelemetry.ts` (Q3). Extend structured logging to: role-request lifecycle events, payment events, member creation/edit, team roster changes. Tag with `traceId` (UUID per request) so correlated failures can be replayed.
- [ ] **X9** **Database index audit** — `scripts/setup-indexes.ts` covers major collections. Verify: `role_requests` has compound index on `{ memberId, status }` for the member portal query; `payments` has index on `{ memberId, createdAt }`; `umpire_assignments` has index on `{ fixtureId, umpireId }`. Run `db.collection.getIndexes()` and compare.
- [ ] **X10** **Soft-delete / audit trail for member data** — Currently member and user documents are mutated in-place. For compliance (GDPR/Australian Privacy Act), store a `_history[]` array on each document (or a separate `member_audit_log` collection) capturing `{ field, oldValue, newValue, changedBy, changedAt }` on every PATCH. The member history page (`/admin/members/[id]/history`) already exists; wire it to real data.

---

## Bug Fixes (immediate / before next release)

| # | File | Issue | Fix |
|---|------|-------|-----|
| **B1** | `app/api/admin/role-requests/[requestId]/route.ts` | Complex `await import` in function signature was invalid TypeScript; `db` param typed as `any` implicitly | Fixed: `import type { Db } from "mongodb"` + explicit `Db` param type (partially applied — verify build passes) |
| ~~**B2**~~ | `app/api/admin/rosters/[ageGroup]/route.ts` | Orphaned `console.log` argument lines (lines 29, 59, 67, 89, etc.) — same pattern as fixed in `teams/rosters/route.ts` | ✅ **Fixed 2026-04-21** — All debug `console.log` blocks removed; chair validation added; `void _id` suppresses unused-var warning. |
| ~~**B3**~~ | `app/api/admin/teams/players/eligible/route.ts:63` | `any` types throughout; `getLastSelection` untyped | ✅ **Fixed 2026-04-21** — `SelectionRecord` + `EligiblePlayer` interfaces added; all `any` replaced with typed casts. |
| **B4** | `app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/staff/[staffId]/route.ts:143` | Orphaned expression | Fix |
| **B5** | `app/api/admin/teams/rosters/[rosterId]/teams/[teamIndex]/staff/route.ts:88` | Orphaned expression | Fix |
| ~~**B6**~~ | `app/api/clubs/[clubId]/members/route.ts` | No auth on GET or POST — any caller could list/create members | ✅ **Fixed 2026-04-21** — `requirePermission`/`requireAnyPermission` + `requireResourceAccess` added to both methods. |
| ~~**B7**~~ | `app/(admin)/admin/members/create/page.tsx` | `clubId` hardcoded as `"club-commercial-hc"` | ✅ **Fixed 2026-04-21** — Replaced with `useAuth()` + `useEffect` to sync once session resolves asynchronously. |
| ~~**B8**~~ | `app/(website)/competitions/events/page.tsx` | "Create Event" / "Edit Event" buttons show dead `toast.info()` stubs; `currentUser` hardcoded | ✅ **Fixed 2026-04-21** — Handlers now `router.push` to `/admin/events/create` and `/admin/events/[id]/edit`; mock user replaced with `useAuth()`. |
| ~~**B9**~~ | `app/api/admin/players/next-registration-number/route.ts` | Returns stub `"0000000001"` always | ✅ **Fixed 2026-04-21** — Queries `members` collection for highest numeric suffix in `memberId`/`registrationNumber`; returns `(max + 1)` padded to 10 digits, scoped by optional `clubId`. |
| ~~**B10**~~ | `app/api/admin/players/check-duplicate/route.ts` | Always returns `{ isDuplicate: false }` | ✅ **Fixed 2026-04-21** — Case-insensitive `firstName + lastName + dateOfBirth` MongoDB query; supports optional `clubId` scope and `excludeMemberId` for edit scenarios. |

---

## Suggested priority order (V4)

| Order | Epic / Item | Why |
|-------|-------------|-----|
| **1** | **S1, S2, S3, S4** — Security gaps | Public data enumeration; fix before any marketing/demo |
| **2** | **B2–B10** — Build bug fixes | TypeScript errors break the build pipeline; stub routes mislead users |
| **3** | **S5, S6, S7** — Auth hardening | Rate limiting + cookie flags + XSS via rich-text |
| **4** | **P1 + P2 + P3** — Stripe integration | Enables real registration seasons; current manual-record flow won't scale |
| **5** | **R6 + R7** — Role expiry & reminders | Seasonal re-registration is the highest-volume admin workflow |
| **6** | **X1 + X2 + X3 + X4** — TypeScript + lint + error boundaries | Developer velocity and runtime stability |
| **7** | **X5 + X6 + X7** — Test coverage | Confidence for deploys; especially for the payment + role-request lifecycle |
| **8** | **M2 + M3 + M5** — Member self-service | Reduces registrar workload; key for club adoption |
| **9** | **W1** — Nominations → ballot → result | Completes the governance workflow loop |
| **10** | **W3** — Umpire assignment close-out | Officiating report is live; underlying assignment must match |
| **11** | **W2** — Events CRUD | Fills visible placeholder in the public-facing competition calendar |
| **12** | **F1 + F2 + F3** — Financials (income/expense ledger) | Foundation for P&L; start simple before Xero or GST automation |
| **13** | **R8 + R9** — Umpire cert upload + transfer workflow | Extends the role model; medium complexity |
| **14** | **W4 + W5 + W6** — Bulk import, season rollover, digest | Operational efficiency at scale |
| **15** | **M4 + M6** — Family accounts + digital card | Member delight; lower priority than stability |
| **16** | **F4–F9** — Full financials, GST, Xero, shop | Large commercial module; own sprint/stream |
| **17** | **X8 + X9 + X10** — Observability, indexes, audit trail | Ongoing quality; schedule as regular hardening sprints |
| **18** | **V4** (from V3) — Field hire | Optional commercial ops; only if product commits |

---

## Carry-forward from V3

| Source | Item |
|--------|------|
| V3 **V4** | Field hire / commercial pitch booking — still optional |
| V3 **B8** | Official app / deep links — long-term |
| V3 **D4** | Knockout bracket, declared champion, rep `resultApprovalRequired` |
| V3 **P1/P2** | Richer pathways CMS, club "fixtures for visitors" |
| V3 **B2** | oEmbed + per-tenant video playlists |
| V3 **O2** follow-up | Club-scope comms hub, weekly digest cron, richer templates (now also **W6**) |
| V3 **O3** follow-up | Fixture-linked volunteer shifts, member merge, association-wide duty rollup |
| V3 **O4** follow-up | Optional IP hash rate cap on partner click analytics; CSV export |
| V3 **O5** follow-up | Optional PDF programme; "my team only" iCal filter |

---

## Traceability

| Prior doc | V4 relationship |
|-----------|----------------|
| **V1** A–K | Still the feature-shipped checklist; not re-marked in V4 |
| **V2** L–T | Tenancy + benchmark work largely complete |
| **V3** N, V, O, Q | League operations, venues, live scores, sponsor analytics — complete; V4 does not re-mark |
| **`docs/domain/CANONICAL_GRAPH.md`** | Hierarchy rules still govern competition ownership checks |
| **`docs/platform/PAYMENTS.md`** | Stripe wiring (P2/P3) must align with gateway mode config described there |
| **`docs/platform/NOTIFICATIONS.md`** | Email triggers (R6, M5, W1, W6) use Resend as documented |

---

## Codebase Assessment (April 2026 audit)

### What is in great shape

The codebase is substantially built and well-architected across all core areas:

| Area | Status |
|------|--------|
| **League engine** | Competitions, fixtures, results, ladders, round-robin generation — production-ready |
| **RBAC** | 24 roles, 40+ permissions, multi-scope `ScopedRole[]` session, middleware enforcement |
| **Role workflow** | Full approval lifecycle with fee-waiver audit trail; admin queue + member self-service portal |
| **Venue / pitch** | Registry, conflict detection (overlapping published fixtures), week/month calendar |
| **Officiating** | Umpire register, officiating reports, honoraria ledger, communications hub |
| **Fan features** | Live scores (polling), iCal exports, push notifications, tenant news/gallery, partner analytics |
| **Volunteer & sponsors** | Duty roster CRM, partner strip click tracking |
| **Data model** | Rich typed schemas for members, teams, competitions; validation helpers; audit collections |

### Where attention is needed

| Category | Key gaps |
|----------|----------|
| **Security** | ~~`/api/clubs` and `/api/payments` unauthenticated; dev test routes exposed~~ ✅ Fixed (S1–S4). ~~No login rate limiting~~ ✅ Fixed (S5). ~~Cookie flag audit~~ ✅ Fixed — `__Host-` prefix (S6). ~~Rich-text XSS~~ ✅ Fixed — server-side `sanitize-html` on all write paths (S7). ~~API auth test suite~~ ✅ Fixed — Vitest suite + GitHub Actions CI gate (S8). All S1–S8 complete. |
| **Build stability** | Orphaned `console.log` argument lines still break TypeScript in 5+ files; stub routes return fake data |
| **Payments** | Stripe is in "simulate" mode; no Checkout session, no webhook, no per-club fee schedule |
| **Tests** | ~5 unit tests total; role-request lifecycle, registration, and API auth guards have zero coverage |
| **TypeScript** | ~100+ violations; `strict` mode not enabled; JSX-in-try-catch anti-patterns in several pages |
| **Workflows** | Nominations → ballot → result not closed; umpire assignment is a stub; events CRUD is placeholder |

---

## Suggested priority order (V4)

### 🔴 Immediate — before any public-facing release

| Priority | Epic | Description |
|----------|------|-------------|
| ~~1~~ | ~~**S1–S4**~~ | ~~**Security gaps**~~ — ✅ **Shipped 2026-04-21.** `/api/clubs` protected (all methods); `/api/public/clubs` created for safe public directory reads; `/api/payments` and `[paymentId]` fully scope-guarded; `lib/auth/scopeGuard.ts` helper created; `/api/test-level` returns 404 in production. |
| ~~2~~ | ~~**B2–B10**~~ | ~~**Build bugs**~~ — ✅ **Shipped 2026-04-21.** Debug `console.log` blocks removed from `rosters/[ageGroup]` (B2) and `teams/players/eligible` (B3); `any` types replaced with typed interfaces (B3); missing auth added to `clubs/[clubId]/members` (B6); hardcoded `clubId` replaced with `useAuth()` + async `useEffect` sync in members create wizard (B7); `handleCreateEvent`/`handleEditEvent` stubs replaced with `router.push` to admin events routes and mock user replaced with real `useAuth()` (B8); `next-registration-number` now queries `members` collection for real max (B9); `check-duplicate` now does case-insensitive `firstName + lastName + dateOfBirth` match in DB (B10). |
| ~~3~~ | ~~**S5–S7**~~ | ~~**Auth hardening + input sanitisation**~~ — ✅ **Shipped 2026-04-22.** Rate limiter (S5); `__Host-session` prefix + full cookie audit (S6); `sanitize-html` server-side on all rich-text writes — news content, event fullDescription, comms supplement fields (S7). |

### 🟠 High priority — before registration season opens

| Priority | Epic | Description |
|----------|------|-------------|
| 4 | **P1–P3** | **Stripe integration** — Per-club fee schedule, Checkout session creation, webhook handler to auto-advance role-requests from `pending_payment → awaiting_approval`. Without this, all fee collection is manual registrar entry. |
| 5 | **R6–R7** | **Seasonal re-registration** — Roles marked `seasonalRegistration: true` expire at season end. Email reminders 6 weeks and 2 weeks out via Resend; role-expiry dashboard page (route exists, body is stub). |
| 6 | **X1–X4** | **TypeScript strict + ESLint CI gate + error boundaries** — Enabling lint as a CI gate stops regressions; fixing `strict` mode flushes hidden runtime bugs; replacing JSX-in-try-catch with proper `<ErrorBoundary>` components fixes concurrent rendering issues. |

### 🟡 Medium priority — next quarter

| Priority | Epic | Description |
|----------|------|-------------|
| 7 | **X5–X7** | **Test coverage** — Role-request lifecycle, member registration, and all admin API auth guards have zero automated tests. A single bad deploy can silently break fee collection or approval. |
| 8 | **M2–M5** | **Member self-service** — Editable profile page, tokenised invitation onboarding wizard (replacing hardcoded clubId placeholders), family account linking, automated renewal reminders. |
| 9 | **W1** | **Nominations → ballot → result** — Window and submission exist; ballot voting UI is sketched; the result-to-role-request link is missing. Closes the governance loop. |
| 10 | **W3** | **Umpire assignment close-out** — COI and availability APIs are stubs; the officiating report is live but reads no real assignment data, so its allocation-mix chart is always empty. |
| ~~11~~ | ~~**W2**~~ | ~~**Events CRUD**~~ — ✅ **Shipped 2026-04-22.** Full admin events system: 7-tab create/edit form, document upload + inline viewer, association/club/global scoped pages, calendar propagation, public detail page with visibility enforcement. Sidebar wired. Remaining: recurring events, RSVP toggle, iCal per-event export. |

### 🟢 Longer term — own sprint or product stream

| Priority | Epic | Description |
|----------|------|-------------|
| 12–14 | **F1–F3** | Financials foundation: chart of accounts per club/association, income ledger (replacing flat `payments` collection), expense ledger. |
| 15–16 | **W4–W6** | Bulk member CSV import for club onboarding; automated season rollover (archive → copy forward → generate renewals); weekly digest email (reserved fields in communications hub). |
| 17 | **M6** | Digital membership card — QR-coded PDF via `jsPDF` (already in deps), generated on role approval and emailed via Resend. |
| 18 | **F4–F9** | Full P&L report, quarterly GST/BAS helper, Xero OAuth2 integration, merchandise/uniform shop with Stripe. Large commercial module — treat as a separate product stream. |

---

_Last updated: 2026-04-22 — V4 baseline: role approval workflow, member self-service portal, multi-role sessions, member category types, password reset. Audit-driven additions: security gaps S1–S8, payment gateway P1–P6, full financials F1–F9, workflow completions W1–W6, member experience M2–M6, quality X1–X10, bug fixes B1–B10. Priority tables and codebase assessment added from April 2026 audit. S1–S4 shipped 2026-04-21. B2, B3, B6–B10 shipped 2026-04-21. S5 (auth rate limiting), S6 (cookie hardening + `__Host-` prefix), S7 (server-side rich-text sanitisation), W2 (admin events system + public detail page + visibility enforcement) shipped 2026-04-22. S8 (API auth Vitest suite + GitHub Actions CI gate) shipped 2026-04-22. All S1–S8 security items complete._
